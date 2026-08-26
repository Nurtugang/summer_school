import type { Metadata } from "next";
import { Golos_Text, Manrope } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import "./globals.css";

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Личный кабинет",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${golos.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
