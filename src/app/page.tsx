import Link from "next/link";

const steps = [
  { icon: "🧑‍🌾", title: "El productor cosecha", text: "Registra cada lote con su fecha de cosecha y caducidad estimada." },
  { icon: "🛒", title: "Tú haces el pedido", text: "Consultas disponibilidad en tiempo real y compras directo a la granja." },
  { icon: "📦", title: "Reservamos lo más fresco", text: "El inventario asigna primero los lotes más próximos a caducar (FEFO)." },
  { icon: "🚚", title: "Entrega por zona", text: "Los pedidos se agrupan por zona y respetan la cadena de frío." },
];

const audiences = [
  { icon: "🍽️", title: "Restaurantes", text: "Compra del día temprano, con producto fresco y trazable." },
  { icon: "🏪", title: "Tiendas de barrio", text: "Surte tu tienda directo del productor, sin intermediarios." },
  { icon: "🏡", title: "Consumidores", text: "Lleva a tu mesa productos de temporada a precio justo." },
];

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-brand-soft px-6 py-14 sm:px-12">
        <div className="max-w-2xl space-y-5">
          <span className="badge badge-brand border border-brand/20">🌾 Marketplace agrícola directo</span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Del campo a tu mesa, <span className="text-brand">sin intermediarios</span>
          </h1>
          <p className="text-lg text-muted">
            Conectamos productores agrícolas con restaurantes, tiendas de barrio y consumidores. Producto fresco,
            trazable por lote y con menos desperdicio.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/catalogo" className="btn px-6 py-3 text-base">
              Ver catálogo
            </Link>
            <Link href="/registro" className="btn-ghost bg-surface px-6 py-3 text-base">
              Soy productor
            </Link>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-6 -bottom-10 hidden text-[11rem] leading-none opacity-90 md:block">
          🥕🍅
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Cómo funciona</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{s.icon}</span>
                <span className="text-sm font-semibold text-muted">Paso {i + 1}</span>
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Para quién es</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="card flex gap-4">
              <span className="text-3xl">{a.icon}</span>
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted">{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
