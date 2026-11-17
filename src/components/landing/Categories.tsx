import Link from "next/link";
import { AppleIcon, ArrowRightIcon, BasketIcon, CarrotIcon, SproutIcon } from "./icons";

const categories = [
  { name: "Frutas", text: "Mango, aguacate, limón, piña", Icon: AppleIcon },
  { name: "Vegetales", text: "Tomate, cebolla, lechuga, pimentón", Icon: CarrotIcon },
  { name: "Orgánicos", text: "Cultivados sin agroquímicos", Icon: SproutIcon },
  { name: "Canastas familiares", text: "Surtido semanal listo para cocinar", Icon: BasketIcon },
];

export default function Categories() {
  return (
    <section className="section py-20" aria-labelledby="categorias">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="eyebrow">Categorías</p>
          <h2 id="categorias" className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
            Elige por dónde empezar
          </h2>
        </div>
        <Link href="/catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-strong">
          Ver todo el catálogo <ArrowRightIcon size={16} />
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map(({ name, text, Icon }, i) => (
          <li key={name}>
            <Link
              href="/catalogo"
              className={`group flex h-full flex-col justify-between gap-12 rounded-3xl p-6 transition-colors ${
                i === 3
                  ? "bg-forest text-mint hover:bg-deep"
                  : "border border-line bg-surface text-fg hover:border-sage hover:bg-surface-2"
              }`}
            >
              <span
                className={`grid size-14 place-items-center rounded-2xl ${
                  i === 3 ? "bg-pine text-mint" : "bg-brand-soft text-brand"
                }`}
              >
                <Icon size={26} strokeWidth={1.5} />
              </span>
              <span className="flex items-end justify-between gap-3">
                <span>
                  <span className="block text-lg font-semibold">{name}</span>
                  <span className={`mt-1 block text-sm ${i === 3 ? "text-sage" : "text-muted"}`}>{text}</span>
                </span>
                <ArrowRightIcon size={18} className="shrink-0 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
