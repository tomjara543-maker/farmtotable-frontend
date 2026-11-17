import type { Metadata } from "next";
import { Fraunces, Geist } from "next/font/google";
import SiteFrame from "@/components/SiteFrame";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "FarmToTable · Frutas y verduras frescas a domicilio",
  description: "Frutas y vegetales frescos de fincas locales, entregados directo en tu casa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
