"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { api, CartItem, del, Order, post, Product } from "@/lib/api";
import { categoryIcon, money, shortId } from "@/lib/format";

interface Line extends CartItem {
  product?: Product;
}

const ZONES = ["Centro", "Norte", "Sur", "Occidente", "Oriente"];

async function fetchCart(): Promise<Line[]> {
  const cart = await api<{ items: CartItem[] }>("/carts/me");
  return Promise.all(
    cart.items.map(async (i) => ({ ...i, product: await api<Product>(`/products/${i.productId}`).catch(() => undefined) })),
  );
}

export default function CartPage() {
  return <RequireRole roles={["BUYER"]}>{() => <Cart />}</RequireRole>;
}

function Cart() {
  const [lines, setLines] = useState<Line[] | null>(null);
  const [zone, setZone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string; orderId?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    let ignore = false;
    fetchCart()
      .then((data) => !ignore && setLines(data))
      .catch((e) => !ignore && setMessage({ ok: false, text: (e as Error).message }));
    return () => {
      ignore = true;
    };
  }, [version]);

  async function remove(productId: string) {
    await del(`/carts/me/items/${productId}`).catch((e) => setMessage({ ok: false, text: (e as Error).message }));
    load();
  }

  async function checkout() {
    setBusy(true);
    setMessage(null);
    try {
      const order = await post<Order>("/carts/me/checkout", { deliveryZone: zone, deliveryAddress: address.trim() });
      setMessage({ ok: true, text: `Pedido ${shortId(order.id)} creado por ${money(order.total)}.`, orderId: order.id });
      load();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const items = lines ?? [];
  const total = items.reduce((s, l) => s + l.quantity * (l.product?.currentPrice ?? 0), 0);
  const totalKg = items.reduce((s, l) => s + l.quantity, 0);
  const coldChain = items.some((l) => l.product?.requiresColdChain);

  return (
    <div className="space-y-8">
      <PageHeader title="Carrito" subtitle="Revisa tu pedido y elige dónde lo entregamos." />

      {message && (
        <div className={message.ok ? "alert-ok flex flex-wrap items-center justify-between gap-2" : "alert-error"}>
          <span>{message.text}</span>
          {message.orderId && (
            <Link href="/pedidos" className="font-semibold underline">
              Ir a pagar →
            </Link>
          )}
        </div>
      )}

      {lines === null ? (
        <div className="card h-40 animate-pulse bg-surface-2" />
      ) : items.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-4xl">🛒</p>
          <p className="mt-3 text-muted">Tu carrito está vacío.</p>
          <Link href="/catalogo" className="btn mt-5">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <ul className="card divide-y divide-line p-0">
            {items.map((l) => (
              <li key={l.productId} className="flex items-center gap-4 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl" aria-hidden>
                  {l.product ? categoryIcon(l.product.category) : "🧺"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.product?.name ?? l.productId}</p>
                  <p className="text-sm text-muted">
                    {l.quantity} kg × {l.product ? money(l.product.currentPrice) : "?"}
                  </p>
                </div>
                <p className="font-semibold">{money(l.quantity * (l.product?.currentPrice ?? 0))}</p>
                <button onClick={() => remove(l.productId)} className="text-sm text-danger hover:underline" aria-label="Quitar">
                  Quitar
                </button>
              </li>
            ))}
          </ul>

          <aside className="card h-fit space-y-4">
            <h2 className="font-semibold">Resumen</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Peso total</dt>
                <dd>{totalKg} kg</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total estimado</dt>
                <dd>{money(total)}</dd>
              </div>
            </dl>
            {coldChain && <p className="badge badge-info">❄ Incluye productos con cadena de frío</p>}
            <label className="label">
              <span>Zona de entrega</span>
              <select className="input" value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="">Selecciona…</option>
                {ZONES.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label className="label">
              <span>Dirección</span>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej. Calle 10 # 5-20" />
            </label>
            <button onClick={checkout} disabled={busy || !zone || !address.trim()} className="btn w-full">
              {busy ? "Procesando…" : "Confirmar pedido"}
            </button>
            <p className="text-xs text-muted">Reservamos el stock más fresco (FEFO) y luego te pedimos el pago.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
