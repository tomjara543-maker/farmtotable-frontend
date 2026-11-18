import Link from "next/link";
import {
  AppleIcon,
  ArrowRightIcon,
  BellIcon,
  CardIcon,
  ChartIcon,
  PackageIcon,
  ShieldCheckIcon,
  SproutIcon,
  TagIcon,
  TruckIcon,
  WarehouseIcon,
} from "./icons";

const services = [
  { name: "Autenticación", text: "Registro, inicio de sesión y roles de comprador, productor y administrador.", href: "/login", Icon: ShieldCheckIcon },
  { name: "Productores", text: "Registro de granjas, ubicación y certificaciones.", href: "/productor", Icon: SproutIcon },
  { name: "Catálogo", text: "Productos, temporada y disponibilidad por lote.", href: "/catalogo", Icon: AppleIcon },
  { name: "Pedidos", text: "Carrito, confirmación y seguimiento de cada pedido.", href: "/carrito", Icon: PackageIcon },
  { name: "Inventario", text: "Stock por lote con reserva del más fresco primero.", href: "/inventario", Icon: WarehouseIcon },
  { name: "Logística", text: "Zonas, rutas de reparto y cadena de frío.", href: "/entregas", Icon: TruckIcon },
  { name: "Pagos", text: "Tarjeta, PSE o contra entrega y liquidaciones a productores.", href: "/pagos", Icon: CardIcon },
  { name: "Notificaciones", text: "Avisos de pedidos, pagos y entregas en tiempo real.", href: "/notificaciones", Icon: BellIcon },
  { name: "Analítica", text: "Ventas, pedidos y desempeño para el administrador.", href: "/analitica", Icon: ChartIcon },
  { name: "Precios", text: "Reglas de precio dinámico según temporada y oferta.", href: "/precios", Icon: TagIcon },
];

export default function Services() {
  return (
    <section id="servicios" className="section scroll-mt-20 py-20" aria-labelledby="servicios-titulo">
      <div className="mb-10 space-y-3">
        <p className="eyebrow">Plataforma</p>
        <h2 id="servicios-titulo" className="font-display text-3xl font-medium tracking-tight text-fg sm:text-4xl">
          Diez servicios, una sola tienda
        </h2>
        <p className="max-w-2xl text-muted">
          Cada parte de FarmToTable es un microservicio independiente conectado por una puerta de entrada única.
          Entra a cualquiera; te pediremos iniciar sesión si tu rol lo requiere.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {services.map(({ name, text, href, Icon }) => (
          <li key={name}>
            <Link
              href={href}
              className="group flex h-full flex-col gap-5 rounded-3xl border border-line bg-surface p-5 transition-colors hover:border-sage hover:bg-surface-2"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Icon size={22} strokeWidth={1.5} />
              </span>
              <span className="flex-1 space-y-1">
                <span className="block font-semibold text-fg">{name}</span>
                <span className="block text-sm leading-relaxed text-muted">{text}</span>
              </span>
              <ArrowRightIcon size={16} className="text-brand transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
