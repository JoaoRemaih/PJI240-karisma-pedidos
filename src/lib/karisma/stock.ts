export type StockApplyResult = {
  previous: number;
  next: number;
  belowMin: boolean;
  insufficient: boolean;
};

export function applyDelta(
  current: number,
  delta: number,
  minQuantity: number,
): StockApplyResult {
  const previous = round2(current);
  const next = round2(previous + delta);
  return {
    previous,
    next,
    belowMin: next < minQuantity,
    insufficient: next < 0,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isBelowMin(quantity: number, minQuantity: number): boolean {
  return quantity < minQuantity;
}
