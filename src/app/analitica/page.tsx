"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { Dashboard, OrderStatus } from "@/lib/api";
import { money, timeAgo } from "@/lib/format";
import { orderStatus } from "@/lib/labels";
import { useApi } from "@/lib/useApi";

export default function AnalyticsPage() {
  return <RequireRole roles={["ADMIN"]}>{() => <Analytics />}</RequireRole>;
}

const RANGES = [7, 14, 30];

function Analytics() {
  const [days, setDays] = useState(14);
  const { data, error, reload } = useApi<Dashboard>(`/analytics/dashboard?days=${days}`);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analítica"
        subtitle="Indicadores calculados por el analytics-service a partir de los eventos de todos los microservicios."
        action={
          <div className="flex items-center gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={`rounded-lg px-3 py-1.5 text-sm ${days === r ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-surface-2"}`}
              >
                {r} días
              </button>
            ))}
            <button onClick={reload} className="btn-ghost ml-1" aria-label="Actualizar">
              ↻
            </button>
          </div>
        }
      />
      {error && <p className="alert-error">{error}</p>}
      {!data && !error && <div className="card h-64 animate-pulse bg-surface-2" />}
      {data && <DashboardView d={data} />}
    </div>
  );
}

function Stat({ label, value, hint, tone = "text-fg" }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function DashboardView({ d }: { d: Dashboard }) {
  const maxDay = Math.max(1, ...d.salesByDay.map((s) => s.revenue));
  const maxProduct = Math.max(1, ...d.topProducts.map((p) => p.revenue));
  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover !== null ? d.salesByDay[hover] : null;
  const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" });

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Ventas totales" value={money(d.revenue)} hint={`${d.orders} pedidos en total`} />
        <Stat label="Ticket promedio" value={money(d.avgTicket)} />
        <Stat label="Comisión plataforma" value={money(d.commission)} hint="10 % de cada venta" />
        <Stat label="Productores · compradores" value={`${d.producers} · ${d.buyers}`} />
        <Stat label="Entregas completadas" value={String(d.deliveries.delivered)} hint={`${d.deliveries.inProgress} en curso · ${d.deliveries.failed} fallidas`} />
        <Stat
          label="Rupturas de cadena de frío"
          value={String(d.deliveries.coldChainBreaches)}
          tone={d.deliveries.coldChainBreaches ? "text-danger" : "text-fg"}
        />
        <Stat label="Merma (lotes vencidos)" value={`${d.wasteKg} kg`} tone={d.wasteKg ? "text-danger" : "text-fg"} />
        <Stat label="En riesgo (≤ 3 días)" value={`${d.atRiskKg} kg`} tone={d.atRiskKg ? "text-warn" : "text-fg"} hint="El pricing aplica descuento" />
      </div>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Ventas por día</h2>
          <p className="text-sm text-muted" aria-live="polite">
            {hovered ? `${dayLabel(hovered.date)}: ${money(hovered.revenue)} · ${hovered.orders} pago(s)` : "Pasa el cursor sobre una barra"}
          </p>
        </div>
        <div className="flex h-48 items-end gap-0.5 border-b border-line" onMouseLeave={() => setHover(null)}>
          {d.salesByDay.map((s, i) => (
            <div
              key={s.date}
              className="flex h-full flex-1 cursor-default items-end px-px"
              onMouseEnter={() => setHover(i)}
              title={`${dayLabel(s.date)}: ${money(s.revenue)}`}
            >
              <div
                className={`w-full rounded-t-[4px] transition-opacity ${hover === null || hover === i ? "bg-brand" : "bg-brand opacity-40"}`}
                style={{ height: `${(s.revenue / maxDay) * 100}%`, minHeight: s.revenue ? 2 : 0 }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>{dayLabel(d.salesByDay[0].date)}</span>
          <span>{dayLabel(d.salesByDay.at(-1)!.date)}</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card space-y-4">
          <h2 className="font-semibold">Productos más vendidos</h2>
          {d.topProducts.length === 0 && <p className="text-sm text-muted">Sin ventas todavía.</p>}
          <ul className="space-y-3">
            {d.topProducts.map((p) => (
              <li key={p.productId} className="space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted">
                    {p.kg} kg · <span className="font-semibold text-fg">{money(p.revenue)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-2">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${(p.revenue / maxProduct) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Pedidos por estado</h2>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {(Object.keys(orderStatus) as OrderStatus[]).map((s) => (
              <li key={s} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                <span className={`badge ${orderStatus[s].className}`}>{orderStatus[s].text}</span>
                <span className="font-bold">{d.ordersByStatus[s] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Últimos eventos del bus (RabbitMQ)</h2>
        <ul className="divide-y divide-line text-sm">
          {d.recentEvents.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-mono text-xs">{e.type}</span>
              <span className="text-xs text-muted">
                {e.source} · {timeAgo(e.at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
