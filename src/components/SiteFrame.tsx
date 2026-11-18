"use client";

import { usePathname } from "next/navigation";
import DemoBanner from "@/components/DemoBanner";
import SiteFooter from "@/components/landing/SiteFooter";
import SiteHeader from "@/components/landing/SiteHeader";
import Nav from "@/components/Nav";
import WarmUp from "@/components/WarmUp";

/**
 * La landing ("/") usa la cabecera de tienda; el resto de la app
 * conserva la navegación por roles. Ambas comparten el pie de página.
 */
export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const isLanding = usePathname() === "/";

  if (isLanding) {
    return (
      <>
        <DemoBanner />
        <WarmUp />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-surface/85 backdrop-blur">
        <DemoBanner />
        <WarmUp />
        <Nav />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-8 sm:py-16">{children}</main>
      <SiteFooter />
    </>
  );
}
