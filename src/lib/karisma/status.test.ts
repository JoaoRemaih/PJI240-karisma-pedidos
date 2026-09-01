import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransition,
  consumptionFor,
  nextStatuses,
  shouldDeductStock,
  shouldRestock,
  transitionNotice,
} from "./status.ts";

describe("transições de pedido", () => {
  it("atendimento não manda para produção", () => {
    assert.equal(canTransition("recebido", "em_producao", "atendimento"), false);
  });

  it("produção avança recebido → em produção → pronto", () => {
    assert.equal(canTransition("recebido", "em_producao", "producao"), true);
    assert.equal(canTransition("em_producao", "pronto", "producao"), true);
    assert.equal(canTransition("pronto", "retirado", "producao"), false);
  });

  it("atendimento marca retirada", () => {
    assert.equal(canTransition("pronto", "retirado", "atendimento"), true);
    assert.equal(canTransition("em_producao", "pronto", "atendimento"), false);
  });

  it("admin pode todas as transições válidas", () => {
    assert.equal(canTransition("recebido", "em_producao", "admin"), true);
    assert.equal(canTransition("em_producao", "pronto", "admin"), true);
    assert.equal(canTransition("pronto", "retirado", "admin"), true);
    assert.equal(canTransition("pronto", "em_producao", "admin"), true);
  });

  it("não pula etapas", () => {
    assert.equal(canTransition("recebido", "pronto", "admin"), false);
    assert.equal(canTransition("recebido", "retirado", "admin"), false);
    assert.equal(canTransition("retirado", "recebido", "admin"), false);
  });

  it("lista próximos status por perfil", () => {
    assert.deepEqual(nextStatuses("pronto", "atendimento"), ["retirado"]);
    assert.deepEqual(nextStatuses("pronto", "producao"), []);
    assert.deepEqual(nextStatuses("retirado", "admin"), []);
  });
});

describe("efeito no estoque", () => {
  it("baixa só ao entrar em produção", () => {
    assert.equal(shouldDeductStock("recebido", "em_producao"), true);
    assert.equal(shouldDeductStock("em_producao", "pronto"), false);
    assert.equal(shouldDeductStock("pronto", "retirado"), false);
  });

  it("devolve ao voltar para recebido", () => {
    assert.equal(shouldRestock("em_producao", "recebido"), true);
    assert.equal(shouldRestock("pronto", "em_producao"), false);
  });

  it("consumo arredonda em 2 casas", () => {
    assert.equal(consumptionFor(12, 1.2), 14.4);
    assert.equal(consumptionFor(0, 1.2), 0);
    assert.equal(consumptionFor(-3, 1), 0);
  });
});

describe("confirmação antes da ação", () => {
  it("avisar baixa de estoque ao ir para produção", () => {
    const n = transitionNotice("recebido", "em_producao");
    assert.equal(n.warnStock, true);
    assert.match(n.body, /estoque/i);
    assert.equal(n.confirmLabel, "Sim, ir para produção");
  });

  it("pronto não mexe no estoque", () => {
    const n = transitionNotice("em_producao", "pronto");
    assert.equal(n.warnStock, false);
    assert.match(n.title, /pronto/i);
  });

  it("devolver avisa que o tecido volta", () => {
    const n = transitionNotice("em_producao", "recebido");
    assert.equal(n.warnStock, true);
    assert.match(n.body, /estoque/i);
  });

  it("retirada deixa claro que não volta", () => {
    const n = transitionNotice("pronto", "retirado");
    assert.match(n.body, /não volta/i);
  });
});
