import type { Order, Role } from "./types";

export type ActivationDecision =
  | { ok: true; firstAccess: boolean }
  | { ok: false; reason: "not_invited" | "disabled" };

/** Primeiro acesso (loja vazia) ou e-mail já liberado e ativo em Equipe. */
export function decideActivation(input: {
  staffCount: number;
  match: { active: boolean } | null;
}): ActivationDecision {
  if (input.staffCount <= 0) return { ok: true, firstAccess: true };
  if (!input.match) return { ok: false, reason: "not_invited" };
  if (!input.match.active) return { ok: false, reason: "disabled" };
  return { ok: true, firstAccess: false };
}

export function passwordIsStrong(password: string): boolean {
  return password.length >= 8 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
}

export function canSeeCustomerContact(role: Role): boolean {
  return role === "admin" || role === "atendimento";
}

export function canSeeStockDetails(role: Role): boolean {
  return role === "admin";
}

/** Produção vê a ficha da peça, não telefone nem pagamento. */
export function redactOrderForRole(order: Order, role: Role): Order {
  if (canSeeCustomerContact(role)) return order;
  return {
    ...order,
    customerPhone: "",
    pickupName: "",
    paymentMethod: "",
    pickupAt: "",
    receiptName: "",
    hasReceipt: false,
  };
}

export function removalError(input: {
  actorId: number;
  targetId: number;
  targetRole: Role;
  targetActive: boolean;
  activeAdminCount: number;
}): string | null {
  if (input.actorId === input.targetId) {
    return "Você não pode remover a si mesmo da equipe.";
  }
  if (input.targetActive && input.targetRole === "admin" && input.activeAdminCount <= 1) {
    return "Não é possível remover o último administrador.";
  }
  return null;
}

export function deactivationError(input: {
  actorId: number;
  targetId: number;
  targetRole: Role;
  currentlyActive: boolean;
  nextActive: boolean;
  activeAdminCount: number;
}): string | null {
  if (input.actorId === input.targetId) {
    return "Você não pode desativar a si mesmo.";
  }
  if (
    input.currentlyActive &&
    !input.nextActive &&
    input.targetRole === "admin" &&
    input.activeAdminCount <= 1
  ) {
    return "Não é possível desativar o último administrador.";
  }
  return null;
}
