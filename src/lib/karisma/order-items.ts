import { consumptionFor } from "./status.ts";
import type { OrderItem } from "./types";

export type SizeQty = {
  size: string;
  quantity: number;
};

export type LineLike = {
  quantity: number;
  piece: string;
  size: string;
  color: string;
};

export type GroupedLines = {
  key: string;
  piece: string;
  color: string;
  materialName: string;
  printName: string;
  technique: string;
  printPlace: string;
  personalization: string;
  sizes: Array<{
    size: string;
    quantity: number;
    id: number;
    hasArtwork: boolean;
    artworkName: string;
  }>;
  total: number;
  hasArtwork: boolean;
  artworkName: string;
  firstItemId: number;
};

export function orderLineLabel(item: LineLike): string {
  return `${item.quantity}× ${item.piece} ${item.size} · ${item.color}`;
}

export function orderItemsSummary(items: LineLike[]): string {
  if (items.length === 0) return "—";
  const total = items.reduce((n, i) => n + i.quantity, 0);
  if (items.length === 1) return orderLineLabel(items[0]!);
  const pieces = [...new Set(items.map((i) => i.piece))];
  if (pieces.length === 1) {
    const sizes = items.map((i) => `${i.quantity}× ${i.size}`).join(", ");
    return `${pieces[0]} · ${sizes} · ${items[0]!.color} (${total} peças)`;
  }
  return `${items.length} itens · ${total} peças · ${pieces.join(" · ")}`;
}

export function totalPieces(items: { quantity: number }[]): number {
  return items.reduce((n, i) => n + (Number.isFinite(i.quantity) ? i.quantity : 0), 0);
}

export function groupOrderItems(items: OrderItem[]): GroupedLines[] {
  const map = new Map<string, GroupedLines>();
  for (const item of items) {
    const key = [
      item.piece,
      item.color,
      item.materialName,
      item.printName,
      item.technique,
      item.printPlace,
      item.personalization,
    ].join("|");
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        piece: item.piece,
        color: item.color,
        materialName: item.materialName,
        printName: item.printName,
        technique: item.technique,
        printPlace: item.printPlace,
        personalization: item.personalization,
        sizes: [],
        total: 0,
        hasArtwork: false,
        artworkName: "",
        firstItemId: item.id,
      };
      map.set(key, group);
    }
    group.sizes.push({
      size: item.size,
      quantity: item.quantity,
      id: item.id,
      hasArtwork: item.hasArtwork,
      artworkName: item.artworkName,
    });
    group.total += item.quantity;
    if (item.hasArtwork && !group.hasArtwork) {
      group.hasArtwork = true;
      group.artworkName = item.artworkName;
      group.firstItemId = item.id;
    }
  }
  return [...map.values()];
}

export function expandSizeRows<T extends { sizes: SizeQty[] }>(
  item: T,
): Array<Omit<T, "sizes"> & { size: string; quantity: number }> {
  return item.sizes
    .filter((s) => s.size && Number.isInteger(s.quantity) && s.quantity >= 1)
    .map(({ size, quantity }) => {
      const { sizes: _sizes, ...rest } = item;
      return { ...rest, size, quantity };
    });
}

export type StockNeed = {
  materialId: number;
  used: number;
  name: string;
  unit: string;
  available: number;
  minQuantity: number;
};

export function groupStockNeeds(
  items: { materialId: number; quantity: number }[],
  materials: {
    id: number;
    name: string;
    unit: string;
    quantity: number;
    minQuantity: number;
    qtyPerPiece: number;
  }[],
): StockNeed[] {
  const byId = new Map(materials.map((m) => [m.id, m]));
  const used = new Map<number, number>();
  for (const item of items) {
    const mat = byId.get(item.materialId);
    if (!mat) continue;
    const add = consumptionFor(item.quantity, mat.qtyPerPiece);
    used.set(
      item.materialId,
      Math.round(((used.get(item.materialId) ?? 0) + add) * 100) / 100,
    );
  }
  return [...used.entries()].map(([materialId, qty]) => {
    const mat = byId.get(materialId)!;
    return {
      materialId,
      used: qty,
      name: mat.name,
      unit: mat.unit,
      available: mat.quantity,
      minQuantity: mat.minQuantity,
    };
  });
}

export function linesFromOrder(order: {
  items?: LineLike[];
  quantity: number;
  piece: string;
  size: string;
  color: string;
}): LineLike[] {
  if (order.items && order.items.length > 0) return order.items;
  return [
    {
      quantity: order.quantity,
      piece: order.piece,
      size: order.size,
      color: order.color,
    },
  ];
}
