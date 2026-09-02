import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, Plus, Shirt, Stamp } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCatalogPiece,
  deleteCatalogPrint,
  getCatalogAdmin,
  listMaterials,
  saveCatalogPiece,
  saveCatalogPrint,
} from "@/lib/karisma/api";
import {
  CATEGORY_LABEL,
  COLORS,
  COLOR_SWATCH,
  PIECE_CATEGORIES,
  PLACE_LABEL,
  SIZE_SET_LABEL,
  TECHNIQUE_LABEL,
  UNIFORM_IMAGES,
  type PieceCategory,
  type SizeSet,
} from "@/lib/karisma/catalog";
import { Page } from "@/components/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { usePageAccess } from "@/components/staff-session";
import { RECEIPT_MAX_BYTES } from "@/lib/karisma/pickup";
import { isAllowedImageMime } from "@/lib/karisma/media";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/catalogo")({ component: Catalogo });

type Tab = "pecas" | "estampas";
type AdminPiece = Awaited<ReturnType<typeof getCatalogAdmin>>["pieces"][number];
type AdminPrint = Awaited<ReturnType<typeof getCatalogAdmin>>["prints"][number];

function Catalogo() {
  const { allowed } = usePageAccess("catalogo");
  const [tab, setTab] = useState<Tab>("pecas");
  const catalog = useQuery({
    queryKey: ["catalog-admin"],
    queryFn: () => getCatalogAdmin(),
    enabled: allowed,
  });

  return (
    <Page
      page="catalogo"
      title="Menu do pedido"
      description="Isto é o que a atendente vê ao lançar. Só a administração inclui, tira ou muda peça, cor, tecido e estampa."
    >
      <p className="mb-4 text-sm text-muted">
        Tecidos vêm do{" "}
        <Link to="/estoque" className="font-semibold text-navy underline">
          estoque
        </Link>
        . Peça inativa some do pedido, mas os lançados continuam na fila.
      </p>
      <div className="mb-5 flex gap-2" role="tablist" aria-label="Catálogo">
        <Button
          type="button"
          size="sm"
          variant={tab === "pecas" ? "navy" : "outline"}
          onClick={() => setTab("pecas")}
        >
          <Shirt className="size-4" aria-hidden />
          Peças
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "estampas" ? "navy" : "outline"}
          onClick={() => setTab("estampas")}
        >
          <Stamp className="size-4" aria-hidden />
          Estampas
        </Button>
      </div>
      {catalog.isPending ? <p className="text-muted">Carregando catálogo…</p> : null}
      {tab === "pecas" ? (
        <PieceBoard pieces={catalog.data?.pieces ?? []} />
      ) : (
        <PrintBoard prints={catalog.data?.prints ?? []} />
      )}
    </Page>
  );
}

function PieceBoard({ pieces }: { pieces: AdminPiece[] }) {
  const materials = useQuery({ queryKey: ["materials"], queryFn: () => listMaterials() });
  const [selected, setSelected] = useState<number | "new" | null>(null);
  const current = selected ?? pieces[0]?.id ?? "new";
  const piece = typeof current === "number" ? pieces.find((p) => p.id === current) : undefined;
  const AVULSOS = new Set(["Botão", "Linha (cone)", "Zíper 20 cm", "Elástico", "Gola polo"]);
  const materialNames = (materials.data ?? [])
    .map((m) => m.name)
    .filter((name) => !AVULSOS.has(name));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Como aparece no pedido
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pieces.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={current === p.id}
              onClick={() => setSelected(p.id)}
              className={cn(
                "flex flex-col overflow-hidden rounded-lg border-2 text-left transition-colors",
                selected === p.id || current === p.id ? "border-lime bg-lime/15" : "border-line bg-paper hover:border-navy/40",
                !p.active && "opacity-60",
              )}
            >
              <img src={p.image} alt="" className="h-20 w-full object-cover" />
              <span className="flex items-start justify-between gap-1 p-2">
                <span>
                  <span className="block text-sm font-semibold text-navy">{p.name}</span>
                  <span className="text-xs text-muted">{CATEGORY_LABEL[p.category]}</span>
                </span>
                {!p.active ? (
                  <Badge className="bg-mist text-muted">Fora</Badge>
                ) : null}
              </span>
            </button>
          ))}
          <button
            type="button"
            aria-pressed={current === "new"}
            onClick={() => setSelected("new")}
            className={cn(
              "flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 text-sm font-semibold",
              selected === "new" || current === "new"
                ? "border-lime bg-lime/15 text-navy"
                : "border-navy/30 bg-paper text-navy hover:border-navy",
            )}
          >
            <Plus className="size-6" aria-hidden />
            Nova peça
          </button>
        </div>
      </div>
      <PieceForm
        key={current === "new" ? "new" : String(piece?.id ?? "empty")}
        piece={current === "new" ? undefined : piece}
        materialNames={materialNames}
        onCreated={(id) => setSelected(id)}
        onDeleted={() => setSelected(null)}
      />
    </div>
  );
}

function PieceForm({
  piece,
  materialNames,
  onCreated,
  onDeleted,
}: {
  piece?: AdminPiece;
  materialNames: string[];
  onCreated: (id: number) => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(piece?.name ?? "");
  const [category, setCategory] = useState<PieceCategory>(piece?.category ?? "corporativo");
  const [sizeSet, setSizeSet] = useState<SizeSet>(piece?.sizeSet ?? "adulto");
  const [image, setImage] = useState(piece?.image || UNIFORM_IMAGES[0]);
  const [colors, setColors] = useState<string[]>([...(piece?.colors ?? ["Branco", "Preto", "Azul marinho"])]);
  const [extraColor, setExtraColor] = useState("");
  const [materials, setMaterials] = useState<string[]>([...(piece?.materials ?? [])]);
  const [techniques, setTechniques] = useState<string[]>([...(piece?.techniques ?? ["nenhuma", "silk"])]);
  const [active, setActive] = useState(piece?.active ?? true);

  const save = useMutation({
    mutationFn: () =>
      saveCatalogPiece({
        data: {
          id: piece?.id,
          name,
          category,
          image,
          sizeSet,
          colors,
          materials,
          techniques,
          active,
        },
      }),
    onSuccess: async (result) => {
      toast.success(piece ? "Peça atualizada. O pedido já usa esta lista." : "Peça entrou no menu do pedido.");
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["catalog-admin"] });
      if (!piece && result.id) onCreated(result.id);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não salvou."),
  });

  const remove = useMutation({
    mutationFn: () => deleteCatalogPiece({ data: { id: piece!.id } }),
    onSuccess: async () => {
      toast.success("Peça excluída do menu.");
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["catalog-admin"] });
      onDeleted();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível excluir."),
  });

  function toggleColor(color: string) {
    setColors((cur) => (cur.includes(color) ? cur.filter((c) => c !== color) : [...cur, color]));
  }

  function addExtraColor() {
    const next = extraColor.trim();
    if (!next) return;
    if (!colors.includes(next)) setColors((cur) => [...cur, next]);
    setExtraColor("");
  }

  return (
    <Card>
      <h2 className="font-display text-lg text-navy">{piece ? `Editar ${piece.name}` : "Cadastrar peça"}</h2>
      <p className="mt-1 text-sm text-muted">Nome, foto, cores e tecido — a atendente só escolhe daqui.</p>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (colors.length < 1) {
            toast.error("Marque ao menos uma cor.");
            return;
          }
          if (materials.length < 1) {
            toast.error("Marque o tecido desta peça.");
            return;
          }
          save.mutate();
        }}
      >
        <div>
          <Label htmlFor="piece-name">Nome no pedido</Label>
          <Input
            id="piece-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ex.: Bermuda escolar"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="piece-cat">Linha</Label>
            <Select
              id="piece-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as PieceCategory)}
            >
              {PIECE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="piece-size">Tamanhos</Label>
            <Select id="piece-size" value={sizeSet} onChange={(e) => setSizeSet(e.target.value as SizeSet)}>
              {(Object.keys(SIZE_SET_LABEL) as SizeSet[]).map((s) => (
                <option key={s} value={s}>
                  {SIZE_SET_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Foto da peça</legend>
          <div className="mb-3 overflow-hidden rounded-md border border-line bg-mist">
            <img src={image} alt="Prévia da peça" className="mx-auto max-h-40 w-full object-contain" />
          </div>
          <label className="mb-3 flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-navy/30 bg-paper px-3 py-3 text-center hover:border-navy">
            <ImagePlus className="size-5 text-navy" aria-hidden />
            <span className="text-sm font-semibold text-navy">Subir foto nova</span>
            <span className="text-xs text-muted">JPG, PNG ou WebP até 800 KB</span>
            <input
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.size > RECEIPT_MAX_BYTES) {
                  toast.error("A foto pode ter no máximo 800 KB.");
                  return;
                }
                if (!isAllowedImageMime(file.type)) {
                  toast.error("A foto precisa ser JPG, PNG ou WebP.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setImage(String(reader.result ?? ""));
                reader.readAsDataURL(file);
              }}
            />
          </label>
          <p className="mb-2 text-xs text-muted">Ou escolha uma foto já da loja:</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {UNIFORM_IMAGES.map((src) => (
              <button
                key={src}
                type="button"
                aria-pressed={image === src}
                onClick={() => setImage(src)}
                className={cn(
                  "overflow-hidden rounded-sm border-2",
                  image === src ? "border-lime" : "border-line hover:border-navy/40",
                )}
              >
                <img src={src} alt="" className="h-12 w-full object-cover" />
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cores desta peça</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => {
              const on = colors.includes(color);
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleColor(color)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-sm border-2 px-3 text-sm",
                    on ? "border-lime bg-lime/15" : "border-line bg-paper",
                  )}
                >
                  <span className={cn("size-4 rounded-full border border-line", COLOR_SWATCH[color])} />
                  {color}
                  {on ? <Check className="size-3.5" aria-hidden /> : null}
                </button>
              );
            })}
            {colors
              .filter((c) => !(COLORS as readonly string[]).includes(c))
              .map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-sm border-2 border-lime bg-lime/15 px-3 text-sm"
                >
                  {color}
                  <Check className="size-3.5" aria-hidden />
                </button>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              value={extraColor}
              onChange={(e) => setExtraColor(e.target.value)}
              placeholder="Azul petróleo"
              aria-label="Nome da cor extra"
            />
            <Button type="button" variant="outline" onClick={addExtraColor}>
              Adicionar
            </Button>
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Tecidos desta peça</legend>
          {materialNames.length === 0 ? (
            <p className="text-sm text-danger">
              Nenhum material no estoque.{" "}
              <Link to="/estoque" className="font-semibold underline">
                Cadastre o tecido
              </Link>{" "}
              antes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {materialNames.map((mat) => {
                const on = materials.includes(mat);
                return (
                  <label
                    key={mat}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-sm border-2 px-3 text-sm",
                      on ? "border-lime bg-lime/15" : "border-line",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setMaterials((cur) =>
                          e.target.checked ? [...cur, mat] : cur.filter((x) => x !== mat),
                        )
                      }
                    />
                    {mat}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Técnicas permitidas</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TECHNIQUE_LABEL).map(([id, label]) => {
              const on = techniques.includes(id);
              return (
                <label
                  key={id}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-sm border-2 px-3 text-sm",
                    on ? "border-lime bg-lime/15" : "border-line",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setTechniques((cur) =>
                        e.target.checked ? [...cur, id] : cur.filter((x) => x !== id),
                      )
                    }
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>
        {piece ? (
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativa no pedido
          </label>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={save.isPending}>
            {piece ? "Salvar peça" : "Colocar no menu"}
          </Button>
          {piece ? (
            <ConfirmDeleteButton
              confirmTitle={`Excluir ${piece.name} do menu?`}
              confirmBody="Some da lista de pedido novo. Pedidos já lançados com esta peça continuam normais."
              pending={remove.isPending}
              onConfirm={() => remove.mutate()}
            />
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function PrintBoard({ prints }: { prints: AdminPrint[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? prints[0]?.id ?? "new";
  const print = current === "new" ? undefined : prints.find((p) => p.id === current);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid gap-2">
        {prints.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={current === p.id}
            onClick={() => setSelected(p.id)}
            className={cn(
              "rounded-md border-2 p-3 text-left",
              current === p.id ? "border-lime bg-lime/15" : "border-line bg-paper hover:border-navy/40",
              !p.active && "opacity-60",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-semibold text-navy">{p.name}</span>
              {!p.active ? <Badge className="bg-mist text-muted">Fora</Badge> : null}
            </span>
            <span className="mt-1 block text-xs text-muted">{p.hint || "Sem dica"}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={current === "new"}
          onClick={() => setSelected("new")}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border-2 border-dashed text-sm font-semibold",
            current === "new"
              ? "border-lime bg-lime/15 text-navy"
              : "border-navy/30 text-navy hover:border-navy",
          )}
        >
          <Plus className="size-4" aria-hidden />
          Nova estampa
        </button>
      </div>
      <PrintForm
        key={current}
        print={print}
        onCreated={(id) => setSelected(id)}
        onDeleted={() => setSelected(null)}
      />
    </div>
  );
}

function PrintForm({
  print,
  onCreated,
  onDeleted,
}: {
  print?: AdminPrint;
  onCreated: (id: string) => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const locked = print?.id === "sem-estampa";
  const [name, setName] = useState(print?.name ?? "");
  const [hint, setHint] = useState(print?.hint ?? "");
  const [technique, setTechnique] = useState<string>(print?.technique ?? "silk");
  const [place, setPlace] = useState<string>(print?.place ?? "peito_esquerdo");
  const [needsText, setNeedsText] = useState(print?.needsText ?? true);
  const [textLabel, setTextLabel] = useState(print?.textLabel ?? "Texto da arte");
  const [allCats, setAllCats] = useState(print?.categories === "todas");
  const [cats, setCats] = useState<PieceCategory[]>(
    print && print.categories !== "todas" ? [...print.categories] : ["corporativo"],
  );
  const [active, setActive] = useState(print?.active ?? true);

  const save = useMutation({
    mutationFn: () =>
      saveCatalogPrint({
        data: {
          id: print?.id,
          name,
          hint,
          technique,
          place,
          needsText,
          textLabel,
          textPlaceholder: print?.textPlaceholder ?? "",
          categories: allCats ? "todas" : cats,
          active: locked ? true : active,
        },
      }),
    onSuccess: async (result) => {
      toast.success(print ? "Estampa atualizada." : "Estampa no menu do pedido.");
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["catalog-admin"] });
      if (!print && result.id) onCreated(result.id);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não salvou."),
  });

  const remove = useMutation({
    mutationFn: () => deleteCatalogPrint({ data: { id: print!.id } }),
    onSuccess: async () => {
      toast.success("Estampa excluída do menu.");
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["catalog-admin"] });
      onDeleted();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Não foi possível excluir."),
  });

  return (
    <Card>
      <h2 className="font-display text-lg text-navy">{print ? print.name : "Nova estampa"}</h2>
      <p className="mt-1 text-sm text-muted">
        A atendente anexa a logo no pedido. Aqui você só define o tipo de personalização.
      </p>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="print-name">Nome</Label>
          <Input id="print-name" value={name} onChange={(e) => setName(e.target.value)} required disabled={locked} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="print-hint">Dica para o atendimento</Label>
          <Input id="print-hint" value={hint} onChange={(e) => setHint(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="print-tech">Técnica</Label>
          <Select id="print-tech" value={technique} onChange={(e) => setTechnique(e.target.value)} disabled={locked}>
            <option value="escolher">Atendente escolhe</option>
            {Object.entries(TECHNIQUE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="print-place">Local</Label>
          <Select id="print-place" value={place} onChange={(e) => setPlace(e.target.value)} disabled={locked}>
            <option value="escolher">Atendente escolhe</option>
            {Object.entries(PLACE_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={needsText}
            disabled={locked}
            onChange={(e) => setNeedsText(e.target.checked)}
          />
          Exige texto (marca, nome…)
        </label>
        {needsText ? (
          <div>
            <Label htmlFor="print-label">Rótulo do texto</Label>
            <Input id="print-label" value={textLabel} onChange={(e) => setTextLabel(e.target.value)} />
          </div>
        ) : null}
        <label className="inline-flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={allCats} onChange={(e) => setAllCats(e.target.checked)} disabled={locked} />
          Vale para todas as linhas
        </label>
        {!allCats ? (
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {PIECE_CATEGORIES.map((c) => (
              <label
                key={c}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-sm border-2 px-3 text-sm",
                  cats.includes(c) ? "border-lime bg-lime/15" : "border-line",
                )}
              >
                <input
                  type="checkbox"
                  checked={cats.includes(c)}
                  onChange={(e) =>
                    setCats((cur) => (e.target.checked ? [...cur, c] : cur.filter((x) => x !== c)))
                  }
                />
                {CATEGORY_LABEL[c]}
              </label>
            ))}
          </div>
        ) : null}
        {print && !locked ? (
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativa no pedido
          </label>
        ) : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {print ? "Salvar estampa" : "Cadastrar estampa"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
