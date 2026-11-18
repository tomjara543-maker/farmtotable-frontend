"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { SproutIcon, CarrotIcon, AppleIcon, SaladIcon } from "@/components/landing/icons";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-sm md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand-soft p-10 md:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand text-on-brand">
            <SproutIcon size={18} />
          </span>
          FarmToTable
        </Link>
        <div className="space-y-3">
          <p className="text-2xl leading-snug font-bold">Del campo a tu mesa, sin intermediarios.</p>
          <p className="text-sm text-muted">Producto fresco y trazable por lote, directo de la granja.</p>
        </div>
        <div aria-hidden className="flex gap-4 text-brand">
          <CarrotIcon size={44} strokeWidth={1.25} />
          <AppleIcon size={44} strokeWidth={1.25} />
          <SaladIcon size={44} strokeWidth={1.25} />
        </div>
      </div>
      <div className="space-y-6 p-6 sm:p-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {children}
        <div className="text-center text-sm text-muted">{footer}</div>
      </div>
    </div>
  );
}

export function PasswordInput({
  name,
  autoComplete,
  minLength,
  onChange,
}: {
  name: string;
  autoComplete: string;
  minLength?: number;
  onChange?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        onChange={(e) => onChange?.(e.target.value)}
        className="input pr-20"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-muted hover:text-fg"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
