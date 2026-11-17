import { LeafIcon, MapPinIcon, TruckIcon } from "./icons";

const values = [
  {
    Icon: MapPinIcon,
    title: "Cosecha local",
    text: "Compramos directo a fincas de la región. Sabes de dónde viene cada producto y quién lo cultivó.",
  },
  {
    Icon: TruckIcon,
    title: "Entrega directa a casa",
    text: "Armamos tu pedido el mismo día de la cosecha y lo llevamos a tu puerta en franjas horarias que tú eliges.",
  },
  {
    Icon: LeafIcon,
    title: "100% fresco y natural",
    text: "Sin cámaras de maduración ni ceras. Si algo no llega como esperabas, lo reponemos sin preguntas.",
  },
];

export default function ValueProps() {
  return (
    <section id="nosotros" className="scroll-mt-20 bg-deep text-mint" aria-labelledby="valor">
      <div className="section grid gap-14 py-24 lg:grid-cols-[0.9fr_1.6fr]">
        <div className="space-y-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-sage uppercase">Nosotros</p>
          <h2 id="valor" className="font-display text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
            Una tienda pequeña, cerca del campo y cerca de ti.
          </h2>
          <p className="max-w-sm leading-relaxed text-sage">
            Nacimos para acortar el camino entre quien siembra y quien cocina. Menos intermediarios significa producto
            más fresco y un pago más justo para el agricultor.
          </p>
        </div>

        <ul className="grid gap-px overflow-hidden rounded-3xl bg-pine sm:grid-cols-3">
          {values.map(({ Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-6 bg-forest p-7">
              <span className="grid size-12 place-items-center rounded-2xl border border-pine text-mint">
                <Icon size={22} strokeWidth={1.5} />
              </span>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-mint">{title}</h3>
                <p className="text-sm leading-relaxed text-sage">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
