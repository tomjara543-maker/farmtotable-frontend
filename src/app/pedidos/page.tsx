"use client";

import { RefreshIcon } from "@/components/landing/icons";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { api, ApiError, Order, PaymentMethod, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateTime, money, shortId } from "@/lib/format";
import { orderStatus } from "@/lib/labels";
import { useApi } from "@/lib/useApi";
import { PackageIcon, SnowflakeIcon, CardIcon, LandmarkIcon, BanknoteIcon } from "@/components/landing/icons";

const CANCELLABLE: Order["status"][] = ["PENDING_INVENTORY", "CONFIRMED", "PAID"];

export default function OrdersPage() {
  return <RequireRole roles={["BUYER"]}>{() => <Orders />}</RequireRole>;
}

function Orders() {
  const [waiting, setWaiting] = useState<Record<string, Order["status"]>>({});
  const { data, error, reload } = useApi<Order[]>("/orders/mine", (list) =>
    list.some((o) => o.status === "PENDING_INVENTORY" || waiting[o.id] === o.status),
  );
  const [payingId, setPayingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const orders = [...(data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function cancel(o: Order) {
    const paid = o.status === "PAID";
    if (!confirm(paid ? "¿Cancelar el pedido? Se devolverá el pago." : "¿Cancelar el pedido?")) return;
    try {
      await post(`/orders/${o.id}/cancel`);
      setNotice({ ok: true, text: `Pedido ${shortId(o.id)} cancelado${paid ? " y pago reembolsado" : ""}.` });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message });
    }
    reload();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mis pedidos"
        subtitle="Sigue el estado de tus compras: reserva, pago y entrega."
        action={
          <button onClick={reload} className="btn-ghost">
            <RefreshIcon size={16} /> Actualizar
          </button>
        }
      />
      {error && <p className="alert-error">{error}</p>}
      {notice && <p className={notice.ok ? "alert-ok" : "alert-error"}>{notice.text}</p>}
      {data && orders.length === 0 && (
        <div className="card py-12 text-center">
          <PackageIcon size={40} strokeWidth={1.5} className="mx-auto text-brand" />
          <p className="mt-3 text-muted">No tienes pedidos todavía.</p>
          <Link href="/catalogo" className="btn mt-5">
            Ir al catálogo
          </Link>
        </div>
      )}
      {!data && !error && <div className="card h-32 animate-pulse bg-surface-2" />}
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">Pedido {shortId(o.id)}</p>
                  <span className={`badge ${orderStatus[o.status].className}`}>{orderStatus[o.status].text}</span>
                  {o.requiresColdChain && <span className="badge badge-info"><SnowflakeIcon size={14} /> Frío</span>}
                </div>
                <p className="text-sm text-muted">
                  {dateTime(o.createdAt)} · Zona {o.deliveryZone} · {o.items.map((i) => `${i.productName ?? shortId(i.productId)} ${i.quantity} kg`).join(", ")}
                </p>
                {o.statusReason && <p className="text-xs text-muted">{o.statusReason}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-lg font-bold">{money(o.total)}</span>
                {o.status === "CONFIRMED" && waiting[o.id] === "CONFIRMED" && (
                  <span className="text-sm text-muted">Confirmando pago…</span>
                )}
                {o.status === "CONFIRMED" && payingId !== o.id && waiting[o.id] !== "CONFIRMED" && (
                  <button onClick={() => setPayingId(o.id)} className="btn">
                    Pagar
                  </button>
                )}
                {(o.status === "PAID" || o.status === "IN_DELIVERY") && (
                  <Link href="/entregas" className="btn-ghost">
                    Seguir entrega
                  </Link>
                )}
                {CANCELLABLE.includes(o.status) && (
                  <button onClick={() => cancel(o)} className="text-sm text-danger hover:underline">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            {payingId === o.id && (
              <PaymentForm
                order={o}
                onClose={() => setPayingId(null)}
                onDone={(text) => {
                  setNotice({ ok: true, text });
                  setPayingId(null);
                  setWaiting((w) => ({ ...w, [o.id]: "CONFIRMED" }));
                  reload();
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const methods: { value: PaymentMethod; label: string; icon: typeof CardIcon }[] = [
  { value: "CARD", label: "Tarjeta", icon: CardIcon },
  { value: "PSE", label: "PSE", icon: LandmarkIcon },
  { value: "CASH_ON_DELIVERY", label: "Contra entrega", icon: BanknoteIcon },
];

function luhn(number: string) {
  let sum = 0;
  [...number].reverse().forEach((d, i) => {
    let n = Number(d);
    if (i % 2) n = n * 2 > 9 ? n * 2 - 9 : n * 2;
    sum += n;
  });
  return number.length >= 13 && sum % 10 === 0;
}

interface WompiConfig {
  enabled: boolean;
  baseUrl?: string;
  publicKey?: string;
  acceptancePermalink?: string;
  personalAuthPermalink?: string;
}

async function tokenizeCard(config: WompiConfig, card: { number: string; exp: string; cvv: string; holder: string }) {
  const [month, year] = card.exp.split("/");
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/tokens/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.publicKey}` },
      body: JSON.stringify({ number: card.number, cvc: card.cvv, exp_month: month, exp_year: year, card_holder: card.holder }),
    });
  } catch {
    throw new Error("No se pudo conectar con la pasarela de pagos");
  }
  const body = (await res.json().catch(() => ({}))) as { data?: { id: string; last_four: string }; error?: { messages?: Record<string, string[]> } };
  if (!res.ok || !body.data) {
    const detail = body.error?.messages ? Object.values(body.error.messages).flat().join("; ") : "datos de la tarjeta inválidos";
    throw new Error(`Pasarela de pagos: ${detail}`);
  }
  return body.data;
}

function PaymentForm({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: (text: string) => void }) {
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wompi, setWompi] = useState<WompiConfig>({ enabled: false });
  const { user } = useAuth();

  useEffect(() => {
    let ignore = false;
    api<WompiConfig>("/payments/wompi/config")
      .then((c) => !ignore && setWompi(c))
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    let cardLast4: string | undefined;
    let cardToken: string | undefined;
    if (method === "CARD") {
      const number = String(data.get("card")).replace(/\D/g, "");
      if (!luhn(number)) return setError("Número de tarjeta inválido");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(String(data.get("exp")))) return setError("Vencimiento inválido (MM/AA)");
      if (!/^\d{3,4}$/.test(String(data.get("cvv")))) return setError("CVV inválido");
      cardLast4 = number.slice(-4);
      if (wompi.enabled) {
        const holder = String(data.get("holder")).trim();
        if (holder.length < 5) return setError("Escribe el nombre del titular tal como aparece en la tarjeta");
        if (!data.get("terms")) return setError("Debes aceptar los términos de la pasarela");
        setBusy(true);
        setError(null);
        try {
          const token = await tokenizeCard(wompi, { number, exp: String(data.get("exp")), cvv: String(data.get("cvv")), holder });
          cardToken = token.id;
          cardLast4 = token.last_four;
        } catch (err) {
          setBusy(false);
          return setError((err as Error).message);
        }
      }
    }
    setBusy(true);
    setError(null);
    try {
      await post("/payments", {
        orderId: order.id,
        method,
        cardLast4,
        ...(cardToken ? { cardToken, customerEmail: user?.email, acceptTerms: true } : {}),
      });
      onDone(`Pago del pedido ${shortId(order.id)} aprobado. Programaremos la entrega en la zona ${order.deliveryZone}.`);
    } catch (err) {
      const msg = (err as Error).message;
      setError(err instanceof ApiError && err.status === 402 ? `Pago rechazado: ${msg}` : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface-2/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pagar {money(order.total)}</h3>
        <button type="button" onClick={onClose} className="text-sm text-muted hover:text-fg">
          Cerrar
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {methods.map((m) => (
          <button
            type="button"
            key={m.value}
            onClick={() => setMethod(m.value)}
            className={`rounded-xl border p-2 text-sm ${method === m.value ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface"}`}
          >
            <m.icon size={22} className="mx-auto mb-1" />
            {m.label}
          </button>
        ))}
      </div>
      {method === "CARD" && (
        <div className="grid gap-2 sm:grid-cols-[1fr_6rem_5rem]">
          <input name="card" inputMode="numeric" autoComplete="cc-number" placeholder="Número de tarjeta" className="input" required />
          <input name="exp" autoComplete="cc-exp" placeholder="MM/AA" className="input" required />
          <input name="cvv" inputMode="numeric" autoComplete="cc-csc" placeholder="CVV" className="input" required />
          {wompi.enabled && (
            <>
              <input name="holder" autoComplete="cc-name" placeholder="Nombre del titular" className="input sm:col-span-3" required />
              <label className="flex items-start gap-2 text-xs text-muted sm:col-span-3">
                <input type="checkbox" name="terms" className="mt-0.5" />
                <span>
                  Acepto los{" "}
                  <a href={wompi.acceptancePermalink} target="_blank" rel="noreferrer" className="underline">
                    términos y condiciones
                  </a>{" "}
                  y la{" "}
                  <a href={wompi.personalAuthPermalink ?? wompi.acceptancePermalink} target="_blank" rel="noreferrer" className="underline">
                    autorización de datos personales
                  </a>{" "}
                  de Wompi.
                </span>
              </label>
            </>
          )}
          <p className="text-xs text-muted sm:col-span-3">
            {wompi.enabled
              ? "Pasarela Wompi en modo de pruebas: 4242 4242 4242 4242 se aprueba y 4111 1111 1111 1111 se rechaza. Usa cualquier fecha futura y un CVC de 3 dígitos."
              : "Pasarela simulada: prueba con 4242 4242 4242 4242 (aprobada) o 4000 0000 0000 0002 (rechazada)."}
          </p>
        </div>
      )}
      {method === "PSE" && <p className="text-sm text-muted">Serás redirigido a tu banco (simulado: se aprueba al instante).</p>}
      {method === "CASH_ON_DELIVERY" && <p className="text-sm text-muted">Pagas en efectivo al recibir. El pedido se programa de inmediato.</p>}
      {error && <p className="alert-error">{error}</p>}
      <button className="btn w-full" disabled={busy}>
        {busy ? "Procesando pago…" : `Pagar ${money(order.total)}`}
      </button>
    </form>
  );
}
