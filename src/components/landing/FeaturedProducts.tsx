import Link from "next/link";
import { ArrowRightIcon } from "./icons";
import ProductCard, { type FeaturedProduct } from "./ProductCard";

// Datos de muestra para la maqueta estática (sin backend).
const products: FeaturedProduct[] = [
  { name: "Mango de azúcar", origin: "Cereté, Córdoba", unit: "1 kg", price: 6800, tag: "Temporada", icon: "apple" },
  { name: "Aguacate Hass", origin: "Finca El Recreo", unit: "1 kg", price: 9500, icon: "leaf" },
  { name: "Tomate chonto", origin: "Productores del Sinú", unit: "1 kg", price: 4200, icon: "cherry" },
  { name: "Limón Tahití", origin: "Finca La Esperanza", unit: "1 kg", price: 3900, icon: "citrus" },
  { name: "Zanahoria", origin: "Huerta Los Robles", unit: "1 kg", price: 3200, icon: "carrot" },
  { name: "Lechuga crespa", origin: "Cultivo orgánico", unit: "unidad", price: 2800, tag: "Orgánico", icon: "salad" },
  { name: "Cebolla larga", origin: "Huerta Los Robles", unit: "atado", price: 2500, icon: "sprout" },
  { name: "Plátano hartón", origin: "Finca El Recreo", unit: "1 kg", price: 3600, icon: "leaf" },
];

export default function FeaturedProducts() {
  return (
    <section className="section pb-24" aria-labelledby="destacados">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="eyebrow">Recién cosechado</p>
          <h2 id="destacados" className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            Productos destacados de la semana
          </h2>
        </div>
        <Link href="/catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-strong">
          Ver catálogo completo <ArrowRightIcon size={16} />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.name} product={p} />
        ))}
      </div>
    </section>
  );
}
