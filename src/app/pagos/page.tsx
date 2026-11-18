"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { Payment, post, Settlement } from "@/lib/api";
import { dateTime, money, shortId } from "@/lib/format";
import { paymentMethod, paymentStatus, settlementStatus } from "@/lib/labels";
import { useApi } from "@/lib/useApi";

export default function PaymentsPage() {
  return (
    <RequireRole roles={["BUYER", "PRODUCER", "ADMIN"]}>
      {(user) =>
        user.role === "BUYER" ? (
          <BuyerPayments />
        ) : (
          <div className="space-y-10">
            <Settlements admin={user.role === "ADMIN"} />
            {user.role === "ADMIN" && <PaymentTable path="/payments" title="Pagos de compradores" />}
          </div>
        )
      }
    </RequireRole>
  );
}

function BuyerPayments() {
  return (
    <div className="space-y-8">
      <PageHeader title="Mis pagos" subtitle="Historial de pagos de tus pedidos (pasarela simulada)." />
      <PaymentTable path="/payments/mine" />
    </div>
  );
}

function PaymentTable({ path, title }: { path: string; title?: string }) {
  const { data, error } = useApi<Payment[]>(path);
  return (
    <section className="space-y-3">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}
      {error && <p className="alert-error">{error}</p>}
      {data?.length === 0 && <div className="card py-10 text-center text-muted">Aún no hay pagos.</div>}
      {!data && !error && <div className="card h-32 animate-pulse bg-surface-2" />}
      {data && data.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-muted">{dateTime(p.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{shortId(p.orderId)}</td>
                  <td className="px-4 py-3">
                    {paymentMethod[p.method]}
                    {p.cardLast4 && <span className="text-muted"> ···· {p.cardLast4}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{money(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${paymentStatus[p.status].className}`}>{paymentStatus[p.status].text}</span>
                    {p.reason && <p className="mt-1 text-xs text-muted">{p.reason}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Settlements({ admin }: { admin: boolean }) {
  const { data, error, reload } = useApi<Settlement[]>("/payments/settlements");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const list = data ?? [];
  const sum = (status: Settlement["status"]) => list.filter((s) => s.status === status).reduce((t, s) => t + s.net, 0);

  async function paySettlement(s: Settlement) {
    try {
      await post(`/payments/settlements/${s.id}/pay`);
      setNotice({ ok: true, text: `Transferidos ${money(s.net)} a ${s.farmName ?? "el productor"}.` });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message });
    }
    reload();
  }

  const stats = [
    { label: "Esperando entrega", value: sum("PENDING"), tone: "text-warn" },
    { label: "Por transferir", value: sum("AVAILABLE"), tone: "text-info" },
    { label: "Pagado", value: sum("PAID"), tone: "text-brand" },
    { label: "Comisión plataforma", value: list.filter((s) => s.status !== "CANCELLED").reduce((t, s) => t + s.commission, 0), tone: "text-fg" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={admin ? "Pagos y liquidaciones" : "Mis liquidaciones"}
        subtitle="Cada venta genera una liquidación por productor (venta − 10 % de comisión) que se libera al entregar el pedido."
      />
      {error && <p className="alert-error">{error}</p>}
      {notice && <p className={notice.ok ? "alert-ok" : "alert-error"}>{notice.text}</p>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`mt-1 font-display text-3xl font-medium ${s.tone}`}>{money(s.value)}</p>
          </div>
        ))}
      </div>
      {data?.length === 0 && <div className="card py-10 text-center text-muted">Aún no hay ventas.</div>}
      {list.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                {admin && <th className="px-4 py-3">Granja</th>}
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3 text-right">Venta</th>
                <th className="px-4 py-3 text-right">Comisión</th>
                <th className="px-4 py-3 text-right">Neto</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-muted">{dateTime(s.createdAt)}</td>
                  {admin && <td className="px-4 py-3">{s.farmName}</td>}
                  <td className="px-4 py-3 font-mono text-xs">{shortId(s.orderId)}</td>
                  <td className="px-4 py-3 text-right">{money(s.gross)}</td>
                  <td className="px-4 py-3 text-right text-muted">−{money(s.commission)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{money(s.net)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${settlementStatus[s.status].className}`}>{settlementStatus[s.status].text}</span>
                      {admin && s.status === "AVAILABLE" && (
                        <button onClick={() => paySettlement(s)} className="text-xs font-semibold text-brand hover:underline">
                          Transferir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
