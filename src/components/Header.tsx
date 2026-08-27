import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { isAdminEmail } from "@/lib/isAdmin";

export async function Header() {
  const session = await auth();
  const admin = isAdminEmail(session?.user?.email);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="tap-target flex items-center text-[14px] font-heading font-semibold uppercase tracking-[.08em] text-ink"
        >
          Главная
        </Link>
        {session?.user ? (
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-4 md:flex">
              <Link href="/cards" className="tap-target flex items-center text-[14px] text-muted hover:text-forest">
                Мои работы
              </Link>
              <Link href="/review" className="tap-target flex items-center text-[14px] text-muted hover:text-forest">
                Рецензии
              </Link>
              <Link href="/rating" className="tap-target flex items-center text-[14px] text-muted hover:text-forest">
                Рейтинг
              </Link>
              {admin ? (
                <Link href="/admin" className="tap-target flex items-center text-[14px] text-muted hover:text-forest">
                  Админка
                </Link>
              ) : null}
            </nav>
            <Link href="/profile" className="tap-target hidden items-center text-[14px] text-muted hover:text-forest sm:flex">
              {session.user.name}
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="tap-target text-[14px] text-terracotta hover:underline">
                Выйти
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}
