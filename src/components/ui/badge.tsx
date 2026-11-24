import type { HTMLAttributes } from "react";

const tones = {
  neutral: "bg-canvas text-ink",
  denim: "bg-denim-wash text-denim-dark",
  sale: "bg-ink text-paper",
};

export function Badge({ tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center px-2.5 py-1 text-[10px] leading-4 font-bold tracking-[0.12em] uppercase ${tones[tone]} ${className}`} {...props} />;
}
