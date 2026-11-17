import Link from "next/link";
import { AppleIcon, ArrowRightIcon, CarrotIcon, CitrusIcon, ClockIcon, LeafIcon, SproutIcon } from "./icons";

export default function Hero() {
  return (
    <section className="section grid items-center gap-14 pt-10 pb-20 md:grid-cols-[1.05fr_1fr] md:pt-16 md:pb-28">
      <div className="space-y-8">
        <p className="eyebrow flex items-center gap-2">
          <SproutIcon size={16} className="text-brand" />
          Del productor a tu puerta
        </p>
        <h1 className="font-display text-5xl leading-[1.05] font-medium tracking-tight text-fg sm:text-6xl lg:text-7xl">
          Lo que se cosecha hoy, <em className="text-brand">llega a tu mesa</em> mañana.
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted">
          Frutas y verduras de fincas de la región, elegidas una a una y entregadas en tu casa sin pasar semanas en
          bodega. Más sabor para tu familia y un precio justo para quien la cultiva.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/catalogo"
            className="group inline-flex items-center gap-3 rounded-full bg-brand px-7 py-4 text-base font-semibold text-on-brand transition-colors hover:bg-brand-strong"
          >
            Ver catálogo fresco
            <ArrowRightIcon size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#nosotros" className="px-2 py-4 text-base font-medium text-fg underline decoration-sage underline-offset-8 hover:decoration-brand">
            Cómo trabajamos
          </a>
        </div>
        <dl className="grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
          {[
            ["24 h", "de la finca a tu casa"],
            ["Por kilo", "pagas solo lo que pides"],
            ["Sin bodega", "cosecha bajo pedido"],
          ].map(([value, label]) => (
            <div key={value}>
              <dt className="font-display text-xl font-semibold text-fg">{value}</dt>
              <dd className="mt-1 text-xs leading-snug text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Composición visual: formas orgánicas con los tonos de la paleta */}
      <div aria-hidden className="relative mx-auto aspect-square w-full max-w-[520px]">
        <div className="absolute inset-0 rounded-[42%_58%_55%_45%/48%_42%_58%_52%] bg-mint dark:bg-forest" />
        <div className="absolute inset-[12%] rounded-[55%_45%_42%_58%/45%_55%_45%_55%] bg-forest dark:bg-deep" />
        <div className="absolute inset-[12%] grid grid-cols-2 place-items-center p-[12%]">
          <AppleIcon size={92} strokeWidth={1} className="text-sage" />
          <LeafIcon size={72} strokeWidth={1} className="translate-y-6 text-mint" />
          <CitrusIcon size={68} strokeWidth={1} className="-translate-y-2 text-mint" />
          <CarrotIcon size={88} strokeWidth={1} className="text-sage" />
        </div>

        <div className="absolute top-[8%] -left-2 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-lg shadow-ink/5 sm:-left-6">
          <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">
            <LeafIcon size={18} />
          </span>
          <span className="text-sm leading-tight">
            <span className="block font-semibold text-fg">Cosecha del día</span>
            <span className="text-xs text-muted">Mango de azúcar · Aguacate</span>
          </span>
        </div>

        <div className="absolute right-0 bottom-[6%] flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-mint shadow-lg sm:-right-4">
          <ClockIcon size={18} className="text-sage" />
          <span className="text-sm leading-tight">
            <span className="block font-semibold">Pide antes de las 6 p. m.</span>
            <span className="text-xs text-sage">y recíbelo mañana</span>
          </span>
        </div>
      </div>
    </section>
  );
}
