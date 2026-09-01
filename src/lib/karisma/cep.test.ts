import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  brasilApiCepUrl,
  formatCep,
  isValidCep,
  parseCepResponse,
  viaCepUrl,
} from "./cep.ts";

describe("CEP / ViaCEP", () => {
  it("formata e valida", () => {
    assert.equal(formatCep("14960000"), "14960-000");
    assert.equal(isValidCep("14960-000"), true);
    assert.equal(isValidCep("123"), false);
  });

  it("monta a URL da API ViaCEP", () => {
    assert.equal(
      viaCepUrl("14960-000"),
      "https://viacep.com.br/ws/14960000/json/",
    );
    assert.equal(
      brasilApiCepUrl("14960-000"),
      "https://brasilapi.com.br/api/cep/v1/14960000",
    );
  });

  it("lê resposta válida da ViaCEP", () => {
    const addr = parseCepResponse({
      cep: "14960-000",
      logradouro: "Avenida Coronel Junqueira",
      bairro: "Centro",
      localidade: "Novo Horizonte",
      uf: "SP",
    });
    assert.ok(addr);
    assert.equal(addr.city, "Novo Horizonte");
    assert.equal(addr.state, "SP");
    assert.equal(addr.street, "Avenida Coronel Junqueira");
  });

  it("lê resposta da BrasilAPI (CEP genérico da cidade)", () => {
    const addr = parseCepResponse({
      cep: "14960000",
      state: "SP",
      city: "Novo Horizonte",
      neighborhood: "",
      street: "",
    });
    assert.ok(addr);
    assert.equal(addr.city, "Novo Horizonte");
    assert.equal(addr.cep, "14960-000");
  });

  it("rejeita CEP inexistente (erro: true)", () => {
    assert.equal(parseCepResponse({ erro: true }), null);
    assert.equal(parseCepResponse({ erro: "true" }), null);
    assert.equal(parseCepResponse({}), null);
  });
});
