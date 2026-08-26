import Link from "next/link";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-1.5 text-[14px] text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-line">›</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-forest">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
