import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/karisma/api";
import { STATUS_LABEL, type OrderStatus } from "@/lib/karisma/types";
import { Page } from "@/components/page";
import { QueueCard } from "@/components/queue-card";
import { usePageAccess } from "@/components/staff-session";

export const Route = createFileRoute("/_app/producao")({ component: Producao });

const COLS: OrderStatus[] = ["recebido", "em_producao", "pronto"];

function Producao() {
  const { allowed } = usePageAccess("producao");
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: () => listOrders(),
    enabled: allowed,
  });
  const orders = q.data ?? [];

  return (
    <Page
      page="producao"
      title="Fila da produção"
      description="Clique no pedido para abrir a ficha no mesmo card. Cada avanço pede confirmação — conferir cor, material e estampa antes de baixar o estoque."
    >
      {q.isPending ? <p className="text-muted">Carregando fila…</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {COLS.map((status) => {
          const items = orders
            .filter((o) => o.status === status)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          return (
            <section key={status} aria-labelledby={`col-${status}`}>
              <h2
                id={`col-${status}`}
                className="mb-3 font-display text-lg text-navy"
              >
                {STATUS_LABEL[status]}
                <span className="ml-2 text-sm font-normal text-muted">
                  {items.length}
                </span>
              </h2>
              <ul className="space-y-3">
                {items.length === 0 ? (
                  <li className="rounded-md border border-dashed border-line p-4 text-sm text-muted">
                    Vazio
                  </li>
                ) : (
                  items.map((o) => (
                    <li key={o.id}>
                      <QueueCard order={o} />
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted">
        Pedidos retirados saem desta fila. O atendimento marca a retirada na lista
        de pedidos.
      </p>
    </Page>
  );
}
