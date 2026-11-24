import type { ReactNode } from "react";

export function Accordion({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {title}<span aria-hidden="true" className="text-xl font-normal group-open:rotate-45">+</span>
      </summary>
      <div className="pb-5 text-sm leading-7 text-muted">{children}</div>
    </details>
  );
}
