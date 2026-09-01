import type { OrderStatus, Role } from "./types";

const FLOW: Record<OrderStatus, OrderStatus[]> = {
  recebido: ["em_producao"],
  em_producao: ["pronto", "recebido"],
  pronto: ["retirado", "em_producao"],
  retirado: [],
};

/** Who may perform each transition (from → to). */
const ACTORS: Record<string, Role[]> = {
  "recebido>em_producao": ["producao", "admin"],
  "em_producao>pronto": ["producao", "admin"],
  "em_producao>recebido": ["producao", "admin"],
  "pronto>retirado": ["atendimento", "admin"],
  "pronto>em_producao": ["admin"],
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  role: Role,
): boolean {
  if (!FLOW[from]?.includes(to)) return false;
  return (ACTORS[`${from}>${to}`] ?? []).includes(role);
}

export function nextStatuses(from: OrderStatus, role: Role): OrderStatus[] {
  return (FLOW[from] ?? []).filter((to) => canTransition(from, to, role));
}

/** Deduct stock only when entering production for the first time. */
export function shouldDeductStock(from: OrderStatus, to: OrderStatus): boolean {
  return from === "recebido" && to === "em_producao";
}

/** Restock when production sends the order back to the queue. */
export function shouldRestock(from: OrderStatus, to: OrderStatus): boolean {
  return from === "em_producao" && to === "recebido";
}

export function consumptionFor(
  pieces: number,
  qtyPerPiece: number,
): number {
  if (!Number.isFinite(pieces) || pieces <= 0) return 0;
  if (!Number.isFinite(qtyPerPiece) || qtyPerPiece < 0) return 0;
  return Math.round(pieces * qtyPerPiece * 100) / 100;
}

export type TransitionNotice = {
  to: OrderStatus;
  title: string;
  body: string;
  confirmLabel: string;
  warnStock: boolean;
};

/** Copy shown before an irreversible status change. */
export function transitionNotice(
  from: OrderStatus,
  to: OrderStatus,
): TransitionNotice {
  if (from === "recebido" && to === "em_producao") {
    return {
      to,
      title: "Iniciar produção deste pedido?",
      body: "Confira cor, material, tamanho e estampa na ficha. Ao confirmar, o tecido sai do estoque — este passo não desfaz sozinho.",
      confirmLabel: "Sim, ir para produção",
      warnStock: true,
    };
  }
  if (from === "em_producao" && to === "pronto") {
    return {
      to,
      title: "Marcar pedido como pronto?",
      body: "A peça sai da bancada e o balcão passa a tratar como pronta para o cliente retirar.",
      confirmLabel: "Sim, está pronto",
      warnStock: false,
    };
  }
  if (from === "em_producao" && to === "recebido") {
    return {
      to,
      title: "Devolver para a fila de recebido?",
      body: "Use só se a costura ainda não começou. O tecido volta para o estoque.",
      confirmLabel: "Sim, devolver",
      warnStock: true,
    };
  }
  if (from === "pronto" && to === "em_producao") {
    return {
      to,
      title: "Reabrir este pedido na produção?",
      body: "Sai da prateleira de prontos e volta para a bancada. O estoque não é alterado.",
      confirmLabel: "Sim, reabrir",
      warnStock: false,
    };
  }
  if (to === "retirado") {
    return {
      to,
      title: "Registrar retirada?",
      body: "Informe quem levou e como pagou. Depois disso o pedido sai da fila e não volta.",
      confirmLabel: "Continuar",
      warnStock: false,
    };
  }
  return {
    to,
    title: "Confirmar esta ação?",
    body: "Esta ação altera o pedido. Confira a ficha antes de confirmar.",
    confirmLabel: "Confirmar",
    warnStock: false,
  };
}
