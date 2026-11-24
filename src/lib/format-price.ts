const formatter = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Accept integer kopecks only; no decimal money is stored in UI contracts. */
export function formatPrice(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("Price must be non-negative integer kopecks");
  }
  return formatter.format(amountMinor / 100);
}
