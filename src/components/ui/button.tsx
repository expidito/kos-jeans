import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "border-ink bg-ink text-paper hover:border-graphite hover:bg-graphite",
  secondary: "border-control bg-paper text-ink hover:border-ink hover:bg-canvas",
  denim: "border-denim bg-denim text-paper hover:border-denim-dark hover:bg-denim-dark",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = "primary", type = "button", className = "", ...props }: ButtonProps) {
  return <button type={type} className={`inline-flex min-h-12 items-center justify-center gap-3 border px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-muted ${variants[variant]} ${className}`} {...props} />;
}
