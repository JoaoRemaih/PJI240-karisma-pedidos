import { AlertTriangle, GraduationCap } from "lucide-react";
import { formatQty } from "@/lib/karisma/format";
import { consumptionFor } from "@/lib/karisma/status";
import type { MaterialOutlook, Outlook } from "@/lib/karisma/demand";
import { Card } from "@/components/ui/card";

export function SeasonBanner({ outlook }: { outlook: Outlook }) {
  if (outlook.seasons.length === 0 && !outlook.smallOrderTrap && outlook.surprises.length === 0) {
    return null;
  }
  const season = outlook.seasons[0];
  return (
    <div
      role="alert"
      className={`mb-6 mt-6 flex gap-3 rounded-md border p-4 text-sm ${
        outlook.surprises.length
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-warning/40 bg-warning/10 text-warning"
      }`}
    >
      <AlertTriangle className="size-5 shrink-0" aria-hidden />
      <div>
        {season ? (
          <p className="font-semibold">
            Temporada: {season.label}
          </p>
        ) : (
          <p className="font-semibold">Fila escolar somada</p>
        )}
        <p className="mt-1 text-ink">
          {season?.hint}{" "}
          {outlook.schoolOrders
            ? `${outlook.schoolOrders} pedidos pequenos somam ${outlook.schoolPieces} peças escolares na fila.`
            : null}
        </p>
        {outlook.surprises.length ? (
          <ul className="mt-2 font-medium text-danger">
            {outlook.surprises.map((m) => (
              <li key={m.id}>
                {m.name}: a fila precisa de {formatQty(m.committedQty, m.unit)}; depois sobra{" "}
                {formatQty(m.afterQueue, m.unit)}
                {m.insufficientAfter ? " — não cobre a fila" : " — abaixo do mínimo"}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function SchoolRollup({ outlook }: { outlook: Outlook }) {
  if (outlook.school.length === 0) {
    return (
      <p className="text-sm text-muted">Nenhum uniforme escolar aberto na fila.</p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {outlook.school.map((p) => (
        <div key={p.piece} className="rounded-md border border-line p-4">
          <p className="font-display text-navy">{p.piece}</p>
          <p className="text-sm text-muted">
            {p.totalPieces} peças em {p.orders} pedido{p.orders === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 grid grid-cols-4 gap-2 text-sm">
            {p.sizes.map((s) => (
              <li key={s.size} className="rounded-sm bg-mist px-2 py-1 text-center">
                <span className="block font-semibold tabular-nums">{s.pieces}</span>
                <span className="text-xs text-muted">tam {s.size}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function MaterialCommitTable({
  materials,
}: {
  materials: MaterialOutlook[];
}) {
  const rows = materials.filter((m) => m.school || m.committedQty > 0 || m.level !== "ok");
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Nenhum tecido comprometido pela fila.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-mist text-navy">
          <tr>
            <th className="px-3 py-2 font-semibold">Tecido</th>
            <th className="px-3 py-2 font-semibold">Saldo</th>
            <th className="px-3 py-2 font-semibold">Fila (ainda não baixou)</th>
            <th className="px-3 py-2 font-semibold">Depois da fila</th>
            <th className="px-3 py-2 font-semibold">Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr
              key={m.id}
              className={`border-t border-line ${
                m.level === "surprise" ? "bg-danger/10" : m.level === "watch" ? "bg-warning/10" : ""
              }`}
            >
              <td className="px-3 py-3 font-medium">
                {m.name}
                {m.school ? (
                  <span className="ml-2 text-xs font-semibold text-navy">escolar</span>
                ) : null}
              </td>
              <td className="px-3 py-3 tabular-nums">{formatQty(m.quantity, m.unit)}</td>
              <td className="px-3 py-3 tabular-nums">
                {m.openOrders
                  ? `${m.openOrders} ped. · ${m.committedPieces} pç · ${formatQty(m.committedQty, m.unit)}`
                  : "—"}
              </td>
              <td className="px-3 py-3 tabular-nums">{formatQty(m.afterQueue, m.unit)}</td>
              <td className="px-3 py-3 font-semibold">
                {m.insufficientAfter
                  ? "Não cobre a fila"
                  : m.belowMinAfter
                    ? "Fica abaixo do mínimo"
                    : m.level === "watch"
                      ? "Somar os pequenos"
                      : "Ok"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SchoolOutlookCard({ outlook }: { outlook: Outlook }) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 font-display text-lg text-navy">
        <GraduationCap className="size-5" aria-hidden />
        Uniformes escolares na fila
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        Pedido avulso não mostra o buraco. Aqui os pequenos somam por peça e tamanho.
      </p>
      <SchoolRollup outlook={outlook} />
    </Card>
  );
}

export function DemandHint({
  outlook,
  extraPieces,
  extraMaterial,
}: {
  outlook: Outlook | undefined;
  extraPieces: number;
  extraMaterial?: string;
}) {
  if (!outlook || extraPieces < 1) return null;
  const mat = extraMaterial
    ? outlook.materials.find((m) => m.name === extraMaterial)
    : undefined;
  const schoolAlready = outlook.schoolPieces;
  const afterPieces = schoolAlready + extraPieces;
  const risk = mat
    ? mat.afterQueue - consumptionFor(extraPieces, mat.qtyPerPiece)
    : null;
  const surprise =
    risk != null && mat
      ? risk < 0 || risk < mat.minQuantity
      : false;
  return (
    <p
      className={`rounded-md border p-3 text-sm ${
        surprise ? "border-danger/40 bg-danger/10 text-danger" : "border-line bg-mist text-ink"
      }`}
    >
      Na fila já há {schoolAlready} peças escolares em {outlook.schoolOrders} pedido
      {outlook.schoolOrders === 1 ? "" : "s"}. Com este, sobem para {afterPieces}.
      {mat ? (
        <>
          {" "}
          {mat.name}: depois da fila
          {surprise ? " não cobre o mínimo — compre antes de produzir." : ` ficam ${formatQty(Math.round(risk! * 100) / 100, mat.unit)}.`}
        </>
      ) : null}
    </p>
  );
}
