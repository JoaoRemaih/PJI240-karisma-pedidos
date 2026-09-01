import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/karisma/types";

const statusClass: Record<OrderStatus, string> = {
  recebido: "bg-navy/10 text-navy",
  em_producao: "bg-warning/15 text-warning",
  pronto: "bg-lime/30 text-lime-ink",
  retirado: "bg-mist text-muted",
};

export function Badge({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const label = {
    recebido: "Recebido",
    em_producao: "Em produção",
    pronto: "Pronto",
    retirado: "Retirado",
  }[status];
  return <Badge className={statusClass[status]}>{label}</Badge>;
}
