import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { describeCustomization } from "@/lib/karisma/catalog";
import { formatDate } from "@/lib/karisma/format";
import { linesFromOrder, orderItemsSummary } from "@/lib/karisma/order-items";
import { STATUS_LABEL, type Order } from "@/lib/karisma/types";
import { OrderSpec } from "@/components/order-spec";
import { StatusActions } from "@/components/status-actions";
import { StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function QueueCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const lines = linesFromOrder(order);
  const summary = orderItemsSummary(lines);
  const printHint =
    order.items.length > 1
      ? describeCustomization(order.items[0]!)
      : describeCustomization(order);

  return (
    <Card className={`p-0 ${order.overdue ? "border-danger/40" : ""}`}>
      <button
        type="button"
        className="flex w-full min-h-11 items-start gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={`ficha-${order.id}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm text-navy">Pedido nº {order.id}</span>
            <StatusBadge status={order.status} />
            {order.overdue ? (
              <span className="text-xs font-semibold text-danger">atrasado</span>
            ) : null}
          </span>
          {order.customerName ? (
            <span className="mt-0.5 block truncate text-sm font-medium text-ink">
              {order.customerName}
            </span>
          ) : null}
          <span className="mt-0.5 block text-sm text-ink">{summary}</span>
          <span className="mt-0.5 block text-xs text-muted">
            Prazo {formatDate(order.dueDate)}
            {printHint ? ` · ${printHint}` : ""}
          </span>
        </span>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-navy">
          {open ? "Recolher" : "Expandir"}
          {open ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
        </span>
      </button>
      {open ? (
        <div id={`ficha-${order.id}`} className="border-t border-line px-4 pb-4 pt-3">
          <div className="mb-3 rounded-md border border-line bg-mist p-3">
            <StatusActions order={order} />
          </div>
          <OrderSpec order={order} showDue />
        </div>
      ) : (
        <p className="px-4 pb-3 text-xs text-muted">
          Agora: {STATUS_LABEL[order.status]}. Abra a ficha para conferir peça, cor e
          estampa antes de avançar.
        </p>
      )}
    </Card>
  );
}
