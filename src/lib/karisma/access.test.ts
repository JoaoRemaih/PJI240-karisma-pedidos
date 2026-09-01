import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSeeCustomerContact,
  canSeeStockDetails,
  deactivationError,
  decideActivation,
  passwordIsStrong,
  redactOrderForRole,
} from "./access.ts";
import type { Order } from "./types.ts";

function order(over: Partial<Order> = {}): Order {
  return {
    id: 1,
    customerId: 9,
    customerName: "Colégio Horizonte",
    customerPhone: "(17) 3542-1100",
    piece: "Camisa polo",
    size: "G",
    color: "Preto",
    materialId: 1,
    materialName: "Malha PV 30/1",
    materialUnit: "m",
    quantity: 12,
    personalization: "",
    printName: "Logo bordado",
    technique: "bordado",
    printPlace: "peito",
    dueDate: "2026-09-10",
    notes: "",
    status: "recebido",
    createdBy: "u1",
    createdAt: "",
    updatedAt: "",
    stockDeducted: false,
    overdue: false,
    pickupName: "",
    paymentMethod: "",
    pickupAt: "",
    receiptName: "",
    hasReceipt: false,
    artworkName: "",
    hasArtwork: false,
    items: [],
    ...over,
  };
}

describe("ativação de acesso", () => {
  it("primeira pessoa da loja vira administração", () => {
    assert.deepEqual(decideActivation({ staffCount: 0, match: null }), {
      ok: true,
      firstAccess: true,
    });
  });

  it("e-mail solto não entra depois que a equipe existe", () => {
    assert.deepEqual(decideActivation({ staffCount: 3, match: null }), {
      ok: false,
      reason: "not_invited",
    });
  });

  it("e-mail liberado e ativo pode ativar", () => {
    assert.deepEqual(
      decideActivation({ staffCount: 2, match: { active: true } }),
      { ok: true, firstAccess: false },
    );
  });

  it("e-mail desativado não reativa sozinho", () => {
    assert.deepEqual(
      decideActivation({ staffCount: 2, match: { active: false } }),
      { ok: false, reason: "disabled" },
    );
  });
});

describe("senha", () => {
  it("exige 8 caracteres com letra e número", () => {
    assert.equal(passwordIsStrong("karisma1"), true);
    assert.equal(passwordIsStrong("curta1"), false);
    assert.equal(passwordIsStrong("semnumero"), false);
    assert.equal(passwordIsStrong("12345678"), false);
  });
});

describe("dados por perfil", () => {
  it("produção não vê telefone; atendimento vê", () => {
    assert.equal(canSeeCustomerContact("producao"), false);
    assert.equal(canSeeCustomerContact("atendimento"), true);
    const paid = order({
      paymentMethod: "pix",
      pickupName: "Maria",
      hasReceipt: true,
      receiptName: "pix.png",
    });
    assert.equal(redactOrderForRole(order(), "producao").customerPhone, "");
    assert.equal(redactOrderForRole(paid, "producao").paymentMethod, "");
    assert.equal(redactOrderForRole(paid, "producao").hasReceipt, false);
    assert.equal(
      redactOrderForRole(order(), "atendimento").customerPhone,
      "(17) 3542-1100",
    );
  });

  it("só admin vê detalhe de estoque", () => {
    assert.equal(canSeeStockDetails("admin"), true);
    assert.equal(canSeeStockDetails("producao"), false);
    assert.equal(canSeeStockDetails("atendimento"), false);
  });
});

describe("desativar equipe", () => {
  it("bloqueia auto-desativar e o último admin", () => {
    assert.equal(
      deactivationError({
        actorId: 1,
        targetId: 1,
        targetRole: "admin",
        currentlyActive: true,
        nextActive: false,
        activeAdminCount: 2,
      }),
      "Você não pode desativar a si mesmo.",
    );
    assert.equal(
      deactivationError({
        actorId: 1,
        targetId: 2,
        targetRole: "admin",
        currentlyActive: true,
        nextActive: false,
        activeAdminCount: 1,
      }),
      "Não é possível desativar o último administrador.",
    );
    assert.equal(
      deactivationError({
        actorId: 1,
        targetId: 3,
        targetRole: "atendimento",
        currentlyActive: true,
        nextActive: false,
        activeAdminCount: 1,
      }),
      null,
    );
  });
});
