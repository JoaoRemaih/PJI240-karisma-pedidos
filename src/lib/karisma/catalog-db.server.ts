import type { Sql } from "@/lib/db";
import {
  PIECE_CATALOG,
  PRINT_CATALOG,
  type CatalogSet,
  type PieceCategory,
  type PieceSpec,
  type Place,
  type PrintSpec,
  type SizeSet,
  type Technique,
} from "./catalog";

function asBool(value: unknown): boolean {
  if (value === true || value === 1 || value === "t" || value === "true") return true;
  if (value === false || value === 0 || value === "f" || value === "false") return false;
  return Boolean(value);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type StoredPiece = PieceSpec & { id: number; active: boolean; sortOrder: number };
export type StoredPrint = PrintSpec & { active: boolean; sortOrder: number };

function mapPiece(row: Record<string, unknown>): StoredPiece {
  return {
    id: num(row.id),
    name: String(row.name),
    category: row.category as PieceCategory,
    image: String(row.image ?? ""),
    sizeSet: (row.size_set as SizeSet) || "adulto",
    colors: parseJson<string[]>(String(row.colors ?? "[]"), []),
    materials: parseJson<string[]>(String(row.materials ?? "[]"), []),
    techniques: parseJson<Technique[]>(String(row.techniques ?? "[]"), []),
    active: asBool(row.active),
    sortOrder: num(row.sort_order),
  };
}

function mapPrint(row: Record<string, unknown>): StoredPrint {
  const categoriesRaw = parseJson<PrintSpec["categories"]>(
    String(row.categories ?? '"todas"'),
    "todas",
  );
  return {
    id: String(row.id),
    name: String(row.name),
    hint: String(row.hint ?? ""),
    technique: row.technique as Technique | "escolher",
    place: row.place as Place | "escolher",
    needsText: asBool(row.needs_text),
    textLabel: String(row.text_label ?? ""),
    textPlaceholder: String(row.text_placeholder ?? ""),
    categories: categoriesRaw,
    active: asBool(row.active),
    sortOrder: num(row.sort_order),
  };
}

export async function ensureCatalog(sql: Sql): Promise<void> {
  const count = await sql<{ n: number }>`select count(*)::int as n from catalog_pieces`;
  if (num(count[0]?.n) > 0) return;
  for (const [i, piece] of PIECE_CATALOG.entries()) {
    await sql`
      insert into catalog_pieces (
        name, category, image, size_set, colors, materials, techniques, sort_order
      ) values (
        ${piece.name}, ${piece.category}, ${piece.image}, ${piece.sizeSet},
        ${JSON.stringify(piece.colors)}, ${JSON.stringify(piece.materials)},
        ${JSON.stringify(piece.techniques)}, ${i}
      )
      on conflict (name) do nothing
    `;
  }
  for (const [i, print] of PRINT_CATALOG.entries()) {
    await sql`
      insert into catalog_prints (
        id, name, hint, technique, place, needs_text, text_label, text_placeholder,
        categories, sort_order
      ) values (
        ${print.id}, ${print.name}, ${print.hint}, ${print.technique}, ${print.place},
        ${print.needsText}, ${print.textLabel}, ${print.textPlaceholder},
        ${JSON.stringify(print.categories)}, ${i}
      )
      on conflict (id) do nothing
    `;
  }
}

export async function loadCatalog(sql: Sql, activeOnly: boolean): Promise<{
  pieces: StoredPiece[];
  prints: StoredPrint[];
}> {
  await ensureCatalog(sql);
  const pieceRows = activeOnly
    ? await sql<Record<string, unknown>>`
        select * from catalog_pieces where active = true order by sort_order, name
      `
    : await sql<Record<string, unknown>>`
        select * from catalog_pieces order by sort_order, name
      `;
  const printRows = activeOnly
    ? await sql<Record<string, unknown>>`
        select * from catalog_prints where active = true order by sort_order, name
      `
    : await sql<Record<string, unknown>>`
        select * from catalog_prints order by sort_order, name
      `;
  return {
    pieces: pieceRows.map(mapPiece),
    prints: printRows.map(mapPrint),
  };
}

export function asCatalogSet(data: {
  pieces: StoredPiece[];
  prints: StoredPrint[];
}): CatalogSet {
  return {
    pieces: data.pieces.map(({ id: _id, active: _a, sortOrder: _s, ...piece }) => piece),
    prints: data.prints.map(({ active: _a, sortOrder: _s, ...print }) => print),
  };
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `item-${Date.now()}`;
}
