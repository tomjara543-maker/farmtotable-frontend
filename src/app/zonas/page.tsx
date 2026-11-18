"use client";

import { RefreshIcon } from "@/components/landing/icons";
import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { api, ZoneSummary } from "@/lib/api";
import { shortId } from "@/lib/format";
import { MapIcon, MapPinIcon, SnowflakeIcon } from "@/components/landing/icons";

export default function ZonesPage() {
  return <RequireRole roles={["ADMIN"]}>{() => <Zones />}</RequireRole>;
}

function Zones() {
  const [zones, setZones] = useState<ZoneSummary>({});
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;
    api<ZoneSummary>("/orders/consolidated")
      .then((z) => {
        if (ignore) return;
        setZones(z);
        setError(null);
      })
      .catch((e) => !ignore && setError((e as Error).message));
    return () => {
      ignore = true;
    };
  }, [version]);

  const entries = Object.entries(zones).sort((a, b) => b[1].totalKg - a[1].totalKg);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Consolidación por zona"
        subtitle="Pedidos confirmados y pagados agrupados por zona. Las rutas se planifican en Logística."
        action={
          <div className="flex gap-2">
            <button onClick={() => setVersion((v) => v + 1)} className="btn-ghost">
              <RefreshIcon size={16} /> Actualizar
            </button>
            <Link href="/entregas" className="btn">
              Planificar rutas
            </Link>
          </div>
        }
      />

      {error && <p className="alert-error">{error}</p>}

      {entries.length === 0 && !error ? (
        <div className="card py-12 text-center">
          <MapIcon size={40} strokeWidth={1.5} className="mx-auto text-brand" />
          <p className="mt-3 text-muted">No hay pedidos confirmados todavía.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([zone, z]) => (
            <div key={zone} className="card space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">Zona</p>
                  <h2 className="flex items-center gap-2 font-display text-xl font-medium"><MapPinIcon size={18} className="text-brand" />{zone}</h2>
                </div>
                {z.requiresColdChain && <span className="badge badge-info"><SnowflakeIcon size={14} /> Cadena de frío</span>}
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface-2 p-3">
                  <dt className="text-xs text-muted">Pedidos</dt>
                  <dd className="font-display text-3xl font-medium">{z.orders}</dd>
                </div>
                <div className="rounded-xl bg-surface-2 p-3">
                  <dt className="text-xs text-muted">Carga total</dt>
                  <dd className="font-display text-3xl font-medium">{z.totalKg} kg</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1">
                {z.orderIds.map((id) => (
                  <span key={id} className="badge badge-muted font-mono">
                    {shortId(id)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
