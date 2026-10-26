"use client";

import { FormEvent, useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { PricePoint, PricingRules, ProductPrice, put } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import { useApi } from "@/lib/useApi";

export default function PricingPage() {
  return <RequireRole roles={["ADMIN"]}>{() => <Pricing />}</RequireRole>;
}

const fields: { name: keyof PricingRules; label: string; suffix: string; group: string }[] = [
  { name: "lowStockKg", label: "Poca oferta por debajo de", suffix: "kg", group: "Poca oferta (sube el precio)" },
  { name: "lowStockSurgePct", label: "Incremento", suffix: "%", group: "Poca oferta (sube el precio)" },
  { name: "highStockKg", label: "Mucha oferta por encima de", suffix: "kg", group: "Mucha oferta (baja el precio)" },
  { name: "highStockDiscountPct", label: "Descuento", suffix: "%", group: "Mucha oferta (baja el precio)" },
  { name: "expiryDays", label: "Lote vence en ≤", suffix: "días", group: "Próximo a vencer (evita merma)" },
  { name: "expiryDiscountPct", label: "Descuento", suffix: "%", group: "Próximo a vencer (evita merma)" },
];

function Pricing() {
  const rules = useApi<PricingRules>("/pricing/rules");
  const prices = useApi<ProductPrice[]>("/pricing/products");
  const [selected, setSelected] = useState<string | null>(null);
  const history = useApi<PricePoint[]>(selected ? `/pricing/history/${selected}` : null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await put("/pricing/rules", Object.fromEntries(fields.map((f) => [f.name, Number(data.get(f.name))])));
      setNotice({ ok: true, text: "Reglas guardadas. Los precios del catálogo se recalcularon (evento price.updated)." });
      rules.reload();
      prices.reload();
      history.reload();
    } catch (err) {
      setNotice({ ok: false, text: (err as Error).message });
    }
  }

  const groups = [...new Set(fields.map((f) => f.group))];
  const selectedName = prices.data?.find((p) => p.productId === selected)?.name;

  return (
    <div className="space-y-8">
      <PageHeader title="Precio dinámico" subtitle="El pricing-service ajusta el precio por kg según la oferta disponible y la cercanía al vencimiento." />
      {notice && <p className={notice.ok ? "alert-ok" : "alert-error"}>{notice.text}</p>}
      {(rules.error || prices.error) && <p className="alert-error">{rules.error ?? prices.error}</p>}

      {rules.data && (
        <form key={JSON.stringify(rules.data)} onSubmit={save} className="card space-y-5">
          <div className="grid gap-5 md:grid-cols-3">
            {groups.map((g) => (
              <fieldset key={g} className="space-y-3">
                <legend className="mb-2 text-sm font-semibold">{g}</legend>
                {fields
                  .filter((f) => f.group === g)
                  .map((f) => (
                    <label key={f.name} className="label">
                      <span>{f.label}</span>
                      <div className="relative">
                        <input name={f.name} type="number" min={0} step="any" defaultValue={rules.data![f.name]} className="input pr-12" required />
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{f.suffix}</span>
                      </div>
                    </label>
                  ))}
              </fieldset>
            ))}
          </div>
          <button className="btn">Guardar reglas</button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Precios actuales</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-right">Oferta</th>
                <th className="px-4 py-3 text-right">Vence en</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3">Ajustes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {prices.data?.map((p) => {
                const diff = p.currentPrice - p.basePrice;
                return (
                  <tr
                    key={p.productId}
                    onClick={() => setSelected(p.productId)}
                    className={`cursor-pointer hover:bg-surface-2 ${selected === p.productId ? "bg-brand-soft/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-right">{p.availableKg} kg</td>
                    <td className="px-4 py-3 text-right">{p.daysToExpiry === null ? "—" : `${p.daysToExpiry} d`}</td>
                    <td className="px-4 py-3 text-right text-muted">{money(p.basePrice)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${diff > 0 ? "text-accent" : diff < 0 ? "text-brand" : ""}`}>
                      {money(p.currentPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.adjustments.length === 0 && <span className="text-muted">—</span>}
                        {p.adjustments.map((a) => (
                          <span key={a.label} className={`badge ${a.pct > 0 ? "badge-warn" : "badge-brand"}`}>
                            {a.label} {a.pct > 0 ? "+" : ""}
                            {a.pct}%
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Haz clic en un producto para ver su historial de precios.</p>
      </section>

      {selected && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Historial · {selectedName}</h2>
          <ul className="card divide-y divide-line p-0 text-sm">
            {[...(history.data ?? [])].reverse().map((h) => (
              <li key={h.at} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="text-muted">{dateTime(h.at)}</span>
                <span>{h.reason}</span>
                <span className="font-semibold">{money(h.price)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
