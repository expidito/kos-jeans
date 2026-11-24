/** Accept integer kopecks only; no decimal money is stored in UI contracts. */
export function formatPrice(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError("Price must be non-negative integer kopecks");
  }
  // Explicit Ukrainian formatting avoids ICU/CLDR differences (₴ vs грн)
  // between the server and browsers during React hydration.
  const hryvnias = Math.floor(amountMinor / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const kopecks = amountMinor % 100;
  const fraction = kopecks ? `,${kopecks.toString().padStart(2, "0")}` : "";
  return `${hryvnias}${fraction}\u00a0₴`;
}
