import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/karisma/api";
import { formatDate } from "@/lib/karisma/format";
import { describeCustomization } from "@/lib/karisma/catalog";
import { orderItemsSummary } from "@/lib/karisma/order-items";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/karisma/types";
import { Page } from "@/components/page";
import { StatusActions } from "@/components/status-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePageAccess } from "@/components/staff-session";

export const Route = createFileRoute("/_app/pedidos/")({
  component: Pedidos,
});

function Pedidos() {
  const { allowed } = usePageAccess("pedidos");
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
    enabled: allowed,
  });
  const [status, setStatus] = useState<OrderStatus | "todos">("todos");
  const [term, setTerm] = useState("");

  const rows = useMemo(() => {
    return (q.data ?? []).filter((o) => {
      if (status !== "todos" && o.status !== status) return false;
      const hay = `${o.id} ${o.customerName} ${o.piece} ${o.items.map((i) => `${i.piece} ${i.size} ${i.color} ${i.printName}`).join(" ")} ${o.personalization} ${o.printName} ${o.color} ${o.materialName}`.toLowerCase();
      return hay.includes(term.toLowerCase());
    });
  }, [q.data, status, term]);

  return (
    <Page
      page="pedidos"
      title="Pedidos"
      description="Tudo o que o atendimento lançou. A produção muda o status na fila."
      actions={
        <Link to="/pedidos/novo">
          <Button>Novo pedido</Button>
        </Link>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="Buscar pedidos"
          placeholder="Número, cliente, peça ou estampa"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Select
          aria-label="Filtrar por status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | "todos")}
          className="sm:max-w-52"
        >
          <option value="todos">Todos os status</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-3 md:hidden">
        {q.isPending ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted">Nenhum pedido neste filtro.</p>
        ) : (
          rows.map((o) => (
            <article key={o.id} className="rounded-lg border border-line bg-paper p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-navy">nº {o.id}</p>
                <StatusBadge status={o.status} />
              </div>
              <p className="mt-1 font-medium">{o.customerName}</p>
              <p className="text-sm text-muted">
                {orderItemsSummary(o.items.length ? o.items : [o])}
              </p>
              {o.items.length > 1 ? (
                <p className="text-xs text-muted">
                  {describeCustomization(o.items[0]!)}
                </p>
              ) : (
                <p className="text-xs text-muted">
                  {o.materialName} · {describeCustomization(o)}
                </p>
              )}
              <p className="mt-2 text-sm">
                Prazo {formatDate(o.dueDate)}
                {o.overdue ? (
                  <span className="ml-2 font-semibold text-danger">Atrasado</span>
                ) : null}
              </p>
              <div className="mt-3">
                <StatusActions order={o} />
              </div>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-line bg-paper md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-mist text-navy">
            <tr>
              <th className="px-3 py-2 font-semibold">Nº</th>
              <th className="px-3 py-2 font-semibold">Cliente</th>
              <th className="px-3 py-2 font-semibold">Peça</th>
              <th className="px-3 py-2 font-semibold">Prazo</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {q.isPending ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  Carregando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  Nenhum pedido neste filtro.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-3 py-3 tabular-nums font-medium">{o.id}</td>
                  <td className="px-3 py-3">{o.customerName}</td>
                  <td className="px-3 py-3">
                    {orderItemsSummary(o.items.length ? o.items : [o])}
                    <span className="mt-0.5 block text-xs text-muted">
                      {o.items.length > 1
                        ? o.items
                            .slice(0, 3)
                            .map((i) => `${i.quantity}× ${i.piece} ${i.size}`)
                            .join(" · ")
                        : `${o.materialName} · ${describeCustomization(o)}`}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {formatDate(o.dueDate)}
                    {o.overdue ? (
                      <span className="mt-0.5 block text-xs font-semibold text-danger">
                        Atrasado
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusActions order={o} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
