"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CartIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";
import Wordmark from "./Wordmark";

const nav = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Productos" },
  { href: "/#servicios", label: "Servicios" },
  { href: "/#nosotros", label: "Nosotros" },
  { href: "/#contacto", label: "Contacto" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-colors ${
        scrolled ? "border-b border-line bg-bg/90 backdrop-blur" : "border-b border-transparent bg-bg"
      }`}
    >
      <div className="section flex h-18 items-center gap-6">
        <Wordmark />

        <nav aria-label="Principal" className="ml-6 hidden flex-1 items-center gap-8 md:flex">
          {nav.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm transition-colors hover:text-fg ${
                i === 0 ? "font-semibold text-fg" : "font-medium text-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button className="icon-btn" aria-label="Buscar" aria-expanded={searching} onClick={() => setSearching((s) => !s)}>
            <SearchIcon />
          </button>
          <button className="icon-btn hidden sm:grid" aria-label="Favoritos">
            <HeartIcon />
          </button>
          <Link href="/login" className="icon-btn hidden sm:grid" aria-label="Mi cuenta">
            <UserIcon />
          </Link>
          <Link href="/carrito" className="icon-btn" aria-label="Carrito, 2 productos">
            <CartIcon />
            <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-semibold text-on-brand">
              2
            </span>
          </Link>
          <button
            className="icon-btn md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {searching && (
        <div className="section pb-4">
          <form action="/catalogo" role="search" className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5">
            <SearchIcon size={18} className="text-muted" />
            <input
              autoFocus
              name="q"
              placeholder="Busca mango, aguacate, tomate..."
              className="w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
            />
          </form>
        </div>
      )}

      {open && (
        <nav aria-label="Móvil" className="section flex flex-col gap-1 border-t border-line pt-3 pb-5 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-base font-medium text-fg hover:bg-surface-2"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-base font-medium text-muted hover:bg-surface-2">
            Mi cuenta
          </Link>
        </nav>
      )}
    </header>
  );
}
