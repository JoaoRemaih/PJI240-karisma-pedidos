import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMaterial,
  getStockOutlook,
  listMaterials,
  listMovements,
  updateMaterial,
} from "@/lib/karisma/api";
import { formatDateTime, formatQty } from "@/lib/karisma/format";
import { Page } from "@/components/page";
import {
  MaterialCommitTable,
  SchoolOutlookCard,
  SeasonBanner,
} from "@/components/school-outlook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageAccess } from "@/components/staff-session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/estoque")({ component: Estoque });

function Estoque() {
  const { allowed } = usePageAccess("estoque");
  const qc = useQueryClient();
  const mats = useQuery({
    queryKey: ["materials"],
    queryFn: () => listMaterials(),
    enabled: allowed,
  });
  const moves = useQuery({
    queryKey: ["movements"],
    queryFn: () => listMovements(),
    enabled: allowed,
  });
  const outlook = useQuery({
    queryKey: ["stock-outlook"],
    queryFn: () => getStockOutlook({ data: {} }),
    enabled: allowed,
  });

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("m");
  const [quantity, setQuantity] = useState("0");
  const [minQuantity, setMinQuantity] = useState("0");
  const [qtyPerPiece, setQtyPerPiece] = useState("1");

  const create = useMutation({
    mutationFn: () =>
      createMaterial({
        data: {
          name,
          unit,
          quantity: Number(quantity),
          minQuantity: Number(minQuantity),
          qtyPerPiece: Number(qtyPerPiece),
        },
      }),
    onSuccess: async () => {
      toast.success("Material cadastrado.");
      setName("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["materials"] }),
        qc.invalidateQueries({ queryKey: ["stock-outlook"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["catalog-admin"] }),
      ]);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Não foi possível cadastrar."),
  });

  return (
    <Page
      page="estoque"
      title="Estoque"
      description="Ajuste saldo, mínimo e consumo. O tecido que a peça usa no pedido é escolhido no Catálogo."
    >
      {outlook.data ? (
        <>
          <SeasonBanner outlook={outlook.data} />
          <div className="mb-6">
            <SchoolOutlookCard outlook={outlook.data} />
          </div>
          <div className="mb-8">
            <h2 className="mb-3 font-display text-lg text-navy">Tecido comprometido pela fila</h2>
            <p className="mb-3 text-sm text-muted">
              Recebido conta como comprometido. Em produção já saiu do saldo — não some duas vezes.
            </p>
            <MaterialCommitTable materials={outlook.data.materials} />
          </div>
        </>
      ) : null}

      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-display text-lg text-navy">Materiais</h2>
        <p className="text-sm text-muted">
          Monte polo, calça e o resto em{" "}
          <Link to="/catalogo" className="font-semibold text-navy underline">
            Catálogo
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-4">
        {(mats.data ?? []).map((m) => (
          <MaterialCard key={m.id} material={m} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-navy">Novo material</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <Label htmlFor="m-name">Nome</Label>
              <Input id="m-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-unit">Unidade</Label>
              <Input id="m-unit" required value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-qty">Quantidade</Label>
              <Input
                id="m-qty"
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="m-min">Mínimo</Label>
              <Input
                id="m-min"
                type="number"
                step="0.01"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="m-pp">Consumo por peça</Label>
              <Input
                id="m-pp"
                type="number"
                step="0.01"
                value={qtyPerPiece}
                onChange={(e) => setQtyPerPiece(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                Cadastrar
              </Button>
            </div>
          </form>
        </Card>
        <Card>
          <h2 className="font-display text-lg text-navy">Movimentações</h2>
          <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
            {(moves.data ?? []).length === 0 ? (
              <li className="text-muted">Nenhuma movimentação ainda.</li>
            ) : (
              (moves.data ?? []).map((mv) => (
                <li key={mv.id} className="border-b border-line pb-2">
                  <span className={mv.delta < 0 ? "font-semibold text-danger" : "font-semibold text-success"}>
                    {mv.delta > 0 ? "+" : ""}
                    {formatQty(mv.delta)}
                  </span>{" "}
                  {mv.materialName}
                  {mv.orderId ? ` · pedido nº ${mv.orderId}` : ""}
                  <span className="mt-0.5 block text-xs text-muted">
                    {mv.reason} · {formatDateTime(mv.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </Page>
  );
}

function MaterialCard({
  material,
}: {
  material: {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    minQuantity: number;
    qtyPerPiece: number;
    belowMin: boolean;
    active: boolean;
  };
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(material.name);
  const [unit, setUnit] = useState(material.unit);
  const [qty, setQty] = useState(String(material.quantity));
  const [min, setMin] = useState(String(material.minQuantity));
  const [per, setPer] = useState(String(material.qtyPerPiece));
  const [active, setActive] = useState(material.active);
  const save = useMutation({
    mutationFn: () =>
      updateMaterial({
        data: {
          id: material.id,
          quantity: Number(qty),
          minQuantity: Number(min),
          qtyPerPiece: Number(per),
          name,
          unit,
          active,
        },
      }),
    onSuccess: async () => {
      toast.success("Estoque atualizado.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["materials"] }),
        qc.invalidateQueries({ queryKey: ["movements"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["stock-outlook"] }),
        qc.invalidateQueries({ queryKey: ["catalog-admin"] }),
      ]);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Falha no ajuste."),
  });

  return (
    <Card className={cn(material.belowMin && "border-warning/50", !material.active && "opacity-70")}>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Label htmlFor={`name-${material.id}`}>Nome do tecido</Label>
            <Input
              id={`name-${material.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <p className="pt-6 text-right">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">Saldo agora</span>
            <span className="font-display text-2xl tabular-nums text-navy">
              {formatQty(material.quantity, material.unit)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {material.belowMin ? (
            <Badge className="bg-warning/15 text-warning">Abaixo do mínimo</Badge>
          ) : (
            <Badge className="bg-lime/20 text-lime-ink">No nível</Badge>
          )}
          {!material.active ? <Badge className="bg-mist text-muted">Inativo no pedido</Badge> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor={`q-${material.id}`}>Novo saldo</Label>
            <Input
              id={`q-${material.id}`}
              type="number"
              step="0.01"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`min-${material.id}`}>Mínimo</Label>
            <Input
              id={`min-${material.id}`}
              type="number"
              step="0.01"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`per-${material.id}`}>Consumo por peça</Label>
            <Input
              id={`per-${material.id}`}
              type="number"
              step="0.01"
              value={per}
              onChange={(e) => setPer(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor={`unit-${material.id}`}>Unidade</Label>
            <Input
              id={`unit-${material.id}`}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo no pedido
          </label>
          <Button type="submit" variant="navy" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar material"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
