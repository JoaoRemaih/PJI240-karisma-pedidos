import { getPiece, type PieceSpec } from "./catalog.ts";
import { consumptionFor } from "./status.ts";
import { applyDelta } from "./stock.ts";

export type SchoolSeason = {
  id: string;
  label: string;
  months: readonly number[];
  hint: string;
  pieces: readonly string[];
};

/** Calendário escolar de Novo Horizonte / interior de SP. */
export const SCHOOL_SEASONS: readonly SchoolSeason[] = [
  {
    id: "volta-aulas",
    label: "Volta às aulas",
    months: [1, 2, 3],
    hint: "Camiseta escolar entra em lotes de 10–40. Sozinhos parecem pouco; juntos esgotam a malha.",
    pieces: ["Camiseta escolar"],
  },
  {
    id: "inverno",
    label: "Inverno escolar",
    months: [5, 6, 7],
    hint: "Agasalho some em junho. Helanca tem que estar comprada em maio.",
    pieces: ["Agasalho escolar"],
  },
  {
    id: "reposicao",
    label: "Reposição do 2º semestre",
    months: [8, 9],
    hint: "Troca de tamanho e turma nova. A fila de recebido já é pedido de compra.",
    pieces: ["Camiseta escolar", "Agasalho escolar"],
  },
];

export type DemandLine = {
  piece: string;
  size: string;
  quantity: number;
  stockDeducted: boolean;
  materialName: string;
};

export type MaterialSnap = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  qtyPerPiece: number;
};

export type SizeBucket = {
  size: string;
  pieces: number;
  orders: number;
};

export type SchoolPieceRollup = {
  piece: string;
  totalPieces: number;
  orders: number;
  sizes: SizeBucket[];
};

export type MaterialOutlook = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  qtyPerPiece: number;
  school: boolean;
  committedPieces: number;
  committedQty: number;
  openOrders: number;
  afterQueue: number;
  belowMinAfter: boolean;
  insufficientAfter: boolean;
  level: "ok" | "watch" | "surprise";
};

export type Outlook = {
  seasons: SchoolSeason[];
  school: SchoolPieceRollup[];
  schoolOrders: number;
  schoolPieces: number;
  smallOrderTrap: boolean;
  materials: MaterialOutlook[];
  surprises: MaterialOutlook[];
};

export function isSchoolPiece(piece: string, pieces?: readonly PieceSpec[]): boolean {
  const spec = pieces
    ? pieces.find((p) => p.name === piece)
    : getPiece(piece);
  return spec?.category === "escolar";
}

export function schoolMaterialNames(pieces?: readonly PieceSpec[]): string[] {
  const source = pieces ?? [];
  const names = new Set<string>();
  if (source.length) {
    for (const spec of source) {
      if (spec.category !== "escolar") continue;
      for (const name of spec.materials) names.add(name);
    }
    return [...names];
  }
  for (const piece of ["Camiseta escolar", "Agasalho escolar"]) {
    const spec = getPiece(piece);
    if (!spec) continue;
    for (const name of spec.materials) names.add(name);
  }
  return [...names];
}

export function activeSeasons(month: number): SchoolSeason[] {
  return SCHOOL_SEASONS.filter((s) => s.months.includes(month));
}

export function calendarMonth(iso = new Date()): number {
  return iso.getMonth() + 1;
}

function schoolKey(piece: string): string {
  return piece;
}

export function rollupSchool(
  lines: DemandLine[],
  pieces?: readonly PieceSpec[],
): SchoolPieceRollup[] {
  const map = new Map<
    string,
    { total: number; orders: number; sizes: Map<string, SizeBucket> }
  >();
  for (const line of lines) {
    if (!isSchoolPiece(line.piece, pieces) || line.quantity < 1) continue;
    const key = schoolKey(line.piece);
    let row = map.get(key);
    if (!row) {
      row = { total: 0, orders: 0, sizes: new Map() };
      map.set(key, row);
    }
    row.total += line.quantity;
    row.orders += 1;
    const size = line.size || "?";
    const bucket = row.sizes.get(size) ?? { size, pieces: 0, orders: 0 };
    bucket.pieces += line.quantity;
    bucket.orders += 1;
    row.sizes.set(size, bucket);
  }
  return [...map.entries()]
    .map(([piece, row]) => ({
      piece,
      totalPieces: row.total,
      orders: row.orders,
      sizes: [...row.sizes.values()].sort((a, b) => b.pieces - a.pieces),
    }))
    .sort((a, b) => b.totalPieces - a.totalPieces);
}

function materialByName(materials: MaterialSnap[]): Map<string, MaterialSnap> {
  return new Map(materials.map((m) => [m.name, m]));
}

/** Pedidos ainda não baixados (recebido). Em produção já saiu do saldo. */
export function isCommitted(line: DemandLine): boolean {
  return !line.stockDeducted && line.quantity > 0;
}

export function buildOutlook(input: {
  lines: DemandLine[];
  materials: MaterialSnap[];
  month: number;
  extra?: { piece: string; size: string; quantity: number; materialName: string };
  extras?: Array<{ piece: string; size: string; quantity: number; materialName: string }>;
  pieces?: readonly PieceSpec[];
}): Outlook {
  const added = [
    ...(input.extra ? [input.extra] : []),
    ...(input.extras ?? []),
  ];
  const lines = added.length
    ? [
        ...input.lines,
        ...added.map((extra) => ({
          piece: extra.piece,
          size: extra.size,
          quantity: extra.quantity,
          stockDeducted: false,
          materialName: extra.materialName,
        })),
      ]
    : input.lines;

  const schoolMats = new Set(schoolMaterialNames(input.pieces));
  const byMat = materialByName(input.materials);

  const committed = new Map<
    string,
    { pieces: number; qty: number; orders: number }
  >();
  for (const line of lines) {
    if (!isCommitted(line)) continue;
    const mat = byMat.get(line.materialName);
    const per = mat?.qtyPerPiece ?? 1;
    const used = consumptionFor(line.quantity, per);
    const prev = committed.get(line.materialName) ?? {
      pieces: 0,
      qty: 0,
      orders: 0,
    };
    prev.pieces += line.quantity;
    prev.qty = Math.round((prev.qty + used) * 100) / 100;
    prev.orders += 1;
    committed.set(line.materialName, prev);
  }

  const materials: MaterialOutlook[] = input.materials.map((m) => {
    const c = committed.get(m.name) ?? { pieces: 0, qty: 0, orders: 0 };
    const result = applyDelta(m.quantity, -c.qty, m.minQuantity);
    const school = schoolMats.has(m.name);
    let level: MaterialOutlook["level"] = "ok";
    // Só é surpresa se a FILA compromete — saldo já baixo sem pedido aberto
    // continua no alerta de mínimo, não neste cartaz.
    if (c.qty > 0 && (result.insufficient || result.belowMin)) level = "surprise";
    else if (c.orders >= 2 && school) level = "watch";
    else if (c.qty > 0 && school) level = "watch";
    return {
      id: m.id,
      name: m.name,
      unit: m.unit,
      quantity: m.quantity,
      minQuantity: m.minQuantity,
      qtyPerPiece: m.qtyPerPiece,
      school,
      committedPieces: c.pieces,
      committedQty: c.qty,
      openOrders: c.orders,
      afterQueue: result.next,
      belowMinAfter: result.belowMin,
      insufficientAfter: result.insufficient,
      level,
    };
  });

  const school = rollupSchool(lines, input.pieces);
  const schoolOrders = school.reduce((n, p) => n + p.orders, 0);
  const schoolPieces = school.reduce((n, p) => n + p.totalPieces, 0);
  const smallOrderTrap =
    schoolOrders >= 3 && school.some((p) => p.orders >= 2 && p.totalPieces >= 30);

  return {
    seasons: activeSeasons(input.month),
    school,
    schoolOrders,
    schoolPieces,
    smallOrderTrap,
    materials: materials.sort((a, b) => {
      const rank = { surprise: 0, watch: 1, ok: 2 };
      return rank[a.level] - rank[b.level] || a.name.localeCompare(b.name);
    }),
    surprises: materials.filter((m) => m.level === "surprise"),
  };
}
