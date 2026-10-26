"use client";

import Link from "next/link";
import { useState } from "react";
import { api, put } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AddToCart({ productId, maxKg }: { productId: string; maxKg: number }) {
  const { user, ready } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (ready && !user) {
    return (
      <Link href="/login?next=/catalogo" className="btn-ghost mt-auto w-full">
        Inicia sesión para comprar
      </Link>
    );
  }
  if (user && user.role !== "BUYER") {
    return <p className="mt-auto text-xs text-muted">Solo las cuentas de comprador pueden hacer pedidos.</p>;
  }

  async function add() {
    setBusy(true);
    setMessage(null);
    try {
      const { availableKg } = await api<{ availableKg: number }>(`/products/${productId}/availability`);
      if (availableKg < quantity) {
        setMessage({ ok: false, text: `Solo quedan ${availableKg} kg` });
        return;
      }
      await put("/carts/me/items", { productId, quantity });
      setMessage({ ok: true, text: "✓ Añadido al carrito" });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-auto space-y-2">
      <div className="flex gap-2">
        <div className="relative w-28">
          <input
            type="number"
            min={0.5}
            step={0.5}
            max={maxKg}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="input pr-9"
            aria-label="Cantidad en kg"
            disabled={maxKg === 0}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">kg</span>
        </div>
        <button onClick={add} disabled={!ready || busy || maxKg === 0 || quantity <= 0} className="btn flex-1">
          {maxKg === 0 ? "Agotado" : busy ? "Añadiendo…" : "Añadir al carrito"}
        </button>
      </div>
      {message && <p className={`text-xs ${message.ok ? "text-brand" : "text-danger"}`}>{message.text}</p>}
    </div>
  );
}
