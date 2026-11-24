import { formatPrice } from "@/lib/format-price";

export function Price({ amountMinor, previousMinor }: { amountMinor: number; previousMinor?: number }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm tabular-nums">
      <span className="font-semibold"><span className="sr-only">Ціна: </span>{formatPrice(amountMinor)}</span>
      {previousMinor !== undefined && previousMinor > amountMinor && <del className="text-muted"><span className="sr-only">Попередня ціна: </span>{formatPrice(previousMinor)}</del>}
    </span>
  );
}
