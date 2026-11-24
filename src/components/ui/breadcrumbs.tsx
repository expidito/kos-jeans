import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  return <nav aria-label="Навігаційний шлях"><ol className="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-6 text-muted">{items.map((item, index) => <li key={`${item.label}-${index}`} className="flex items-center gap-2">{index > 0 && <span aria-hidden="true">/</span>}{item.href ? <Link href={item.href} className="hover:text-ink hover:underline">{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined} className="text-ink">{item.label}</span>}</li>)}</ol></nav>;
}
