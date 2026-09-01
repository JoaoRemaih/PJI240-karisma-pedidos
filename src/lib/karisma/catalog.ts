/**
 * Padrão Karisma — o que pode e o que não pode ir no pedido.
 * Quem lança não digita combinação livre: escolhe do catálogo.
 */

export const ADULT_SIZES = ["PP", "P", "M", "G", "GG", "XG", "EG"] as const;
export const KIDS_SIZES = ["2", "4", "6", "8", "10", "12", "14", "16"] as const;
export const SIZES = [...ADULT_SIZES, ...KIDS_SIZES] as const;

export const COLORS = [
  "Branco",
  "Preto",
  "Azul marinho",
  "Azul royal",
  "Verde limão",
  "Verde",
  "Cinza",
  "Vermelho",
  "Bordô",
  "Caqui",
  "Amarelo",
] as const;

export type SizeSet = "adulto" | "infantil" | "ambos";
export type PieceCategory =
  | "corporativo"
  | "escolar"
  | "operacional"
  | "esportivo"
  | "evento";

export type Technique = "nenhuma" | "bordado" | "silk" | "sublimacao" | "transfer";
export type Place =
  | "nenhum"
  | "peito_esquerdo"
  | "peito_direito"
  | "costas"
  | "manga"
  | "gola";

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  nenhuma: "Sem personalização",
  bordado: "Bordado",
  silk: "Silk (serigrafia)",
  sublimacao: "Sublimação",
  transfer: "Transfer",
};

export const PLACE_LABEL: Record<Place, string> = {
  nenhum: "—",
  peito_esquerdo: "Peito esquerdo",
  peito_direito: "Peito direito",
  costas: "Costas",
  manga: "Manga",
  gola: "Gola",
};

export const CATEGORY_LABEL: Record<PieceCategory, string> = {
  corporativo: "Corporativo",
  escolar: "Escolar",
  operacional: "Operacional",
  esportivo: "Esportivo",
  evento: "Evento",
};

export const PIECE_CATEGORIES: PieceCategory[] = [
  "corporativo",
  "escolar",
  "operacional",
  "esportivo",
  "evento",
];

export const SIZE_SET_LABEL: Record<SizeSet, string> = {
  adulto: "Adulto",
  infantil: "Infantil",
  ambos: "Adulto e infantil",
};

export const TECHNIQUES = Object.keys(TECHNIQUE_LABEL) as Technique[];
export const PLACES = Object.keys(PLACE_LABEL) as Place[];

/** Fotos da loja para o admin escolher no catálogo. */
export const UNIFORM_IMAGES = [
  "/uniforms/uni_01.jpg",
  "/uniforms/uni_02.jpg",
  "/uniforms/uni_03.jpg",
  "/uniforms/uni_04.jpg",
  "/uniforms/esc_01.png",
  "/uniforms/esc_02.png",
  "/uniforms/esc_03.png",
  "/uniforms/escolar.png",
  "/uniforms/ev_01.jpg",
  "/uniforms/ev_02.jpg",
  "/uniforms/ev_03.jpg",
  "/uniforms/ev_04.jpg",
] as const;


export type PieceSpec = {
  name: string;
  category: PieceCategory;
  image: string;
  sizeSet: SizeSet;
  colors: readonly string[];
  /** Nomes exatamente como no estoque. Só tecido da peça — nunca avulso. */
  materials: readonly string[];
  techniques: readonly Technique[];
};

export const PIECE_CATALOG: readonly PieceSpec[] = [
  {
    name: "Camisa polo",
    category: "corporativo",
    image: "/uniforms/uni_01.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Preto", "Azul marinho", "Azul royal", "Cinza", "Vermelho", "Bordô"],
    materials: ["Malha PV 30/1"],
    techniques: ["nenhuma", "bordado", "silk", "transfer"],
  },
  {
    name: "Camiseta",
    category: "corporativo",
    image: "/uniforms/uni_04.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Preto", "Azul marinho", "Azul royal", "Cinza", "Verde", "Vermelho"],
    materials: ["Malha PV 30/1"],
    techniques: ["nenhuma", "silk", "sublimacao", "transfer"],
  },
  {
    name: "Camiseta escolar",
    category: "escolar",
    image: "/uniforms/esc_01.png",
    sizeSet: "ambos",
    colors: ["Branco", "Azul marinho", "Azul royal", "Cinza"],
    materials: ["Tecido escolar (malha)"],
    techniques: ["nenhuma", "silk", "sublimacao"],
  },
  {
    name: "Camisa social",
    category: "corporativo",
    image: "/uniforms/uni_03.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Azul marinho", "Preto", "Cinza"],
    materials: ["Tecido social (tricoline)", "Oxford"],
    techniques: ["nenhuma", "bordado"],
  },
  {
    name: "Calça operacional",
    category: "operacional",
    image: "/uniforms/uni_02.jpg",
    sizeSet: "adulto",
    colors: ["Preto", "Caqui", "Azul marinho", "Cinza"],
    materials: ["Brim 100% algodão"],
    techniques: ["nenhuma", "bordado", "silk"],
  },
  {
    name: "Calça social",
    category: "corporativo",
    image: "/uniforms/uni_02.jpg",
    sizeSet: "adulto",
    colors: ["Preto", "Azul marinho", "Cinza", "Caqui"],
    materials: ["Tecido social (tricoline)", "Oxford"],
    techniques: ["nenhuma", "bordado"],
  },
  {
    name: "Bermuda",
    category: "operacional",
    image: "/uniforms/ev_02.jpg",
    sizeSet: "ambos",
    colors: ["Preto", "Azul marinho", "Caqui", "Cinza"],
    materials: ["Brim 100% algodão", "Dry-fit"],
    techniques: ["nenhuma", "silk", "sublimacao"],
  },
  {
    name: "Jaleco",
    category: "operacional",
    image: "/uniforms/uni_03.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Cinza", "Azul marinho", "Preto"],
    materials: ["Brim 100% algodão", "Tecido social (tricoline)"],
    techniques: ["nenhuma", "bordado", "silk"],
  },
  {
    name: "Avental",
    category: "operacional",
    image: "/uniforms/uni_04.jpg",
    sizeSet: "adulto",
    colors: ["Preto", "Bordô", "Branco", "Cinza"],
    materials: ["Brim 100% algodão"],
    techniques: ["nenhuma", "silk", "bordado"],
  },
  {
    name: "Agasalho escolar",
    category: "escolar",
    image: "/uniforms/esc_02.png",
    sizeSet: "ambos",
    colors: ["Azul marinho", "Azul royal", "Cinza", "Preto"],
    materials: ["Helanca"],
    techniques: ["nenhuma", "silk", "sublimacao"],
  },
  {
    name: "Jaqueta",
    category: "corporativo",
    image: "/uniforms/esc_02.png",
    sizeSet: "adulto",
    colors: ["Preto", "Azul marinho", "Cinza"],
    materials: ["Helanca", "Dry-fit"],
    techniques: ["nenhuma", "bordado", "silk"],
  },
  {
    name: "Camisa dry-fit",
    category: "esportivo",
    image: "/uniforms/ev_01.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Preto", "Verde limão", "Azul royal", "Vermelho", "Amarelo"],
    materials: ["Dry-fit"],
    techniques: ["nenhuma", "sublimacao", "silk"],
  },
  {
    name: "Baby look",
    category: "corporativo",
    image: "/uniforms/uni_01.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Preto", "Azul marinho", "Cinza", "Vermelho"],
    materials: ["Malha PV 30/1"],
    techniques: ["nenhuma", "silk", "sublimacao", "transfer"],
  },
  {
    name: "Colete",
    category: "operacional",
    image: "/uniforms/uni_03.jpg",
    sizeSet: "adulto",
    colors: ["Preto", "Azul marinho", "Cinza", "Verde", "Caqui"],
    materials: ["Brim 100% algodão", "Oxford"],
    techniques: ["nenhuma", "silk", "bordado"],
  },
  {
    name: "Abadá",
    category: "evento",
    image: "/uniforms/ev_03.jpg",
    sizeSet: "adulto",
    colors: ["Branco", "Amarelo", "Verde limão", "Azul royal", "Vermelho", "Preto"],
    materials: ["Dry-fit"],
    techniques: ["nenhuma", "sublimacao", "silk"],
  },
];

export const PIECES = PIECE_CATALOG.map((p) => p.name);

export type PrintSpec = {
  id: string;
  name: string;
  hint: string;
  /** Se "escolher", a atendente precisa marcar. Senão a estampa trava. */
  technique: Technique | "escolher";
  place: Place | "escolher";
  needsText: boolean;
  textLabel: string;
  textPlaceholder: string;
  categories: readonly PieceCategory[] | "todas";
};

export const PRINT_CATALOG: readonly PrintSpec[] = [
  {
    id: "sem-estampa",
    name: "Sem estampa",
    hint: "Peça lisa, sem logo, nome ou arte.",
    technique: "nenhuma",
    place: "nenhum",
    needsText: false,
    textLabel: "",
    textPlaceholder: "",
    categories: "todas",
  },
  {
    id: "logo-bordado-peito",
    name: "Logo bordado no peito",
    hint: "Padrão de uniforme corporativo. O texto abaixo é o que vai no bordado.",
    technique: "bordado",
    place: "peito_esquerdo",
    needsText: true,
    textLabel: "Nome da marca / logo",
    textPlaceholder: "Ex.: Mercado São João",
    categories: ["corporativo", "operacional"],
  },
  {
    id: "logo-silk-peito",
    name: "Logo silk no peito",
    hint: "Silk no peito esquerdo. Escreva o nome da marca exatamente.",
    technique: "silk",
    place: "peito_esquerdo",
    needsText: true,
    textLabel: "Nome da marca / logo",
    textPlaceholder: "Ex.: Padaria Central",
    categories: ["corporativo", "operacional", "evento"],
  },
  {
    id: "logo-silk-costas",
    name: "Logo silk nas costas",
    hint: "Arte grande nas costas. Confira o nome antes de lançar.",
    technique: "silk",
    place: "costas",
    needsText: true,
    textLabel: "O que vai nas costas",
    textPlaceholder: "Ex.: Auto Peças NH",
    categories: ["corporativo", "operacional", "esportivo", "evento"],
  },
  {
    id: "brasao-escolar",
    name: "Brasão escolar no peito",
    hint: "Só linha escolar. Escreva o nome da escola como no brasão.",
    technique: "silk",
    place: "peito_esquerdo",
    needsText: true,
    textLabel: "Nome da escola",
    textPlaceholder: "Ex.: Colégio Horizonte",
    categories: ["escolar"],
  },
  {
    id: "nome-aluno",
    name: "Nome do aluno",
    hint: "Personalização individual. Escreva o nome exatamente como vai sair.",
    technique: "silk",
    place: "peito_direito",
    needsText: true,
    textLabel: "Nome do aluno",
    textPlaceholder: "Ex.: Ana Souza",
    categories: ["escolar"],
  },
  {
    id: "nome-colaborador",
    name: "Nome do colaborador",
    hint: "Bordado com o nome. Confira a grafia com o cliente.",
    technique: "bordado",
    place: "peito_direito",
    needsText: true,
    textLabel: "Nome a bordar",
    textPlaceholder: "Ex.: Carlos Lima",
    categories: ["corporativo", "operacional"],
  },
  {
    id: "nome-numero",
    name: "Nome e número nas costas",
    hint: "Padrão de time. Nome e número juntos, sem abreviar.",
    technique: "sublimacao",
    place: "costas",
    needsText: true,
    textLabel: "Nome e número",
    textPlaceholder: "Ex.: SILVA 10",
    categories: ["esportivo"],
  },
  {
    id: "arte-costas",
    name: "Arte / texto nas costas",
    hint: "Evento ou campanha. Descreva o que entra na arte.",
    technique: "sublimacao",
    place: "costas",
    needsText: true,
    textLabel: "Descrição da arte",
    textPlaceholder: "Ex.: Carnaval 2026 — Bloco Horizonte",
    categories: ["evento", "esportivo"],
  },
  {
    id: "identificacao-manga",
    name: "Identificação na manga",
    hint: "Setor, função ou sigla na manga.",
    technique: "silk",
    place: "manga",
    needsText: true,
    textLabel: "Texto da manga",
    textPlaceholder: "Ex.: CAIXA",
    categories: ["corporativo", "operacional"],
  },
  {
    id: "outro",
    name: "Outro (descrever tudo)",
    hint: "Só se nenhuma estampa acima servir. Técnica, local e texto são obrigatórios.",
    technique: "escolher",
    place: "escolher",
    needsText: true,
    textLabel: "Descreva a personalização",
    textPlaceholder: "Ex.: Silk nas duas mangas: logo 8 cm",
    categories: "todas",
  },
];

export const COLOR_SWATCH: Record<string, string> = {
  Branco: "swatch-branco",
  Preto: "swatch-preto",
  "Azul marinho": "swatch-azul-marinho",
  "Azul royal": "swatch-azul-royal",
  "Verde limão": "swatch-verde-limao",
  Verde: "swatch-verde",
  Cinza: "swatch-cinza",
  Vermelho: "swatch-vermelho",
  Bordô: "swatch-bordo",
  Caqui: "swatch-caqui",
  Amarelo: "swatch-amarelo",
};

export function colorSwatchClass(color: string): string {
  return COLOR_SWATCH[color] ?? "swatch-outra";
}

export function normalizeColor(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 40);
}

export function isUsableColor(value: string): boolean {
  const color = normalizeColor(value);
  if (color.length < 2 || color.length > 40) return false;
  return /^[\p{L}\p{N}][\p{L}\p{N} ./\-]{0,38}$/u.test(color);
}

export type CatalogSet = {
  pieces: PieceSpec[];
  prints: PrintSpec[];
};

export function pieceFrom(pieces: readonly PieceSpec[], name: string): PieceSpec | undefined {
  return pieces.find((p) => p.name === name);
}

export function printFrom(
  prints: readonly PrintSpec[],
  idOrName: string,
): PrintSpec | undefined {
  return prints.find((p) => p.id === idOrName || p.name === idOrName);
}

export function getPiece(name: string): PieceSpec | undefined {
  return pieceFrom(PIECE_CATALOG, name);
}

export function getPrint(idOrName: string): PrintSpec | undefined {
  return printFrom(PRINT_CATALOG, idOrName);
}

export function sizesForPiece(piece: PieceSpec): readonly string[] {
  if (piece.sizeSet === "adulto") return ADULT_SIZES;
  if (piece.sizeSet === "infantil") return KIDS_SIZES;
  return SIZES;
}

export function printsForPiece(
  piece: PieceSpec,
  prints: readonly PrintSpec[] = PRINT_CATALOG,
): readonly PrintSpec[] {
  return prints.filter(
    (p) => p.categories === "todas" || p.categories.includes(piece.category),
  );
}

export function isTechnique(value: string): value is Technique {
  return value in TECHNIQUE_LABEL;
}

export function isPlace(value: string): value is Place {
  return value in PLACE_LABEL;
}

export type OrderSpecInput = {
  piece: string;
  size: string;
  color: string;
  materialName?: string;
  quantity: number;
  printName: string;
  technique: string;
  printPlace: string;
  personalization: string;
  dueDate: string;
};

function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Regras que impedem o pedido de sair errado. Lista vazia = válido. */
export function validateOrderSpec(
  input: OrderSpecInput,
  catalog?: CatalogSet,
): string[] {
  const errors: string[] = [];
  const pieces = catalog?.pieces ?? PIECE_CATALOG;
  const prints = catalog?.prints ?? PRINT_CATALOG;
  const piece = pieceFrom(pieces, input.piece);
  if (!piece) {
    errors.push("Escolha a peça no catálogo da loja.");
    return errors;
  }

  const allowedSizes = sizesForPiece(piece);
  if (!input.size || !allowedSizes.includes(input.size)) {
    errors.push(`Tamanho inválido para ${piece.name}.`);
  }

  if (!isUsableColor(input.color)) {
    errors.push("Informe a cor da peça — da lista ou o nome combinado com o cliente.");
  }

  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    errors.push("Informe a quantidade de peças.");
  } else if (input.quantity > 9999) {
    errors.push("Quantidade acima do limite.");
  }

  if (input.materialName) {
    if (!piece.materials.includes(input.materialName)) {
      errors.push(
        `${piece.name} não usa ${input.materialName}. Use: ${piece.materials.join(", ")}.`,
      );
    }
  }

  const print = printFrom(prints, input.printName);
  const allowedPrints = printsForPiece(piece, prints);
  if (!print || !allowedPrints.some((p) => p.id === print.id)) {
    errors.push(`Esta estampa não serve para ${piece.name}.`);
    return errors;
  }

  const technique =
    print.technique === "escolher" ? input.technique : print.technique;
  const place = print.place === "escolher" ? input.printPlace : print.place;

  if (!isTechnique(technique)) {
    errors.push("Escolha a técnica da personalização.");
  } else {
    if (print.technique === "escolher" && technique === "nenhuma") {
      errors.push("Em “Outro”, escolha a técnica (não pode ficar sem).");
    }
    if (technique !== "nenhuma" && !piece.techniques.includes(technique)) {
      errors.push(`${piece.name} não aceita ${TECHNIQUE_LABEL[technique]}.`);
    }
    if (print.technique !== "escolher" && input.technique && input.technique !== print.technique) {
      errors.push(`A estampa “${print.name}” exige ${TECHNIQUE_LABEL[print.technique]}.`);
    }
  }

  if (!isPlace(place)) {
    errors.push("Escolha o local da estampa.");
  } else {
    if (print.place === "escolher" && place === "nenhum") {
      errors.push("Em “Outro”, marque o local da estampa.");
    }
    if (print.place !== "escolher" && input.printPlace && input.printPlace !== print.place) {
      errors.push(`A estampa “${print.name}” vai em ${PLACE_LABEL[print.place]}.`);
    }
  }

  const text = input.personalization.trim();
  if (print.needsText) {
    if (text.length < 2) {
      errors.push(`Preencha “${print.textLabel || "personalização"}” — não pode ir em branco.`);
    }
  } else if (text.length > 0) {
    errors.push("Peça sem estampa não leva texto de personalização.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    errors.push("Informe o prazo de entrega.");
  } else if (input.dueDate < todayISO()) {
    errors.push("O prazo não pode ser no passado.");
  }

  return errors;
}

export function resolvedTechnique(print: PrintSpec, chosen: string): Technique {
  if (print.technique !== "escolher") return print.technique;
  return isTechnique(chosen) ? chosen : "nenhuma";
}

export function resolvedPlace(print: PrintSpec, chosen: string): Place {
  if (print.place !== "escolher") return print.place;
  return isPlace(chosen) ? chosen : "nenhum";
}

export function describeCustomization(input: {
  printName?: string | null;
  technique?: string | null;
  printPlace?: string | null;
  personalization?: string | null;
}): string {
  const printName = (input.printName ?? "").trim();
  const personalization = (input.personalization ?? "").trim();
  if (!printName) return personalization || "Sem personalização";
  if (printName === "Sem estampa") return "Sem estampa";

  const parts: string[] = [printName];
  const tech = input.technique ?? "";
  if (isTechnique(tech) && tech !== "nenhuma") {
    parts.push(TECHNIQUE_LABEL[tech]);
  }
  const place = input.printPlace ?? "";
  if (isPlace(place) && place !== "nenhum") {
    parts.push(PLACE_LABEL[place]);
  }
  if (personalization) parts.push(personalization);
  return parts.join(" · ");
}
