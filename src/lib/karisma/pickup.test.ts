import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PAYMENT_METHODS, RECEIPT_MAX_CHARS, paymentLabel, pickupIssues } from "./pickup.ts";

describe("baixa de retirada", () => {
  it("exige quem retirou e a forma de pagamento", () => {
    assert.ok(pickupIssues({ to: "retirado" }).length >= 2);
    assert.deepEqual(
      pickupIssues({ to: "retirado", pickupName: "Maria Souza", paymentMethod: "pix" }),
      [],
    );
  });

  it("não exige baixa em outros status", () => {
    assert.deepEqual(pickupIssues({ to: "em_producao" }), []);
  });

  it("limite do comprovante cabe em um pedido", () => {
    assert.ok(RECEIPT_MAX_CHARS > 100_000);
  });

  it("nomeia as formas de pagamento da loja", () => {
    assert.ok(PAYMENT_METHODS.includes("pix"));
    assert.equal(paymentLabel("pix"), "Pix");
  });
});
