"use client";

import { RefreshIcon } from "@/components/landing/icons";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { api, post, Product, Reservation, StockByBatch } from "@/lib/api";
import { daysUntil, shortId } from "@/lib/format";
import CategoryIcon from "@/components/CategoryIcon";

const SOON_DAYS = 3;

interface InventoryData {
  stock: StockByBatch[];
  reservations: Reservation[];
  products: Record<string, Product>;
}

async function fetchInventory(): Promise<InventoryData> {
  const [stock, reservations, products] = await Promise.all([
    api<StockByBatch[]>("/inventory/stock"),
    api<Reservation[]>("/inventory/reservations"),
    api<Product[]>("/products").catch(() => [] as Product[]),
  ]);
  return { stock, reservations, products: Object.fromEntries(products.map((p) => [p.id, p])) };
}

function expiryBadge(days: number) {
  if (days < 0) return <span className="badge badge-danger">Vencido</span>;
  if (days === 0) return <span className="badge badge-warn">Vence hoy</span>;
  if (days <= SOON_DAYS) return <span className="badge badge-warn">Vence en {days} d</span>;
  return <span className="badge badge-brand">Fresco · {days} d</span>;
}

export default function InventoryPage() {
  return <RequireRole roles={["PRODUCER", "ADMIN"]}>{(user) => <Inventory isAdmin={user.role === "ADMIN"} />}</RequireRole>;
}

function Inventory({ isAdmin }: { isAdmin: boolean }) {
  const [data, setData] = useState<InventoryData>({ stock: [], reservations: [], products: {} });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let ignore = false;
    fetchInventory()
      .then((d) => {
        if (ignore) return;
        setData(d);
        setError(null);
      })
      .catch((e) => !ignore && setError((e as Error).message));
    return () => {
      ignore = true;
    };
  }, [version]);

  async function release(orderId: string) {
    try {
      await post(`/inventory/reservations/${orderId}/release`, {});
      setNotice(`Reserva del pedido ${shortId(orderId)} liberada: el stock volvió a los lotes.`);
    } catch (e) {
      setError((e as Error).message);
    }
    load();
  }

  const productName = (id: string) => data.products[id]?.name ?? shortId(id);
  const rows = data.stock.map((s) => ({ ...s, days: daysUntil(s.expiryEstimate) }));
  const totalKg = rows.filter((r) => r.days >= 0).reduce((s, r) => s + r.quantityAvailable, 0);
  const soon = rows.filter((r) => r.days >= 0 && r.days <= SOON_DAYS && r.quantityAvailable > 0).length;
  const expired = rows.filter((r) => r.days < 0 && r.quantityAvailable > 0).length;
  const activeReservations = data.reservations.filter((r) => r.status === "RESERVED").length;

  const stats = [
    { label: "Stock vendible", value: `${totalKg} kg`, tone: "text-fg" },
    { label: "Lotes por vencer", value: soon, tone: soon ? "text-warn" : "text-fg" },
    { label: "Lotes vencidos (merma)", value: expired, tone: expired ? "text-danger" : "text-fg" },
    { label: "Reservas activas", value: activeReservations, tone: "text-fg" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inventario perecedero"
        subtitle="Stock por lote, ordenado según FEFO: lo primero en vencer es lo primero en salir."
        action={
          <button onClick={load} className="btn-ghost">
            <RefreshIcon size={16} /> Actualizar
          </button>
        }
      />

      {error && <p className="alert-error">{error}</p>}
      {notice && <p className="alert-ok">{notice}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`mt-1 font-display text-4xl font-medium ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lotes en stock</h2>
        {rows.length === 0 ? (
          <div className="card py-10 text-center text-muted">
            No hay lotes. Se cargan automáticamente al registrar una cosecha (evento product.available).
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3">Orden FEFO</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Lote</th>
                  <th className="px-4 py-3 text-right">Disponible</th>
                  <th className="px-4 py-3">Caducidad</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r, i) => (
                  <tr key={r.batchId} className={r.days < 0 ? "opacity-60" : ""}>
                    <td className="px-4 py-3 text-muted">#{i + 1}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center gap-2"><CategoryIcon category={data.products[r.productId]?.category} size={18} className="text-brand" />{productName(r.productId)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{shortId(r.batchId)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{r.quantityAvailable} kg</td>
                    <td className="px-4 py-3">{r.expiryEstimate}</td>
                    <td className="px-4 py-3">{expiryBadge(r.days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Reservas por pedido</h2>
        {data.reservations.length === 0 ? (
          <div className="card py-10 text-center text-muted">Todavía no hay reservas.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.reservations.map((r) => (
              <div key={r.orderId} className="card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">Pedido {shortId(r.orderId)}</p>
                  <span className={`badge ${r.status === "RESERVED" ? "badge-brand" : "badge-muted"}`}>
                    {r.status === "RESERVED" ? "Reservado" : "Liberado"}
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {r.allocations.map((a) => (
                    <li key={a.batchId} className="flex justify-between">
                      <span>
                        {productName(a.productId)} <span className="font-mono text-xs text-muted">lote {shortId(a.batchId)}</span>
                      </span>
                      <span className="font-medium">{a.quantityKg} kg</span>
                    </li>
                  ))}
                </ul>
                {isAdmin && r.status === "RESERVED" && (
                  <button onClick={() => release(r.orderId)} className="btn-ghost w-full text-danger">
                    Liberar reserva (compensación)
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
