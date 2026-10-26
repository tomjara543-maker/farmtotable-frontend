import AddToCart from "@/components/AddToCart";
import type { Product } from "@/lib/api";
import { categoryIcon, money } from "@/lib/format";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-4xl">🧺</p>
        <p className="mt-3 text-muted">Todavía no hay productos. Los productores los publican desde su panel.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <article key={p.id} className="card flex flex-col gap-4 overflow-hidden p-0">
          <div className="relative grid h-32 place-items-center bg-surface-2">
            <span aria-hidden className="text-6xl leading-none">
              {categoryIcon(p.category)}
            </span>
            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
              {p.inSeason && <span className="badge badge-brand">Temporada</span>}
              {p.requiresColdChain && <span className="badge badge-info">❄ Cadena de frío</span>}
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-3 px-5 pb-5">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">{p.category}</p>
              <h2 className="text-lg font-semibold">{p.name}</h2>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-2xl font-bold">
                {money(p.currentPrice)} <span className="text-sm font-normal text-muted">/ kg</span>
              </p>
              {p.currentPrice !== p.basePrice && (
                <span className={`text-xs ${p.currentPrice > p.basePrice ? "text-accent" : "text-brand"}`}>
                  {p.currentPrice > p.basePrice ? "▲ poca oferta" : `▼ antes ${money(p.basePrice)}`}
                </span>
              )}
            </div>
            <p className={`text-sm ${p.availableKg === 0 ? "text-danger" : "text-muted"}`}>
              {p.availableKg === 0 ? "Agotado" : `${p.availableKg} kg disponibles`}
            </p>
            <AddToCart productId={p.id} maxKg={p.availableKg} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-72 animate-pulse bg-surface-2" />
      ))}
    </div>
  );
}
