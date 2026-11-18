import Link from "next/link";
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "./icons";
import Wordmark from "./Wordmark";

const columns = [
  {
    title: "Tienda",
    links: [
      { href: "/catalogo", label: "Catálogo" },
      { href: "/catalogo", label: "Frutas" },
      { href: "/catalogo", label: "Vegetales" },
      { href: "/catalogo", label: "Canastas familiares" },
    ],
  },
  {
    title: "Tu cuenta",
    links: [
      { href: "/login", label: "Iniciar sesión" },
      { href: "/registro", label: "Crear cuenta" },
      { href: "/pedidos", label: "Mis pedidos" },
      { href: "/registro", label: "Vende con nosotros" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer id="contacto" className="scroll-mt-20 bg-ink text-sage">
      <div className="section grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="space-y-4">
          <Wordmark inverted />
          <p className="max-w-xs text-sm leading-relaxed">
            Frutas y verduras frescas, directo de fincas locales a la puerta de tu casa.
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="space-y-4">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-mint uppercase">{col.title}</h2>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="transition-colors hover:text-mint">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <address className="space-y-4 not-italic">
          <h2 className="text-xs font-semibold tracking-[0.18em] text-mint uppercase">Contacto</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPinIcon size={18} className="mt-0.5 shrink-0 text-mint" />
              Calle 00 # 00-00, Colombia
            </li>
            <li className="flex gap-3">
              <PhoneIcon size={18} className="mt-0.5 shrink-0 text-mint" />
              <a href="tel:+573000000000" className="hover:text-mint">
                +57 300 000 0000
              </a>
            </li>
            <li className="flex gap-3">
              <MailIcon size={18} className="mt-0.5 shrink-0 text-mint" />
              <a href="mailto:hola@farmtotable.co" className="hover:text-mint">
                hola@farmtotable.co
              </a>
            </li>
            <li className="flex gap-3">
              <ClockIcon size={18} className="mt-0.5 shrink-0 text-mint" />
              Lunes a sábado, 7:00 a. m. – 6:00 p. m.
            </li>
          </ul>
        </address>
      </div>

      <div className="border-t border-forest">
        <div className="section flex flex-col gap-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FarmToTable. Todos los derechos reservados.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <a href="#" className="hover:text-mint">
                Términos y condiciones
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-mint">
                Política de privacidad
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-mint">
                Tratamiento de datos
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
