import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPiece,
  getPrint,
  printsForPiece,
  sizesForPiece,
  validateOrderSpec,
  describeCustomization,
  PIECE_CATALOG,
  PRINT_CATALOG,
} from "./catalog.ts";

function validPolo(over: Partial<Parameters<typeof validateOrderSpec>[0]> = {}) {
  return validateOrderSpec({
    piece: "Camisa polo",
    size: "M",
    color: "Preto",
    materialName: "Malha PV 30/1",
    quantity: 12,
    printName: "Logo bordado no peito",
    technique: "bordado",
    printPlace: "peito_esquerdo",
    personalization: "Mercado São João",
    dueDate: "2099-01-15",
    ...over,
  });
}

describe("catálogo padrão da loja", () => {
  it("toda peça tem tecido de verdade, nunca avulso", () => {
    const avulsos = ["Botão", "Linha (cone)", "Zíper 20 cm", "Elástico", "Gola polo"];
    for (const piece of PIECE_CATALOG) {
      assert.ok(piece.materials.length >= 1, piece.name);
      for (const mat of piece.materials) {
        assert.equal(avulsos.includes(mat), false, `${piece.name} → ${mat}`);
      }
    }
  });

  it("polo não aceita brim nem dry-fit", () => {
    const piece = getPiece("Camisa polo");
    assert.ok(piece);
    assert.deepEqual([...piece.materials], ["Malha PV 30/1"]);
    assert.ok(validPolo({ materialName: "Brim 100% algodão" }).length > 0);
    assert.ok(validPolo({ materialName: "Dry-fit" }).length > 0);
  });

  it("calça operacional só usa brim", () => {
    const errors = validateOrderSpec({
      piece: "Calça operacional",
      size: "G",
      color: "Caqui",
      materialName: "Malha PV 30/1",
      quantity: 10,
      printName: "Sem estampa",
      technique: "nenhuma",
      printPlace: "nenhum",
      personalization: "",
      dueDate: "2099-01-15",
    });
    assert.ok(errors.some((e) => e.includes("Malha PV")));
  });

  it("camiseta escolar não usa tamanho de polo inexistente e aceita infantil", () => {
    const piece = getPiece("Camiseta escolar")!;
    assert.ok(sizesForPiece(piece).includes("8"));
    assert.ok(sizesForPiece(piece).includes("M"));
    const polo = getPiece("Camisa polo")!;
    assert.equal(sizesForPiece(polo).includes("8"), false);
  });

  it("cor vazia ou inválida é recusada; cor fora da lista da peça entra se tiver nome", () => {
    assert.ok(validPolo({ color: "" }).some((e) => /cor/i.test(e)));
    assert.ok(validPolo({ color: "x" }).some((e) => /cor/i.test(e)));
    assert.deepEqual(validPolo({ color: "Azul petróleo" }), []);
    assert.deepEqual(validPolo({ color: "Verde limão" }), []);
  });

  it("brasão escolar não aparece em polo", () => {
    const polo = getPiece("Camisa polo")!;
    const names = printsForPiece(polo).map((p) => p.name);
    assert.equal(names.includes("Brasão escolar no peito"), false);
    assert.ok(names.includes("Logo bordado no peito"));
    const escolar = getPiece("Camiseta escolar")!;
    assert.ok(printsForPiece(escolar).some((p) => p.id === "brasao-escolar"));
  });

  it("estampa de logo trava técnica e local — não deixa trocar", () => {
    const errors = validPolo({
      technique: "silk",
      printPlace: "costas",
    });
    assert.ok(errors.length > 0);
    assert.equal(validPolo().length, 0);
  });

  it("logo exige o texto da marca", () => {
    const errors = validPolo({ personalization: "" });
    assert.ok(errors.some((e) => /marca|personalização|Preencha/i.test(e)));
  });

  it("sem estampa não leva texto", () => {
    const errors = validPolo({
      printName: "Sem estampa",
      technique: "nenhuma",
      printPlace: "nenhum",
      personalization: "João",
    });
    assert.ok(errors.some((e) => /sem estampa/i.test(e)));
  });

  it("peça sem estampa válida passa limpa", () => {
    const errors = validPolo({
      printName: "Sem estampa",
      technique: "nenhuma",
      printPlace: "nenhum",
      personalization: "",
    });
    assert.deepEqual(errors, []);
  });

  it("Outro exige técnica, local e texto", () => {
    const empty = validPolo({
      printName: "Outro (descrever tudo)",
      technique: "nenhuma",
      printPlace: "nenhum",
      personalization: "",
    });
    assert.ok(empty.length >= 2);
    const ok = validPolo({
      printName: "Outro (descrever tudo)",
      technique: "silk",
      printPlace: "manga",
      personalization: "Logo 8 cm na manga direita",
    });
    assert.deepEqual(ok, []);
  });

  it("nome e número só na linha esportiva", () => {
    const dry = getPiece("Camisa dry-fit")!;
    assert.ok(printsForPiece(dry).some((p) => p.id === "nome-numero"));
    assert.ok(
      validateOrderSpec({
        piece: "Camisa polo",
        size: "M",
        color: "Preto",
        quantity: 1,
        printName: "Nome e número nas costas",
        technique: "sublimacao",
        printPlace: "costas",
        personalization: "SILVA 10",
        dueDate: "2099-01-15",
      }).some((e) => /estampa/i.test(e)),
    );
  });

  it("prazo no passado é recusado", () => {
    const errors = validPolo({ dueDate: "2001-01-01" });
    assert.ok(errors.some((e) => /prazo|passado/i.test(e)));
  });

  it("ficha descreve estampa, técnica, local e texto", () => {
    const text = describeCustomization({
      printName: "Logo bordado no peito",
      technique: "bordado",
      printPlace: "peito_esquerdo",
      personalization: "Mercado São João",
    });
    assert.match(text, /Logo bordado/);
    assert.match(text, /Bordado/);
    assert.match(text, /Peito esquerdo/);
    assert.match(text, /Mercado São João/);
    assert.equal(describeCustomization({ printName: "Sem estampa" }), "Sem estampa");
  });

  it("sem-estampa existe e vale para qualquer peça", () => {
    assert.ok(getPrint("sem-estampa"));
    for (const piece of PIECE_CATALOG) {
      assert.ok(
        printsForPiece(piece).some((p) => p.id === "sem-estampa"),
        piece.name,
      );
    }
  });

  it("peça cadastrada pelo admin entra no pedido com o catálogo vivo", () => {
    const catalog = {
      pieces: [
        {
          name: "Bermuda escolar",
          category: "escolar" as const,
          image: "/uniforms/esc_01.png",
          sizeSet: "ambos" as const,
          colors: ["Azul marinho"],
          materials: ["Tecido escolar (malha)"],
          techniques: ["nenhuma" as const, "silk" as const],
        },
      ],
      prints: [PRINT_CATALOG[0]!],
    };
    const errors = validateOrderSpec(
      {
        piece: "Bermuda escolar",
        size: "8",
        color: "Azul marinho",
        materialName: "Tecido escolar (malha)",
        quantity: 20,
        printName: "Sem estampa",
        technique: "nenhuma",
        printPlace: "nenhum",
        personalization: "",
        dueDate: "2099-01-15",
      },
      catalog,
    );
    assert.deepEqual(errors, []);
    const rejected = validateOrderSpec({
      piece: "Bermuda escolar",
      size: "8",
      color: "Azul marinho",
      quantity: 20,
      printName: "Sem estampa",
      technique: "nenhuma",
      printPlace: "nenhum",
      personalization: "",
      dueDate: "2099-01-15",
    });
    assert.ok(rejected.some((e) => /catálogo/i.test(e)));
  });
});
