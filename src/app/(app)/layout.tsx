import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
      <BottomNav />
    </div>
  );
}
