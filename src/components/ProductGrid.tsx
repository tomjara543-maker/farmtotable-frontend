import AddToCart from "@/components/AddToCart";
import type { Product } from "@/lib/api";
import { money } from "@/lib/format";
import { BasketIcon, SnowflakeIcon, ArrowUpIcon, ArrowDownIcon } from "@/components/landing/icons";
import CategoryIcon from "@/components/CategoryIcon";

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="card py-12 text-center">
        <BasketIcon size={40} strokeWidth={1.5} className="mx-auto text-brand" />
        <p className="mt-3 text-muted">Todavía no hay productos. Los productores los publican desde su panel.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <article key={p.id} className="card flex flex-col gap-4 overflow-hidden p-0">
          <div className="relative grid h-32 place-items-center bg-surface-2">
            <CategoryIcon category={p.category} size={64} strokeWidth={1} aria-hidden className="text-brand" />
            <div className="absolute top-3 left-3 flex flex-wrap gap-1">
              {p.inSeason && <span className="badge badge-brand">Temporada</span>}
              {p.requiresColdChain && <span className="badge badge-info"><SnowflakeIcon size={14} /> Cadena de frío</span>}
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
                <span className={`inline-flex items-center gap-1 text-xs ${p.currentPrice > p.basePrice ? "text-accent" : "text-brand"}`}>
                  {p.currentPrice > p.basePrice ? <><ArrowUpIcon size={12} /> poca oferta</> : <><ArrowDownIcon size={12} /> antes {money(p.basePrice)}</>}
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
