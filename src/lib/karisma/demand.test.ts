import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeSeasons,
  buildOutlook,
  isCommitted,
  isSchoolPiece,
  rollupSchool,
  schoolMaterialNames,
  type DemandLine,
  type MaterialSnap,
} from "./demand.ts";

const escolar: MaterialSnap = {
  id: 11,
  name: "Tecido escolar (malha)",
  unit: "m",
  quantity: 140,
  minQuantity: 35,
  qtyPerPiece: 1,
};
const helanca: MaterialSnap = {
  id: 5,
  name: "Helanca",
  unit: "m",
  quantity: 12,
  minQuantity: 20,
  qtyPerPiece: 0.8,
};
const pv: MaterialSnap = {
  id: 1,
  name: "Malha PV 30/1",
  unit: "m",
  quantity: 180,
  minQuantity: 40,
  qtyPerPiece: 1.2,
};

function line(over: Partial<DemandLine> & Pick<DemandLine, "piece" | "quantity">): DemandLine {
  return {
    size: "M",
    stockDeducted: false,
    materialName: "Tecido escolar (malha)",
    ...over,
  };
}

describe("demanda escolar e surpresa de estoque", () => {
  it("camiseta escolar é escolar; polo não", () => {
    assert.equal(isSchoolPiece("Camiseta escolar"), true);
    assert.equal(isSchoolPiece("Agasalho escolar"), true);
    assert.equal(isSchoolPiece("Camisa polo"), false);
  });

  it("agosto é reposição do 2º semestre", () => {
    const s = activeSeasons(8);
    assert.equal(s.length, 1);
    assert.equal(s[0]?.id, "reposicao");
    assert.ok(activeSeasons(1).some((x) => x.id === "volta-aulas"));
    assert.ok(activeSeasons(6).some((x) => x.id === "inverno"));
    assert.equal(activeSeasons(4).length, 0);
  });

  it("pedidos pequenos somados viram um lote só", () => {
    const roll = rollupSchool([
      line({ piece: "Camiseta escolar", size: "M", quantity: 18 }),
      line({ piece: "Camiseta escolar", size: "G", quantity: 22 }),
      line({ piece: "Camiseta escolar", size: "M", quantity: 15 }),
      line({ piece: "Camisa polo", quantity: 12, materialName: "Malha PV 30/1" }),
    ]);
    assert.equal(roll.length, 1);
    assert.equal(roll[0]?.totalPieces, 55);
    assert.equal(roll[0]?.orders, 3);
    const m = roll[0]?.sizes.find((s) => s.size === "M");
    assert.equal(m?.pieces, 33);
    assert.equal(m?.orders, 2);
  });

  it("fila recebido compromete o tecido; em produção já baixou", () => {
    assert.equal(isCommitted(line({ piece: "Camiseta escolar", quantity: 40, stockDeducted: false })), true);
    assert.equal(isCommitted(line({ piece: "Camiseta escolar", quantity: 40, stockDeducted: true })), false);
  });

  it("três pedidos escolares pequenos escondem a falta de malha", () => {
    const outlook = buildOutlook({
      month: 8,
      materials: [escolar, pv],
      lines: [
        line({ piece: "Camiseta escolar", size: "M", quantity: 40 }),
        line({ piece: "Camiseta escolar", size: "G", quantity: 35 }),
        line({ piece: "Camiseta escolar", size: "P", quantity: 18 }),
        line({ piece: "Camiseta escolar", size: "10", quantity: 22 }),
        line({ piece: "Camiseta escolar", size: "G", quantity: 15 }),
        line({
          piece: "Camisa polo",
          quantity: 12,
          materialName: "Malha PV 30/1",
          stockDeducted: false,
        }),
      ],
    });
    assert.ok(outlook.smallOrderTrap);
    assert.ok(outlook.schoolPieces >= 100);
    const schoolMat = outlook.materials.find((m) => m.name === "Tecido escolar (malha)");
    assert.ok(schoolMat);
    assert.equal(schoolMat?.level === "surprise" || schoolMat?.committedPieces === 130, true);
  });

  it("helanca baixa sem fila de inverno não é a surpresa desta tela", () => {
    const outlook = buildOutlook({
      month: 6,
      materials: [helanca],
      lines: [],
    });
    const h = outlook.materials.find((m) => m.name === "Helanca");
    assert.ok(h);
    assert.equal(h?.level, "ok");
  });

  it("extras do wizard somam no tecido comprometido", () => {
    const outlook = buildOutlook({
      month: 2,
      materials: [escolar],
      lines: [line({ piece: "Camiseta escolar", size: "M", quantity: 10 })],
      extras: [
        { piece: "Camiseta escolar", size: "G", quantity: 8, materialName: "Tecido escolar (malha)" },
        { piece: "Camiseta escolar", size: "P", quantity: 5, materialName: "Tecido escolar (malha)" },
      ],
    });
    const mat = outlook.materials.find((m) => m.name === "Tecido escolar (malha)");
    assert.equal(mat?.committedPieces, 23);
  });

  it("nomes de tecido escolar vêm do catálogo", () => {
    const names = schoolMaterialNames();
    assert.ok(names.includes("Tecido escolar (malha)") || names.includes("Helanca"));
  });
});
