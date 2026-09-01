export const PAYMENT_METHODS = [
  "pix",
  "dinheiro",
  "debito",
  "credito",
  "transferencia",
  "combinado",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  transferencia: "Transferência",
  combinado: "A combinado / fiado",
};

export const RECEIPT_MAX_BYTES = 800_000;
export const RECEIPT_MAX_CHARS = 1_200_000;

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export function paymentLabel(value: string): string {
  return isPaymentMethod(value) ? PAYMENT_LABEL[value] : value;
}

export function pickupIssues(input: {
  to: string;
  pickupName?: string;
  paymentMethod?: string;
}): string[] {
  if (input.to !== "retirado") return [];
  const issues: string[] = [];
  if (!input.pickupName || input.pickupName.trim().length < 2) {
    issues.push("Informe quem retirou o pedido.");
  }
  if (!input.paymentMethod || !isPaymentMethod(input.paymentMethod)) {
    issues.push("Informe a forma de pagamento.");
  }
  return issues;
}
