import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  GraduationCap,
  Scissors,
  Shirt,
  Warehouse,
} from "lucide-react";
import { getDashboard } from "@/lib/karisma/api";
import { formatDate, formatQty } from "@/lib/karisma/format";
import { orderItemsSummary } from "@/lib/karisma/order-items";
import { Page } from "@/components/page";
import { SchoolOutlookCard, SeasonBanner } from "@/components/school-outlook";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePageAccess } from "@/components/staff-session";
import { canAccess } from "@/lib/karisma/roles";

export const Route = createFileRoute("/_app/painel")({ component: Painel });

function Painel() {
  const { staff, allowed } = usePageAccess("painel");
  const q = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    enabled: allowed,
  });
  const stats = q.data?.stats;
  const outlook = q.data?.outlook;
  const role = staff?.role;

  return (
    <Page
      page="painel"
      title="Painel"
      description="Fila, prazos e o tecido que os pedidos escolares já comprometeram — os pequenos somados, antes da baixa."
    >
      {q.isError ? (
        <p className="text-danger">Não foi possível carregar o painel.</p>
      ) : null}

      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Recebidos"
          value={stats?.received}
          to={canAccess(role ?? "atendimento", "pedidos") ? "/pedidos" : "/producao"}
          icon={ClipboardList}
        />
        <Stat
          label="Em produção"
          value={stats?.inProduction}
          to="/producao"
          icon={Scissors}
        />
        <Stat label="Prontos" value={stats?.ready} to="/producao" icon={Shirt} />
        <Stat
          label="Escolar na fila"
          value={stats?.schoolQueuePieces}
          to={role === "admin" ? "/estoque" : canAccess(role ?? "atendimento", "pedidos") ? "/pedidos" : "/producao"}
          icon={GraduationCap}
          warn={(stats?.committedRisks ?? 0) > 0}
        />
        <Stat
          label="Estoque baixo"
          value={stats?.lowStock}
          to={role === "admin" ? "/estoque" : undefined}
          icon={Warehouse}
          warn={(stats?.lowStock ?? 0) > 0}
        />
      </section>

      <p className="mt-2 text-sm text-muted">
        {stats
          ? `${stats.ordersThisMonth} pedidos este mês · ${stats.piecesThisMonth} peças · ${stats.overdue} atrasados${
              stats.schoolQueueOrders
                ? ` · ${stats.schoolQueueOrders} pedidos escolares somados`
                : ""
            }`
          : "Carregando…"}
      </p>

      {(q.data?.alerts.length ?? 0) > 0 ? (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
        >
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Materiais abaixo do mínimo</p>
            <ul className="mt-1">
              {q.data!.alerts.map((m) => (
                <li key={m.id}>
                  {m.name}: {formatQty(m.quantity, m.unit)} (mínimo{" "}
                  {formatQty(m.minQuantity, m.unit)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {outlook ? <SeasonBanner outlook={outlook} /> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg text-navy">Fila da produção</h2>
          <ul className="mt-4 divide-y divide-line">
            {(q.data?.queue ?? []).length === 0 && !q.isPending ? (
              <li className="py-6 text-sm text-muted">Nenhum pedido aberto.</li>
            ) : null}
            {(q.data?.queue ?? []).map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    nº {o.id} · {orderItemsSummary(o.items.length ? o.items : [o])}
                  </p>
                  <p className="text-sm text-muted">
                    {o.customerName} · prazo {formatDate(o.dueDate)}
                    {o.overdue ? " · atrasado" : ""}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
          {role === "producao" || role === "admin" ? (
            <Link to="/producao" className="mt-3 inline-block text-sm font-semibold text-navy">
              Abrir fila completa
            </Link>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-display text-lg text-navy">Atalhos</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {role !== "producao" ? (
              <li>
                <Link className="font-semibold text-navy underline" to="/pedidos/novo">
                  Lançar pedido
                </Link>
                <span className="text-muted"> — cliente, peça, prazo e personalização</span>
              </li>
            ) : null}
            {role !== "producao" ? (
              <li>
                <Link className="font-semibold text-navy underline" to="/clientes">
                  Cadastrar cliente
                </Link>
              </li>
            ) : null}
            {role !== "atendimento" ? (
              <li>
                <Link className="font-semibold text-navy underline" to="/producao">
                  Atualizar status na produção
                </Link>
              </li>
            ) : null}
            {role === "admin" ? (
              <li>
                <Link className="font-semibold text-navy underline" to="/relatorios">
                  Relatório de pedidos e materiais
                </Link>
              </li>
            ) : null}
          </ul>
        </Card>
        {outlook ? (
          <div className="lg:col-span-2">
            <SchoolOutlookCard outlook={outlook} />
          </div>
        ) : null}
      </div>
    </Page>
  );
}

function Stat({
  label,
  value,
  to,
  icon: Icon,
  warn,
}: {
  label: string;
  value?: number;
  to?: string;
  icon: typeof ClipboardList;
  warn?: boolean;
}) {
  const inner = (
    <div
      className={`rounded-lg border bg-paper p-4 ${warn ? "border-warning/50" : "border-line"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <Icon className="size-4 text-navy" aria-hidden />
      </div>
      <p className="mt-2 font-display text-3xl tabular-nums text-navy">
        {value == null ? "—" : value}
      </p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}
