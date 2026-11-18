"use client";

import { RefreshIcon } from "@/components/landing/icons";
import { FormEvent, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import MapView, { MapStop } from "@/components/MapView";
import RequireRole from "@/components/RequireRole";
import { Delivery, DeliveryRoute, DeliveryStatus, patch, post } from "@/lib/api";
import { dateTime, shortId } from "@/lib/format";
import { deliveryStatus } from "@/lib/labels";
import { useApi } from "@/lib/useApi";
import { SnowflakeIcon, TruckIcon, MapPinIcon } from "@/components/landing/icons";

export default function DeliveriesPage() {
  return (
    <RequireRole roles={["BUYER", "ADMIN"]}>{(user) => (user.role === "ADMIN" ? <Logistics /> : <MyDeliveries />)}</RequireRole>
  );
}

const STEPS: { status: DeliveryStatus; label: string }[] = [
  { status: "PENDING", label: "Pagado" },
  { status: "ASSIGNED", label: "Ruta asignada" },
  { status: "IN_TRANSIT", label: "En camino" },
  { status: "DELIVERED", label: "Entregado" },
];

function Timeline({ d }: { d: Delivery }) {
  const reached = new Set(d.history.map((h) => h.status));
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((s) => {
        const at = d.history.findLast((h) => h.status === s.status)?.at;
        const done = reached.has(s.status);
        return (
          <li key={s.status} className="space-y-1">
            <div className={`h-1.5 rounded-full ${done ? "bg-brand" : "bg-surface-2"}`} />
            <p className={`text-xs ${done ? "font-semibold" : "text-muted"}`}>{s.label}</p>
            {at && <p className="text-[0.7rem] text-muted">{dateTime(at)}</p>}
          </li>
        );
      })}
    </ol>
  );
}

function ColdChain({ d }: { d: Delivery }) {
  if (!d.requiresColdChain) return null;
  const last = d.temperatureLog.at(-1);
  return (
    <p className={`badge ${d.coldChainBreach ? "badge-danger" : "badge-info"}`}>
      <SnowflakeIcon size={14} /> Cadena de frío{last ? ` · última lectura ${last.celsius} °C` : ""}
      {d.coldChainBreach && " · fuera de rango"}
    </p>
  );
}

function MyDeliveries() {
  const { data, error, reload } = useApi<Delivery[]>("/deliveries/mine");
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis entregas"
        subtitle="Seguimiento de tus pedidos pagados hasta tu puerta."
        action={
          <button onClick={reload} className="btn-ghost">
            <RefreshIcon size={16} /> Actualizar
          </button>
        }
      />
      {error && <p className="alert-error">{error}</p>}
      {!data && !error && <div className="card h-32 animate-pulse bg-surface-2" />}
      {data?.length === 0 && (
        <div className="card py-12 text-center">
          <TruckIcon size={40} strokeWidth={1.5} className="mx-auto text-brand" />
          <p className="mt-3 text-muted">Cuando pagues un pedido verás aquí su entrega.</p>
        </div>
      )}
      <div className="space-y-3">
        {data?.map((d) => (
          <div key={d.id} className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">Pedido {shortId(d.orderId)}</p>
                <p className="text-sm text-muted">
                  <MapPinIcon size={14} className="mr-1 inline -mt-0.5" />{d.address} · Zona {d.zone} · {d.totalKg} kg
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ColdChain d={d} />
                <span className={`badge ${deliveryStatus[d.status].className}`}>{deliveryStatus[d.status].text}</span>
              </div>
            </div>
            {d.status === "CANCELLED" ? <p className="text-sm text-muted">Entrega cancelada junto con el pedido.</p> : <Timeline d={d} />}
            {d.lat != null && d.lng != null && d.status !== "CANCELLED" && (
              <div className="space-y-1">
                <MapView height={200} stops={[{ lat: d.lat, lng: d.lng, label: d.address, kind: "stop", order: 1 }]} />
                {d.geoSource === "zone" && <p className="text-xs text-muted">Ubicación aproximada por zona.</p>}
              </div>
            )}
            {d.status === "FAILED" && <p className="alert-error">No pudimos entregar tu pedido. Lo intentaremos de nuevo pronto.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

const nextActions: Partial<Record<DeliveryStatus, { status: DeliveryStatus; label: string; danger?: boolean }[]>> = {
  ASSIGNED: [{ status: "IN_TRANSIT", label: "Salir a ruta" }],
  IN_TRANSIT: [
    { status: "DELIVERED", label: "Marcar entregado" },
    { status: "FAILED", label: "Falló", danger: true },
  ],
  FAILED: [{ status: "IN_TRANSIT", label: "Reintentar" }],
};

function Logistics() {
  const deliveries = useApi<Delivery[]>("/deliveries");
  const routes = useApi<DeliveryRoute[]>("/deliveries/routes");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const all = deliveries.data ?? [];

  const reload = () => {
    deliveries.reload();
    routes.reload();
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setNotice({ ok: true, text: ok });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message });
    }
    reload();
  };

  const pendingByZone = Object.entries(
    all
      .filter((d) => d.status === "PENDING")
      .reduce<Record<string, Delivery[]>>((acc, d) => ((acc[d.zone] ??= []).push(d), acc), {}),
  );
  const active = all.filter((d) => ["ASSIGNED", "IN_TRANSIT", "FAILED"].includes(d.status));
  const byRoute = (routes.data ?? [])
    .map((r) => ({ route: r, items: active.filter((d) => d.routeId === r.id).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)) }))
    .filter((r) => r.items.length > 0);
  const done = all.filter((d) => d.status === "DELIVERED").slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Logística"
        subtitle="Agrupa las entregas pagadas por zona en rutas, sigue su estado y controla la cadena de frío."
        action={
          <button onClick={reload} className="btn-ghost">
            <RefreshIcon size={16} /> Actualizar
          </button>
        }
      />
      {deliveries.error && <p className="alert-error">{deliveries.error}</p>}
      {notice && <p className={notice.ok ? "alert-ok" : "alert-error"}>{notice.text}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">1. Entregas por programar</h2>
        {pendingByZone.length === 0 ? (
          <div className="card py-8 text-center text-muted">No hay entregas pendientes de ruta.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingByZone.map(([zone, items]) => (
              <div key={zone} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-display text-xl font-medium"><MapPinIcon size={18} className="text-brand" />{zone}</h3>
                  {items.some((d) => d.requiresColdChain) && <span className="badge badge-info"><SnowflakeIcon size={14} /> Frío</span>}
                </div>
                <p className="text-sm text-muted">
                  {items.length} entrega(s) · {items.reduce((s, d) => s + d.totalKg, 0)} kg
                </p>
                <button
                  onClick={() => run(() => post("/deliveries/routes", { zone }), `Ruta de la zona ${zone} creada con ${items.length} parada(s).`)}
                  className="btn w-full"
                >
                  Crear ruta
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">2. Rutas en curso</h2>
        {byRoute.length === 0 && <div className="card py-8 text-center text-muted">No hay rutas activas.</div>}
        {byRoute.map(({ route, items }) => (
          <div key={route.id} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">
                Ruta {shortId(route.id)} · Zona {route.zone}
              </h3>
              <p className="text-sm text-muted">
                {route.deliveryIds.length} paradas · {route.totalKg} kg{route.distanceKm != null && <> · {route.distanceKm} km</>} · creada {dateTime(route.createdAt)}
              </p>
            </div>
            <RouteMap route={route} />
            <ul className="divide-y divide-line">
              {items.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-sm font-bold">{d.sequence}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {d.address} <span className="font-mono text-xs text-muted">pedido {shortId(d.orderId)}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className={`badge ${deliveryStatus[d.status].className}`}>{deliveryStatus[d.status].text}</span>
                      <ColdChain d={d} />
                    </div>
                  </div>
                  {d.requiresColdChain && d.status === "IN_TRANSIT" && (
                    <TemperatureForm
                      onSubmit={(celsius) => run(() => post(`/deliveries/${d.id}/temperature`, { celsius }), `Lectura de ${celsius} °C registrada.`)}
                    />
                  )}
                  <div className="flex gap-2">
                    {nextActions[d.status]?.map((a) => (
                      <button
                        key={a.status}
                        onClick={() => run(() => patch(`/deliveries/${d.id}/status`, { status: a.status }), `Pedido ${shortId(d.orderId)}: ${deliveryStatus[a.status].text}`)}
                        className={a.danger ? "btn-ghost text-danger" : "btn"}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Entregadas recientemente</h2>
          <ul className="card divide-y divide-line p-0 text-sm">
            {done.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  Pedido <span className="font-mono">{shortId(d.orderId)}</span> · {d.zone}
                </span>
                <span className="flex items-center gap-2 text-muted">
                  <ColdChain d={d} />
                  {dateTime(d.history.at(-1)!.at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RouteMap({ route }: { route: DeliveryRoute }) {
  const stops = useMemo<MapStop[]>(() => {
    if (!route.depot || !route.stops?.length) return [];
    return [
      { lat: route.depot.lat, lng: route.depot.lng, label: route.depot.name, kind: "depot" },
      ...route.stops.map((s) => ({ lat: s.lat, lng: s.lng, label: s.address, order: s.sequence, kind: s.coldChain ? ("cold" as const) : ("stop" as const) })),
    ];
  }, [route]);
  return stops.length > 0 ? <MapView stops={stops} path height={300} /> : null;
}

function TemperatureForm({ onSubmit }: { onSubmit: (celsius: number) => void }) {
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = Number(new FormData(e.currentTarget).get("celsius"));
    if (Number.isFinite(value)) onSubmit(value);
    e.currentTarget.reset();
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input name="celsius" type="number" step="0.1" placeholder="°C" aria-label="Temperatura en °C" className="input w-20" required />
      <button className="btn-ghost px-3">Registrar</button>
    </form>
  );
}
