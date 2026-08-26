"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/cards", label: "Мои работы" },
  { href: "/review", label: "Рецензии" },
  { href: "/rating", label: "Рейтинг" },
  { href: "/profile", label: "Профиль" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-line bg-paper md:hidden">
      <div className="mx-auto flex max-w-3xl">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`tap-target flex flex-1 items-center justify-center px-2 py-3 text-center text-[13px] ${
                active ? "text-forest font-semibold" : "text-muted"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
