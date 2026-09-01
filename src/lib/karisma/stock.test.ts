import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDelta, isBelowMin } from "./stock.ts";

describe("estoque", () => {
  it("baixa e alerta abaixo do mínimo", () => {
    const r = applyDelta(30, -12, 25);
    assert.equal(r.next, 18);
    assert.equal(r.belowMin, true);
    assert.equal(r.insufficient, false);
  });

  it("marca insuficiente se ficaria negativo", () => {
    const r = applyDelta(5, -8, 10);
    assert.equal(r.next, -3);
    assert.equal(r.insufficient, true);
    assert.equal(r.belowMin, true);
  });

  it("devolução recompõe o saldo", () => {
    const r = applyDelta(18, 12, 25);
    assert.equal(r.next, 30);
    assert.equal(r.belowMin, false);
  });

  it("isBelowMin compara estritamente", () => {
    assert.equal(isBelowMin(25, 25), false);
    assert.equal(isBelowMin(24.99, 25), true);
  });
});
