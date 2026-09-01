import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextFont, parseA11y } from "./a11y.ts";

describe("esquemas de acessibilidade", () => {
  it("aumenta e diminui a fonte sem passar de 1 a 3", () => {
    assert.equal(nextFont(1, 1), 2);
    assert.equal(nextFont(2, 1), 3);
    assert.equal(nextFont(3, 1), 3);
    assert.equal(nextFont(1, -1), 1);
    assert.equal(nextFont(2, -1), 1);
  });

  it("ignora valor gravado inválido", () => {
    assert.deepEqual(parseA11y(null), {
      contrast: "padrao",
      font: 1,
      links: "padrao",
    });
    assert.deepEqual(parseA11y({ contrast: "alto", font: 3, links: "underline" }), {
      contrast: "alto",
      font: 3,
      links: "underline",
    });
    assert.deepEqual(parseA11y({ contrast: "neon", font: 99, links: "none" }), {
      contrast: "padrao",
      font: 1,
      links: "padrao",
    });
  });
});
