import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getReport } from "@/lib/karisma/api";
import { STATUS_LABEL } from "@/lib/karisma/types";
import { formatQty } from "@/lib/karisma/format";
import { Page } from "@/components/page";
import { Card } from "@/components/ui/card";
import { usePageAccess } from "@/components/staff-session";

export const Route = createFileRoute("/_app/relatorios")({
  component: Relatorios,
});

const NAVY = "#005A8D";
const LIME = "#8CC63F";
const INK = "#333333";
const STATUS_COLOR: Record<string, string> = {
  recebido: NAVY,
  em_producao: "#b54708",
  pronto: LIME,
  retirado: "#667085",
};

function Relatorios() {
  const { allowed } = usePageAccess("relatorios");
  const q = useQuery({
    queryKey: ["report"],
    queryFn: () => getReport(),
    enabled: allowed,
  });
  const data = q.data;

  const statusRows = (data?.byStatus ?? []).map((r) => ({
    name: STATUS_LABEL[r.status],
    status: r.status,
    pedidos: r.count,
    peças: r.pieces,
  }));

  return (
    <Page
      page="relatorios"
      title="Relatórios"
      description="Leitura do que entra, do que trava na produção, da temporada escolar e do tecido que a fila já comprometeu."
    >
      {q.isPending ? <p className="text-muted">Montando os números…</p> : null}
      {q.isError ? <p className="text-danger">Não foi possível carregar.</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg text-navy">Pedidos por status</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e8" />
                <XAxis dataKey="name" stroke={INK} fontSize={12} />
                <YAxis allowDecimals={false} stroke={INK} fontSize={12} />
                <Tooltip />
                <Bar dataKey="pedidos" radius={[4, 4, 0, 0]}>
                  {statusRows.map((r) => (
                    <Cell key={r.status} fill={STATUS_COLOR[r.status] ?? NAVY} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg text-navy">Peças por tipo</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.byPiece ?? []} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e8" />
                <XAxis type="number" allowDecimals={false} stroke={INK} fontSize={12} />
                <YAxis type="category" dataKey="piece" width={110} stroke={INK} fontSize={11} />
                <Tooltip />
                <Bar dataKey="pieces" name="Peças" fill={NAVY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-display text-lg text-navy">Entrada mensal</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e8" />
                <XAxis dataKey="month" stroke={INK} fontSize={12} />
                <YAxis allowDecimals={false} stroke={INK} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" name="Pedidos" fill={NAVY} radius={[4, 4, 0, 0]} />
                <Bar dataKey="pieces" name="Peças" fill={LIME} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-display text-lg text-navy">Escolar × demais</h2>
          <p className="mb-4 text-sm text-muted">
            Volta às aulas (jan–mar), inverno (mai–jul) e reposição (ago–set). Os picos de uniforme escolar não aparecem no saldo do tecido até a produção baixar.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.monthlySchool ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7e0e8" />
                <XAxis dataKey="month" stroke={INK} fontSize={12} />
                <YAxis allowDecimals={false} stroke={INK} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="school" name="Escolar" fill={NAVY} radius={[4, 4, 0, 0]} />
                <Bar dataKey="other" name="Demais" fill={LIME} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-display text-lg text-navy">Estoque × mínimo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-navy">
                <th className="py-2">Material</th>
                <th className="py-2">Saldo</th>
                <th className="py-2">Mínimo</th>
                <th className="py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {(data?.stock ?? []).map((s) => {
                const low = s.quantity < s.minQuantity;
                return (
                  <tr key={s.name} className="border-t border-line">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 tabular-nums">{formatQty(s.quantity, s.unit)}</td>
                    <td className="py-2 tabular-nums">{formatQty(s.minQuantity, s.unit)}</td>
                    <td className={`py-2 font-semibold ${low ? "text-warning" : "text-success"}`}>
                      {low ? "Abaixo do mínimo" : "Ok"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </Page>
  );
}
