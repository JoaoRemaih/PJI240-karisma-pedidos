import { STATUS_LABEL, type OrderStatus } from "./types";

export function todayISO(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  return d.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatQty(n: number, unit?: string): string {
  const value = Number.isInteger(n)
    ? String(n)
    : n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return unit ? `${value} ${unit}` : value;
}

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABEL[status];
}

export function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayISO(d);
}
