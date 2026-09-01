import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandSizeRows,
  groupOrderItems,
  groupStockNeeds,
  orderItemsSummary,
  orderLineLabel,
  totalPieces,
} from "./order-items.ts";
import type { OrderItem } from "./types.ts";

function item(over: Partial<OrderItem> & Pick<OrderItem, "piece" | "size" | "quantity">): OrderItem {
  return {
    id: over.id ?? 1,
    color: "Preto",
    materialId: 1,
    materialName: "Malha PV 30/1",
    materialUnit: "m",
    personalization: "Mercado São João",
    printName: "Logo bordado no peito",
    technique: "bordado",
    printPlace: "peito_esquerdo",
    artworkName: "",
    hasArtwork: false,
    ...over,
  };
}

describe("pedido com vários itens", () => {
  it("resume um item como a ficha antiga", () => {
    assert.equal(
      orderLineLabel({ quantity: 1, piece: "Camisa polo", size: "M", color: "Preto" }),
      "1× Camisa polo M · Preto",
    );
  });

  it("mesmo modelo em tamanhos diferentes vira uma linha só", () => {
    const text = orderItemsSummary([
      { quantity: 1, piece: "Camisa polo", size: "M", color: "Preto" },
      { quantity: 2, piece: "Camisa polo", size: "G", color: "Preto" },
    ]);
    assert.match(text, /Camisa polo/);
    assert.match(text, /1× M/);
    assert.match(text, /2× G/);
    assert.match(text, /3 peças/);
  });

  it("peças diferentes entram no mesmo pedido", () => {
    const text = orderItemsSummary([
      { quantity: 1, piece: "Camisa polo", size: "M", color: "Preto" },
      { quantity: 2, piece: "Camisa polo", size: "G", color: "Preto" },
      { quantity: 1, piece: "Calça operacional", size: "G", color: "Caqui" },
    ]);
    assert.match(text, /3 itens/);
    assert.match(text, /4 peças/);
    assert.match(text, /Camisa polo/);
    assert.match(text, /Calça operacional/);
  });

  it("expande tamanhos da mesma peça em linhas de produção", () => {
    const rows = expandSizeRows({
      piece: "Camisa polo",
      color: "Preto",
      materialId: 1,
      printName: "Logo bordado no peito",
      sizes: [
        { size: "M", quantity: 1 },
        { size: "G", quantity: 2 },
        { size: "GG", quantity: 0 },
      ],
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.size, "M");
    assert.equal(rows[1]?.quantity, 2);
    assert.equal(totalPieces(rows), 3);
  });

  it("agrupa a ficha por peça + cor + estampa", () => {
    const groups = groupOrderItems([
      item({ id: 1, piece: "Camisa polo", size: "M", quantity: 1 }),
      item({ id: 2, piece: "Camisa polo", size: "G", quantity: 2 }),
      item({
        id: 3,
        piece: "Calça operacional",
        size: "G",
        quantity: 1,
        color: "Caqui",
        materialName: "Brim 100% algodão",
        printName: "Sem estampa",
        technique: "nenhuma",
        printPlace: "nenhum",
        personalization: "",
      }),
    ]);
    assert.equal(groups.length, 2);
    const polo = groups.find((g) => g.piece === "Camisa polo");
    assert.equal(polo?.total, 3);
    assert.equal(polo?.sizes.length, 2);
    assert.equal(groups.find((g) => g.piece === "Calça operacional")?.total, 1);
  });

  it("soma o tecido de vários itens do mesmo material", () => {
    const needs = groupStockNeeds(
      [
        { materialId: 1, quantity: 1 },
        { materialId: 1, quantity: 2 },
        { materialId: 2, quantity: 1 },
      ],
      [
        {
          id: 1,
          name: "Malha PV 30/1",
          unit: "m",
          quantity: 180,
          minQuantity: 40,
          qtyPerPiece: 1.2,
        },
        {
          id: 2,
          name: "Brim 100% algodão",
          unit: "m",
          quantity: 95,
          minQuantity: 30,
          qtyPerPiece: 1.4,
        },
      ],
    );
    const pv = needs.find((n) => n.materialId === 1);
    const brim = needs.find((n) => n.materialId === 2);
    assert.equal(pv?.used, 3.6);
    assert.equal(brim?.used, 1.4);
  });
});
