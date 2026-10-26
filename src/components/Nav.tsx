"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "@/components/NotificationBell";
import { logout, roleLabel, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/session";

const links: { href: string; label: string; roles: (Role | null)[] }[] = [
  { href: "/catalogo", label: "Catálogo", roles: [null, "BUYER", "PRODUCER", "ADMIN"] },
  { href: "/carrito", label: "Carrito", roles: ["BUYER"] },
  { href: "/pedidos", label: "Mis pedidos", roles: ["BUYER"] },
  { href: "/entregas", label: "Entregas", roles: ["BUYER"] },
  { href: "/productor", label: "Mi granja", roles: ["PRODUCER"] },
  { href: "/inventario", label: "Inventario", roles: ["PRODUCER", "ADMIN"] },
  { href: "/pagos", label: "Pagos", roles: ["BUYER", "PRODUCER", "ADMIN"] },
  { href: "/analitica", label: "Analítica", roles: ["ADMIN"] },
  { href: "/zonas", label: "Zonas", roles: ["ADMIN"] },
  { href: "/entregas", label: "Logística", roles: ["ADMIN"] },
  { href: "/precios", label: "Precios", roles: ["ADMIN"] },
  { href: "/admin/usuarios", label: "Usuarios", roles: ["ADMIN"] },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const visible = links.filter((l) => l.roles.includes(user?.role ?? null));

  async function signOut() {
    setMenuOpen(false);
    await logout();
    router.push("/login");
  }

  return (
    <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3">
      <Link href="/" className="mr-4 flex items-center gap-2 text-lg font-bold text-brand">
        <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand text-base text-on-brand">
          🌱
        </span>
        FarmToTable
      </Link>
      <div className="flex flex-1 flex-wrap gap-1">
        {visible.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.label}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {!ready ? (
        <div className="h-9 w-32 animate-pulse rounded-lg bg-surface-2" />
      ) : user ? (
        <div className="flex items-center gap-1">
          <NotificationBell />
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-left text-sm leading-tight sm:block">
                <span className="block max-w-36 truncate font-medium">{user.name}</span>
                <span className="block text-xs text-muted">{roleLabel[user.role]}</span>
              </span>
            </button>
            {menuOpen && (
              <div role="menu" className="card absolute right-0 z-20 mt-2 w-60 space-y-1 p-2">
                <div className="border-b border-line px-2 pb-2">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <Link
                  href="/notificaciones"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
                >
                  Notificaciones
                </Link>
                <button
                  role="menuitem"
                  onClick={signOut}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-danger hover:bg-danger-soft"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost py-1.5">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="btn py-1.5">
            Crear cuenta
          </Link>
        </div>
      )}
    </nav>
  );
}
