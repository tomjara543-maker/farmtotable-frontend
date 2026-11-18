"use client";

import { useState } from "react";
import { AppleIcon, CarrotIcon, CheckIcon, CherryIcon, CitrusIcon, HeartIcon, LeafIcon, PlusIcon, SaladIcon, SproutIcon } from "./icons";

// Un componente de servidor no puede pasar funciones (como un icono) a uno de cliente,
// así que el producto trae el nombre del icono y aquí se resuelve.
const icons = {
  apple: AppleIcon,
  carrot: CarrotIcon,
  cherry: CherryIcon,
  citrus: CitrusIcon,
  leaf: LeafIcon,
  salad: SaladIcon,
  sprout: SproutIcon,
};

export type FeaturedProduct = {
  name: string;
  origin: string;
  unit: string;
  price: number;
  tag?: string;
  icon: keyof typeof icons;
};

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function ProductCard({ product }: { product: FeaturedProduct }) {
  const [added, setAdded] = useState(false);
  const [fav, setFav] = useState(false);
  const Icon = icons[product.icon];

  function add() {
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <article className="group flex flex-col rounded-3xl border border-line bg-surface p-3 transition-shadow hover:shadow-xl hover:shadow-ink/5">
      {/* Placeholder de imagen: reemplazar por <Image src=... /> */}
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-surface-2">
        <Icon size={72} strokeWidth={1} className="text-brand transition-transform duration-500 group-hover:scale-110" />
        {product.tag && (
          <span className="absolute top-3 left-3 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-brand">
            {product.tag}
          </span>
        )}
        <button
          onClick={() => setFav((f) => !f)}
          aria-pressed={fav}
          aria-label={fav ? `Quitar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-surface text-brand transition-colors hover:bg-mint"
        >
          <HeartIcon size={16} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-2 pt-4 pb-2">
        <div>
          <p className="text-xs text-muted">{product.origin}</p>
          <h3 className="mt-0.5 text-base font-semibold text-fg">{product.name}</h3>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2">
          <p>
            <span className="font-display text-2xl font-semibold text-fg">{cop.format(product.price)}</span>
            <span className="ml-1 text-xs text-muted">/ {product.unit}</span>
          </p>
        </div>
        <button
          onClick={add}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
            added ? "bg-brand-soft text-brand" : "bg-brand text-on-brand hover:bg-brand-strong"
          }`}
        >
          {added ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
          {added ? "Agregado" : "Agregar al carrito"}
        </button>
      </div>
    </article>
  );
}
