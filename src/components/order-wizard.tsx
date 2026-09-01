import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Layers,
  Palette,
  Plus,
  Ruler,
  Shirt,
  Stamp,
  Trash2,
  UserRound,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createOrder, getCatalog, getStockOutlook, listCustomers, listMaterials } from "@/lib/karisma/api";
import {
  CATEGORY_LABEL,
  PLACE_LABEL,
  TECHNIQUE_LABEL,
  colorSwatchClass,
  isUsableColor,
  normalizeColor,
  printsForPiece,
  resolvedPlace,
  resolvedTechnique,
  sizesForPiece,
  describeCustomization,
  type Place,
  type PrintSpec,
  type Technique,
} from "@/lib/karisma/catalog";
import { RECEIPT_MAX_BYTES } from "@/lib/karisma/pickup";
import { formatQty, todayISO } from "@/lib/karisma/format";
import { isSchoolPiece } from "@/lib/karisma/demand";
import { expandSizeRows, orderItemsSummary, totalPieces } from "@/lib/karisma/order-items";
import { OrderSpec } from "@/components/order-spec";
import { DemandHint } from "@/components/school-outlook";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { OrderItem } from "@/lib/karisma/types";

const STEPS = [
  { id: "cliente", label: "Cliente", icon: UserRound },
  { id: "peca", label: "Peça", icon: Shirt },
  { id: "medida", label: "Tamanhos", icon: Ruler },
  { id: "cor", label: "Cor", icon: Palette },
  { id: "material", label: "Material", icon: Layers },
  { id: "estampa", label: "Estampa", icon: Stamp },
  { id: "prazo", label: "Prazo", icon: Calendar },
  { id: "conferir", label: "Conferir", icon: ClipboardCheck },
] as const;

type SizeLine = { size: string; quantity: string };

type CartItem = {
  piece: string;
  sizes: { size: string; quantity: number }[];
  color: string;
  materialId: number;
  materialName: string;
  printName: string;
  technique: string;
  printPlace: string;
  personalization: string;
  artworkName: string;
  artworkMime: string;
  artworkData: string;
};

type Draft = {
  customerId: string;
  piece: string;
  sizes: SizeLine[];
  color: string;
  materialId: string;
  printId: string;
  technique: string;
  printPlace: string;
  personalization: string;
  dueDate: string;
  notes: string;
  artworkName: string;
  artworkMime: string;
  artworkData: string;
};

const EMPTY: Draft = {
  customerId: "",
  piece: "",
  sizes: [],
  color: "",
  materialId: "",
  printId: "",
  technique: "",
  printPlace: "",
  personalization: "",
  dueDate: "",
  notes: "",
  artworkName: "",
  artworkMime: "",
  artworkData: "",
};

function parsedSizes(lines: SizeLine[]): { size: string; quantity: number }[] {
  return lines
    .map((l) => ({ size: l.size, quantity: Number(l.quantity) }))
    .filter((l) => l.size && Number.isInteger(l.quantity) && l.quantity >= 1);
}

export function OrderWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: () => listCustomers(),
  });
  const catalog = useQuery({
    queryKey: ["catalog"],
    queryFn: () => getCatalog(),
  });
  const materials = useQuery({
    queryKey: ["materials"],
    queryFn: () => listMaterials(),
  });

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmPiece, setConfirmPiece] = useState(false);
  const [confirmColor, setConfirmColor] = useState(false);
  const [confirmPrint, setConfirmPrint] = useState(false);
  const [otherColor, setOtherColor] = useState("");
  const [useOtherColor, setUseOtherColor] = useState(false);
  const [otherHex, setOtherHex] = useState("");

  const pieces = catalog.data?.pieces ?? [];
  const prints = catalog.data?.prints ?? [];
  const piece = pieces.find((p) => p.name === draft.piece);
  const print = prints.find((p) => p.id === draft.printId);
  const currentSizes = parsedSizes(draft.sizes);
  const currentQty = totalPieces(currentSizes);

  const compatibleMaterials = useMemo(() => {
    const all = materials.data ?? [];
    if (!piece) return [];
    return all.filter((m) => m.active && piece.materials.includes(m.name));
  }, [materials.data, piece]);

  const selectedMaterial = compatibleMaterials.find(
    (m) => String(m.id) === draft.materialId,
  );
  const selectedCustomer = (customers.data ?? []).find(
    (c) => String(c.id) === draft.customerId,
  );

  const patch = (partial: Partial<Draft>) =>
    setDraft((d) => ({ ...d, ...partial }));

  function choosePiece(name: string) {
    setDraft((d) => ({
      ...EMPTY,
      customerId: d.customerId,
      dueDate: d.dueDate,
      notes: d.notes,
      piece: name,
    }));
    setConfirmPiece(false);
    setConfirmColor(false);
    setConfirmPrint(false);
    setOtherColor("");
    setUseOtherColor(false);
    setOtherHex("");
  }

  function choosePrint(spec: PrintSpec) {
    patch({
      printId: spec.id,
      technique: spec.technique === "escolher" ? "" : spec.technique,
      printPlace: spec.place === "escolher" ? "" : spec.place,
      personalization: spec.needsText ? draft.personalization : "",
      artworkName: spec.id === "sem-estampa" ? "" : draft.artworkName,
      artworkMime: spec.id === "sem-estampa" ? "" : draft.artworkMime,
      artworkData: spec.id === "sem-estampa" ? "" : draft.artworkData,
    });
    setConfirmPrint(false);
  }

  function toggleSize(size: string) {
    setDraft((d) => {
      if (d.sizes.some((l) => l.size === size)) {
        return { ...d, sizes: d.sizes.filter((l) => l.size !== size) };
      }
      return { ...d, sizes: [...d.sizes, { size, quantity: "1" }] };
    });
  }

  function setSizeQty(size: string, quantity: string) {
    setDraft((d) => ({
      ...d,
      sizes: d.sizes.map((l) => (l.size === size ? { ...l, quantity } : l)),
    }));
  }

  const itemError = ((): string | null => {
    if (!piece) return "Escolha a peça no catálogo.";
    if (currentSizes.length === 0) return "Marque ao menos um tamanho e a quantidade.";
    if (!draft.color) return "Marque a cor da peça.";
    if (!selectedMaterial) return "Escolha o tecido desta peça.";
    if (!print) return "Escolha a estampa.";
    const tech = resolvedTechnique(print, draft.technique);
    const place = resolvedPlace(print, draft.printPlace);
    if (print.technique === "escolher" && (!draft.technique || tech === "nenhuma")) {
      return "Em “Outro”, escolha a técnica.";
    }
    if (print.place === "escolher" && (!draft.printPlace || place === "nenhum")) {
      return "Em “Outro”, marque o local.";
    }
    if (print.needsText && draft.personalization.trim().length < 2) {
      return `Preencha “${print.textLabel}”.`;
    }
    return null;
  })();

  const stepError = ((): string | null => {
    switch (step) {
      case 0:
        return draft.customerId ? null : "Selecione o cliente do pedido.";
      case 1:
        if (cart.length > 0 && !draft.piece) return null;
        return piece ? null : "Escolha a peça no catálogo.";
      case 2:
        if (!piece) return "Escolha a peça antes.";
        if (currentSizes.length === 0) return "Toque nos tamanhos e informe a quantidade de cada um.";
        return null;
      case 3:
        if (useOtherColor && !isUsableColor(draft.color)) {
          return "Escreva o nome da cor.";
        }
        return draft.color ? null : "Marque a cor da peça.";
      case 4:
        return selectedMaterial ? null : "Escolha o tecido desta peça.";
      case 5: {
        if (!piece || !print) return "Escolha a estampa.";
        const tech = resolvedTechnique(print, draft.technique);
        const place = resolvedPlace(print, draft.printPlace);
        if (print.technique === "escolher" && (!draft.technique || tech === "nenhuma")) {
          return "Em “Outro”, escolha a técnica.";
        }
        if (print.place === "escolher" && (!draft.printPlace || place === "nenhum")) {
          return "Em “Outro”, marque o local.";
        }
        if (print.needsText && draft.personalization.trim().length < 2) {
          return `Preencha “${print.textLabel}”.`;
        }
        return null;
      }
      case 6:
        if (!draft.dueDate) return "Informe o prazo de entrega.";
        if (draft.dueDate < todayISO()) return "O prazo não pode ser no passado.";
        return null;
      case 7:
        if (collectCart().length === 0) return "Inclua ao menos uma peça.";
        if (!confirmPiece || !confirmColor || !confirmPrint) {
          return "Confira os três pontos antes de lançar.";
        }
        return null;
      default:
        return null;
    }
  })();

  function toCartItem(): CartItem | null {
    if (!piece || !print || !selectedMaterial || currentSizes.length === 0) return null;
    if (itemError) return null;
    return {
      piece: piece.name,
      sizes: currentSizes,
      color: draft.color,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      printName: print.name,
      technique: resolvedTechnique(print, draft.technique),
      printPlace: resolvedPlace(print, draft.printPlace),
      personalization: print.needsText ? draft.personalization.trim() : "",
      artworkName: draft.artworkName,
      artworkMime: draft.artworkMime,
      artworkData: draft.artworkData,
    };
  }

  function collectCart(): CartItem[] {
    const current = toCartItem();
    return current ? [...cart, current] : cart;
  }

  function flatten(items: CartItem[]) {
    return items.flatMap((item) =>
      expandSizeRows({
        piece: item.piece,
        color: item.color,
        materialId: item.materialId,
        materialName: item.materialName,
        printName: item.printName,
        technique: item.technique,
        printPlace: item.printPlace,
        personalization: item.personalization,
        artworkName: item.artworkName,
        artworkMime: item.artworkMime,
        artworkData: item.artworkData,
        sizes: item.sizes,
      }),
    );
  }

  function asOrderItems(items: CartItem[]): OrderItem[] {
    return flatten(items).map((line, i) => ({
      id: i + 1,
      piece: line.piece,
      size: line.size,
      color: line.color,
      materialId: line.materialId,
      materialName: line.materialName,
      materialUnit: "",
      quantity: line.quantity,
      personalization: line.personalization,
      printName: line.printName,
      technique: line.technique,
      printPlace: line.printPlace,
      artworkName: line.artworkName,
      hasArtwork: Boolean(line.artworkData),
    }));
  }

  function addAnotherPiece() {
    const item = toCartItem();
    if (!item) {
      toast.error(itemError ?? "Termine esta peça antes de incluir outra.");
      return;
    }
    setCart((c) => [...c, item]);
    setDraft((d) => ({
      ...EMPTY,
      customerId: d.customerId,
      dueDate: d.dueDate,
      notes: d.notes,
    }));
    setConfirmPiece(false);
    setConfirmColor(false);
    setConfirmPrint(false);
    setOtherColor("");
    setUseOtherColor(false);
    setOtherHex("");
    setStep(1);
    toast.success(
      `${item.sizes.map((s) => `${s.quantity}× ${item.piece} ${s.size}`).join(", ")} no pedido. Agora a próxima peça.`,
    );
  }

  function removeCartItem(index: number) {
    setCart((c) => c.filter((_, i) => i !== index));
  }

  const extras = flatten(collectCart()).map((line) => ({
    piece: line.piece,
    size: line.size,
    quantity: line.quantity,
    materialName: line.materialName,
  }));

  const outlook = useQuery({
    queryKey: ["stock-outlook", extras],
    queryFn: () => getStockOutlook({ data: { extras } }),
  });

  const save = useMutation({
    mutationFn: () => {
      const items = flatten(collectCart());
      if (!items.length || !selectedCustomer) {
        throw new Error("Pedido incompleto.");
      }
      return createOrder({
        data: {
          customerId: Number(draft.customerId),
          dueDate: draft.dueDate,
          notes: draft.notes.trim(),
          items: items.map((line) => ({
            piece: line.piece,
            size: line.size,
            color: line.color,
            materialId: line.materialId,
            quantity: line.quantity,
            printName: line.printName,
            technique: line.technique,
            printPlace: line.printPlace,
            personalization: line.personalization,
            artworkName: line.artworkName || undefined,
            artworkMime: line.artworkMime || undefined,
            artworkData: line.artworkData || undefined,
          })),
        },
      });
    },
    onSuccess: async (order) => {
      const n = order.items?.length ?? 1;
      toast.success(
        n > 1
          ? `Pedido nº ${order.id} lançado com ${n} itens. A produção já vê a ficha.`
          : `Pedido nº ${order.id} lançado. A produção já vê a ficha.`,
      );
      await qc.invalidateQueries({ queryKey: ["orders"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      await qc.invalidateQueries({ queryKey: ["stock-outlook"] });
      navigate({ to: "/pedidos" });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível lançar."),
  });

  const Icon = STEPS[step]!.icon;
  const canNext = stepError === null;
  const isLast = step === STEPS.length - 1;
  const allItems = collectCart();
  const allLines = flatten(allItems);
  const schoolExtra = allLines
    .filter((l) => isSchoolPiece(l.piece, pieces))
    .reduce((n, l) => n + l.quantity, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <ol className="hidden lg:col-span-1 lg:flex flex-col gap-1" aria-label="Etapas do pedido">
        {STEPS.map((item, i) => {
          const StepIcon = item.icon;
          const done = i < step;
          const current = i === step;
          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm",
                  current && "bg-navy text-paper",
                  done && "text-navy hover:bg-navy/10",
                  !done && !current && "text-muted",
                )}
                aria-current={current ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-semibold",
                    current && "bg-lime text-ink",
                    done && "bg-lime/30 text-navy",
                    !done && !current && "bg-mist",
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </span>
                <StepIcon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="p-5 sm:p-6 lg:col-span-3">
        <div className="mb-4 flex items-center gap-3 lg:hidden">
          {STEPS.map((item, i) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= step ? "bg-lime" : "bg-line",
              )}
            />
          ))}
        </div>

        {cart.length > 0 ? (
          <div className="mb-5 rounded-md border border-navy/20 bg-mist p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy">
              Já no pedido · {totalPieces(allLines)} peças
            </p>
            <ul className="space-y-2">
              {cart.map((item, index) => (
                <li key={`${item.piece}-${index}`} className="flex items-start justify-between gap-2">
                  <span className="text-sm text-ink">
                    <span className="font-medium">{item.piece}</span>
                    {" · "}
                    {item.sizes.map((s) => `${s.quantity}× ${s.size}`).join(", ")}
                    {" · "}
                    {item.color}
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-9 min-w-9 items-center justify-center text-navy hover:text-danger"
                    aria-label={`Remover ${item.piece}`}
                    onClick={() => removeCartItem(index)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
          <Icon className="size-4" aria-hidden />
          Etapa {step + 1} de {STEPS.length}
        </p>
        <h2 className="font-display text-xl text-navy">{STEPS[step]!.label}</h2>
        <p className="mb-5 mt-1 text-sm text-muted">
          {stepCopy[step]}
        </p>

        {step === 0 ? (
          <div>
            <Label htmlFor="p-cliente">Cliente</Label>
            <Select
              id="p-cliente"
              required
              value={draft.customerId}
              onChange={(e) => patch({ customerId: e.target.value })}
            >
              <option value="">Selecione…</option>
              {(customers.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-sm text-muted">
              Cliente novo?{" "}
              <Link to="/clientes" className="font-semibold text-navy underline">
                Cadastre antes
              </Link>
              .
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          catalog.isPending ? (
            <p className="text-sm text-muted">Carregando peças do catálogo…</p>
          ) : pieces.length === 0 ? (
            <p className="text-sm text-danger">
              Nenhuma peça no menu. Peça à administração para montar o catálogo.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {pieces.map((p) => (
                <ChoiceCard
                  key={p.name}
                  selected={draft.piece === p.name}
                  title={p.name}
                  hint={CATEGORY_LABEL[p.category] ?? p.category}
                  image={p.image}
                  onSelect={() => choosePiece(p.name)}
                />
              ))}
            </div>
          )
        ) : null}

        {step === 2 && piece ? (
          <div className="grid gap-5">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Toque para incluir o tamanho</legend>
              <div className="flex flex-wrap gap-2">
                {sizesForPiece(piece).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={draft.sizes.some((l) => l.size === s)}
                    onClick={() => toggleSize(s)}
                    className={cn(
                      "min-h-11 min-w-11 rounded-sm border-2 px-3 text-sm font-semibold",
                      draft.sizes.some((l) => l.size === s)
                        ? "border-lime bg-lime/20 text-navy"
                        : "border-line bg-paper text-ink hover:border-navy/40",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                {piece.sizeSet === "adulto"
                  ? "Somente tamanhos adultos nesta peça. Polo M e Polo G entram no mesmo pedido."
                  : piece.sizeSet === "infantil"
                    ? "Somente numeração infantil."
                    : "Adulto (letras) e infantil (números)."}
              </p>
            </fieldset>
            {draft.sizes.length > 0 ? (
              <div className="grid gap-3">
                <p className="text-sm font-medium">Quantidade de cada tamanho</p>
                {draft.sizes.map((line) => (
                  <div key={line.size} className="flex items-center gap-3">
                    <span className="w-10 font-display text-navy">{line.size}</span>
                    <Input
                      aria-label={`Quantidade tamanho ${line.size}`}
                      type="number"
                      min={1}
                      inputMode="numeric"
                      className="max-w-28"
                      value={line.quantity}
                      onChange={(e) => setSizeQty(line.size, e.target.value)}
                    />
                    <span className="text-sm text-muted">peças</span>
                  </div>
                ))}
                <p className="text-sm text-muted">
                  Total desta peça: {currentQty || "—"}
                </p>
              </div>
            ) : null}
            {isSchoolPiece(piece.name, pieces) && currentQty >= 1 ? (
              <DemandHint
                outlook={outlook.data}
                extraPieces={schoolExtra || currentQty}
                extraMaterial={selectedMaterial?.name}
              />
            ) : null}
          </div>
        ) : null}

        {step === 3 && piece ? (
          <fieldset>
            <legend className="sr-only">Cor da peça</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {piece.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={draft.color === c}
                  onClick={() => {
                    patch({ color: c });
                    setOtherColor("");
                    setUseOtherColor(false);
                    setConfirmColor(false);
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md border-2 px-3 py-2 text-left text-sm font-medium",
                    draft.color === c && !useOtherColor
                      ? "border-lime bg-lime/15 text-navy"
                      : "border-line bg-paper hover:border-navy/40",
                  )}
                >
                  <span
                    className={cn("size-7 shrink-0 rounded-full border border-line", colorSwatchClass(c))}
                    aria-hidden
                  />
                  {c}
                  {draft.color === c && !useOtherColor ? (
                    <Check className="ml-auto size-4" aria-hidden />
                  ) : null}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={useOtherColor}
                onClick={() => {
                  setUseOtherColor(true);
                  setConfirmColor(false);
                  if (piece.colors.includes(draft.color)) {
                    patch({ color: "" });
                    setOtherColor("");
                  }
                }}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md border-2 px-3 py-2 text-left text-sm font-medium",
                  useOtherColor
                    ? "border-lime bg-lime/15 text-navy"
                    : "border-line bg-paper hover:border-navy/40",
                )}
              >
                <span
                  className={cn(
                    "size-7 shrink-0 rounded-full border border-line",
                    !otherHex && colorSwatchClass("outra"),
                  )}
                  style={otherHex ? { background: otherHex } : undefined}
                  aria-hidden
                />
                Outra
                {useOtherColor ? <Check className="ml-auto size-4" aria-hidden /> : null}
              </button>
            </div>
            {useOtherColor ? (
              <div className="mt-3 flex items-end gap-2">
                <label className="grid shrink-0 place-items-center">
                  <span className="sr-only">Tom aproximado</span>
                  <input
                    type="color"
                    value={otherHex || "#005a8d"}
                    onChange={(e) => setOtherHex(e.target.value)}
                    className="h-11 w-11 cursor-pointer rounded-sm border border-line bg-paper p-0.5"
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="p-outra-cor">Nome da cor</Label>
                  <Input
                    id="p-outra-cor"
                    value={otherColor || (piece.colors.includes(draft.color) ? "" : draft.color)}
                    placeholder="Azul petróleo"
                    autoFocus
                    onChange={(e) => {
                      const raw = e.target.value;
                      setOtherColor(raw);
                      const next = normalizeColor(raw);
                      const match = piece.colors.find((c) => c.toLowerCase() === next.toLowerCase());
                      if (match) {
                        patch({ color: match });
                        setUseOtherColor(false);
                        setOtherColor("");
                        return;
                      }
                      patch({ color: isUsableColor(next) ? next : "" });
                    }}
                  />
                </div>
              </div>
            ) : null}
          </fieldset>
        ) : null}

        {step === 4 && piece ? (
          <div className="grid gap-3">
            {compatibleMaterials.length === 0 && !materials.isPending ? (
              <p className="text-sm text-danger">
                Nenhum tecido desta peça está no estoque. Avise a administração.
              </p>
            ) : (
              compatibleMaterials.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={draft.materialId === String(m.id)}
                  onClick={() => patch({ materialId: String(m.id) })}
                  className={cn(
                    "flex min-h-11 items-start justify-between gap-3 rounded-md border-2 p-4 text-left",
                    draft.materialId === String(m.id)
                      ? "border-lime bg-lime/15"
                      : "border-line bg-paper hover:border-navy/40",
                  )}
                >
                  <span>
                    <span className="block font-semibold text-navy">{m.name}</span>
                    <span className="text-sm text-muted">
                      {formatQty(m.quantity, m.unit)} em estoque
                      {m.belowMin ? " · abaixo do mínimo" : ""}
                    </span>
                  </span>
                  {draft.materialId === String(m.id) ? (
                    <Check className="size-5 text-navy" aria-hidden />
                  ) : null}
                </button>
              ))
            )}
            <p className="text-xs text-muted">
              Avulsos (botão, linha, zíper) não entram aqui — só o tecido da peça.
            </p>
            {isSchoolPiece(piece.name, pieces) && currentQty >= 1 ? (
              <DemandHint
                outlook={outlook.data}
                extraPieces={schoolExtra || currentQty}
                extraMaterial={selectedMaterial?.name}
              />
            ) : null}
          </div>
        ) : null}

        {step === 5 && piece ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {printsForPiece(piece, prints).map((p) => (
                <ChoiceCard
                  key={p.id}
                  selected={draft.printId === p.id}
                  title={p.name}
                  hint={p.hint}
                  onSelect={() => choosePrint(p)}
                />
              ))}
            </div>
            {print ? (
              <div className="rounded-md border border-line bg-mist p-4">
                <p className="text-sm font-medium text-navy">
                  {print.technique === "escolher"
                    ? "Escolha a técnica"
                    : `Técnica: ${TECHNIQUE_LABEL[print.technique]}`}
                  {" · "}
                  {print.place === "escolher"
                    ? "escolha o local"
                    : `local: ${PLACE_LABEL[print.place]}`}
                </p>
                {print.technique === "escolher" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(piece.techniques.filter((t) => t !== "nenhuma") as Technique[]).map(
                      (t) => (
                        <Chip
                          key={t}
                          selected={draft.technique === t}
                          onSelect={() => patch({ technique: t })}
                        >
                          {TECHNIQUE_LABEL[t]}
                        </Chip>
                      ),
                    )}
                  </div>
                ) : null}
                {print.place === "escolher" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(PLACE_LABEL) as Place[])
                      .filter((p) => p !== "nenhum")
                      .map((p) => (
                        <Chip
                          key={p}
                          selected={draft.printPlace === p}
                          onSelect={() => patch({ printPlace: p })}
                        >
                          {PLACE_LABEL[p]}
                        </Chip>
                      ))}
                  </div>
                ) : null}
                {print.needsText ? (
                  <div className="mt-3">
                    <Label htmlFor="p-pers">{print.textLabel}</Label>
                    <Input
                      id="p-pers"
                      value={draft.personalization}
                      placeholder={print.textPlaceholder}
                      onChange={(e) => patch({ personalization: e.target.value })}
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted">Nenhum texto nesta peça.</p>
                )}
                {print.id !== "sem-estampa" ? (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium">Logo / arte para a produção</p>
                    <label
                      htmlFor="p-art"
                      className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-navy/30 bg-paper px-4 py-5 text-center hover:border-navy"
                    >
                      <ImagePlus className="size-6 text-navy" aria-hidden />
                      <span className="text-sm font-semibold text-navy">
                        {draft.artworkName ? "Trocar arquivo" : "Anexar logo ou arte"}
                      </span>
                      <span className="text-xs text-muted">
                        JPG, PNG ou WebP até 800 KB. A produção vê na ficha.
                      </span>
                      <input
                        id="p-art"
                        className="sr-only"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) {
                            patch({ artworkName: "", artworkMime: "", artworkData: "" });
                            return;
                          }
                          if (file.size > RECEIPT_MAX_BYTES) {
                            toast.error("A arte pode ter no máximo 800 KB.");
                            return;
                          }
                          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                            toast.error("A arte precisa ser JPG, PNG ou WebP.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () =>
                            patch({
                              artworkName: file.name,
                              artworkMime: file.type,
                              artworkData: String(reader.result ?? ""),
                            });
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {draft.artworkData ? (
                      <div className="mt-3">
                        <img
                          src={draft.artworkData}
                          alt="Prévia da arte"
                          className="max-h-28 rounded-sm border border-line"
                        />
                        <button
                          type="button"
                          className="mt-2 text-sm font-semibold text-navy underline"
                          onClick={() =>
                            patch({ artworkName: "", artworkMime: "", artworkData: "" })
                          }
                        >
                          Remover arte
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 6 ? (
          <div className="grid gap-4">
            <div>
              <Label htmlFor="p-prazo">Prazo de entrega</Label>
              <Input
                id="p-prazo"
                type="date"
                min={todayISO()}
                required
                value={draft.dueDate}
                onChange={(e) => patch({ dueDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="p-obs">Observação (opcional)</Label>
              <Textarea
                id="p-obs"
                value={draft.notes}
                placeholder="Turma, setor, urgência… sem alterar peça, cor ou estampa."
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </div>
          </div>
        ) : null}

        {step === 7 && selectedCustomer ? (
          <div className="grid gap-4">
            <div className="rounded-md border border-navy/20 bg-mist p-4">
              <p className="mb-3 font-display text-sm uppercase tracking-wide text-navy">
                Ficha que a produção vai receber
              </p>
              <OrderSpec
                order={{
                  customerName: selectedCustomer.name,
                  quantity: totalPieces(allLines),
                  piece: allLines[0]?.piece ?? "",
                  size: allLines[0]?.size ?? "",
                  color: allLines[0]?.color ?? "",
                  materialName: allLines[0]?.materialName ?? "",
                  printName: allLines[0]?.printName ?? "",
                  technique: allLines[0]?.technique ?? "",
                  printPlace: allLines[0]?.printPlace ?? "",
                  personalization: allLines[0]?.personalization ?? "",
                  dueDate: draft.dueDate,
                  notes: draft.notes.trim(),
                  items: asOrderItems(allItems),
                }}
              />
            </div>
            {schoolExtra >= 1 ? (
              <DemandHint
                outlook={outlook.data}
                extraPieces={schoolExtra}
                extraMaterial={allLines.find((l) => isSchoolPiece(l.piece, pieces))?.materialName}
              />
            ) : null}
            <ConfirmCheck
              checked={confirmPiece}
              onChange={setConfirmPiece}
              label={`Peças e tamanhos: ${orderItemsSummary(allLines)}`}
            />
            <ConfirmCheck
              checked={confirmColor}
              onChange={setConfirmColor}
              label={`Cores e materiais: ${
                [...new Set(allItems.map((i) => `${i.piece} ${i.color} em ${i.materialName}`))].join(" · ") || "—"
              }`}
            />
            <ConfirmCheck
              checked={confirmPrint}
              onChange={setConfirmPrint}
              label={`Estampas: ${
                [...new Set(allItems.map((i) => describeCustomization(i)))].join(" · ") || "—"
              }`}
            />
          </div>
        ) : null}

        <div
          role="alert"
          aria-live="polite"
          className="mt-4 min-h-5 text-sm text-danger"
        >
          {stepError}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Voltar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            {step === 1 && cart.length > 0 && !draft.piece ? (
              <Button
                type="button"
                onClick={() => setStep(draft.dueDate ? 7 : 6)}
              >
                {draft.dueDate ? "Conferir pedido" : "Definir prazo"}
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            ) : isLast ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(itemError)}
                  onClick={addAnotherPiece}
                >
                  <Plus className="size-4" aria-hidden />
                  Outra peça
                </Button>
                <Button
                  type="button"
                  disabled={!canNext || save.isPending}
                  onClick={() => save.mutate()}
                >
                  {save.isPending ? "Lançando…" : "Lançar pedido"}
                </Button>
              </>
            ) : (
              <>
                {step >= 5 && !itemError ? (
                  <Button type="button" variant="outline" onClick={addAnotherPiece}>
                    <Plus className="size-4" aria-hidden />
                    Outra peça
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={!canNext}
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                >
                  Continuar
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

const stepCopy: string[] = [
  "Quem vai receber. Sem cliente cadastrado o pedido não segue.",
  "Toque na peça. Polo, calça e camiseta entram no mesmo pedido — uma de cada vez.",
  "Marque todos os tamanhos desta peça: 1× M, 2× G… Não precisa abrir outro pedido.",
  "Cor desta peça. Fora da lista, toque em Outra e coloque o nome.",
  "Só o tecido que essa peça usa. Botão e linha não entram.",
  "A estampa define técnica e local. Você só confirma o texto.",
  "Prazo único do pedido. Observação não troca peça nem cor.",
  "Leia a ficha inteira. Sem os três vistos o pedido não lança.",
];

function ChoiceCard({
  selected,
  title,
  hint,
  image,
  onSelect,
}: {
  selected: boolean;
  title: string;
  hint?: string;
  image?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border-2 text-left transition-colors",
        selected ? "border-lime bg-lime/15" : "border-line bg-paper hover:border-navy/40",
      )}
    >
      {image ? (
        <img
          src={image}
          alt=""
          className="h-24 w-full object-cover"
        />
      ) : null}
      <span className="flex items-start gap-2 p-3">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-navy">{title}</span>
          {hint ? (
            <span className="mt-0.5 block text-xs text-muted">{hint}</span>
          ) : null}
        </span>
        {selected ? <Check className="mt-0.5 size-4 shrink-0 text-navy" aria-hidden /> : null}
      </span>
    </button>
  );
}

function Chip({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "min-h-11 rounded-sm border-2 px-3 text-sm font-medium",
        selected ? "border-lime bg-lime/20 text-navy" : "border-line bg-paper hover:border-navy/40",
      )}
    >
      {children}
    </button>
  );
}

function ConfirmCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-line bg-paper p-3">
      <input
        type="checkbox"
        className="mt-1 size-5 accent-navy"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm font-medium text-ink">{label}</span>
    </label>
  );
}
