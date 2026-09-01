import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAccess, canAccessAny, navFor, ROLE_GUIDE } from "./roles.ts";

describe("perfis de acesso", () => {
  it("atendimento lança pedido e não mexe no estoque", () => {
    assert.equal(canAccess("atendimento", "pedidos-novo"), true);
    assert.equal(canAccess("atendimento", "clientes"), true);
    assert.equal(canAccess("atendimento", "estoque"), false);
    assert.equal(canAccess("atendimento", "producao"), false);
    assert.equal(canAccess("atendimento", "equipe"), false);
    assert.equal(canAccess("atendimento", "relatorios"), false);
  });

  it("produção vê a fila e não cadastra cliente", () => {
    assert.equal(canAccess("producao", "producao"), true);
    assert.equal(canAccess("producao", "painel"), true);
    assert.equal(canAccess("producao", "clientes"), false);
    assert.equal(canAccess("producao", "relatorios"), false);
    assert.equal(canAccess("producao", "estoque"), false);
    assert.equal(canAccess("producao", "equipe"), false);
  });

  it("admin acessa tudo", () => {
    for (const page of navFor("admin")) {
      assert.equal(canAccess("admin", page), true);
    }
    assert.ok(navFor("admin").includes("equipe"));
    assert.ok(navFor("admin").includes("catalogo"));
    assert.equal(canAccess("atendimento", "catalogo"), false);
  });

  it("cada perfil tem o que pode e o que não pode", () => {
    for (const role of ["admin", "atendimento", "producao"] as const) {
      assert.ok(ROLE_GUIDE[role].can.length >= 3);
      assert.ok(ROLE_GUIDE[role].cannot.length >= 1);
    }
    assert.ok(ROLE_GUIDE.atendimento.cannot.some((t) => /produção/i.test(t)));
    assert.ok(ROLE_GUIDE.producao.cannot.some((t) => /cliente/i.test(t)));
  });

  it("API aceita qualquer uma das páginas do perfil", () => {
    assert.equal(canAccessAny("producao", ["pedidos", "producao"]), true);
    assert.equal(canAccessAny("atendimento", ["estoque", "equipe"]), false);
    assert.equal(canAccessAny("admin", ["estoque"]), true);
  });
});
