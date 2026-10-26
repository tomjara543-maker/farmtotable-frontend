import type { Metadata } from "next";
import { Geist } from "next/font/google";
import DemoBanner from "@/components/DemoBanner";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FarmToTable",
  description: "Productos agrícolas directos del productor a tu mesa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/85 backdrop-blur">
          <DemoBanner />
          <Nav />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          FarmToTable · Del campo a tu mesa, sin intermediarios
        </footer>
      </body>
    </html>
  );
}
