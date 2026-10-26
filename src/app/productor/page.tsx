"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import RequireRole from "@/components/RequireRole";
import { api, post, Producer, Product } from "@/lib/api";
import { categoryIcon, certificationLabel, daysUntil, money } from "@/lib/format";

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-soft">
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function ProducerPage() {
  return <RequireRole roles={["PRODUCER"]}>{() => <ProducerPanel />}</RequireRole>;
}

function ProducerPanel() {
  const [producers, setProducers] = useState<Producer[]>([]);
  const [selectedId, setProducerId] = useState("");
  const [loadedProducts, setProducts] = useState<{ producerId: string; items: Product[] }>({ producerId: "", items: [] });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  const producerId = selectedId || producers[0]?.id || "";
  const producer = producers.find((p) => p.id === producerId);
  const products = loadedProducts.producerId === producerId ? loadedProducts.items : [];

  useEffect(() => {
    let ignore = false;
    api<Producer[]>("/producers/mine")
      .then((list) => !ignore && setProducers(list))
      .catch((e) => !ignore && setMessage({ ok: false, text: (e as Error).message }));
    return () => {
      ignore = true;
    };
  }, [version]);

  useEffect(() => {
    if (!producerId) return;
    let ignore = false;
    api<Product[]>(`/products?producerId=${producerId}`)
      .then((items) => !ignore && setProducts({ producerId, items }))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [producerId, version]);

  const submit = (fn: (data: FormData) => Promise<string>) => async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      setMessage({ ok: true, text: await fn(new FormData(form)) });
      form.reset();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    }
  };

  const createProducer = submit(async (d) => {
    const p = await post<Producer>("/producers", {
      farmName: d.get("farmName"),
      locationLat: Number(d.get("lat")),
      locationLng: Number(d.get("lng")),
    });
    reload();
    setProducerId(p.id);
    return `Granja "${p.farmName}" registrada`;
  });

  const addCertification = submit(async (d) => {
    await post(`/producers/${producerId}/certifications`, {
      type: d.get("type"),
      validUntil: d.get("validUntil"),
    });
    reload();
    return `Certificación ${certificationLabel[String(d.get("type"))]} guardada`;
  });

  const createProduct = submit(async (d) => {
    const months = String(d.get("seasonMonths") || "")
      .split(",")
      .map((m) => Number(m.trim()))
      .filter((m) => m >= 1 && m <= 12);
    const p = await post<Product>("/products", {
      producerId,
      name: d.get("name"),
      category: d.get("category"),
      basePrice: Number(d.get("basePrice")),
      requiresColdChain: d.get("requiresColdChain") === "on",
      seasonMonths: months,
    });
    reload();
    return `Producto "${p.name}" creado`;
  });

  const createBatch = submit(async (d) => {
    await post(`/products/${d.get("productId")}/batches`, {
      harvestDate: d.get("harvestDate"),
      quantityKg: Number(d.get("quantityKg")),
      expiryEstimate: d.get("expiryEstimate"),
    });
    reload();
    return "Cosecha registrada: el inventario recibe el lote (evento product.available) y el precio se recalcula";
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi granja"
        subtitle="Gestiona tus granjas, certificaciones, productos y cosechas."
        action={
          producers.length > 0 && (
            <label className="label w-full sm:w-72">
              <span>Granja activa</span>
              <select className="input" value={producerId} onChange={(e) => setProducerId(e.target.value)}>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.farmName}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />

      {message && <p className={message.ok ? "alert-ok" : "alert-error"}>{message.text}</p>}

      {producer && (
        <div className="card grid gap-6 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Granja</p>
            <p className="text-xl font-bold">{producer.farmName}</p>
            <p className="text-sm text-muted">
              📍 {producer.locationLat.toFixed(4)}, {producer.locationLng.toFixed(4)}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Certificaciones</p>
            {producer.certifications.length === 0 ? (
              <p className="text-sm text-muted">Sin certificaciones registradas.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {producer.certifications.map((c) => {
                  const expired = daysUntil(c.validUntil) < 0;
                  return (
                    <li key={c.type} className={`badge ${expired ? "badge-danger" : "badge-brand"}`}>
                      {expired ? "✕" : "✓"} {certificationLabel[c.type] ?? c.type} · {expired ? "venció" : "hasta"} {c.validUntil}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted uppercase">Productos ({products.length})</p>
            <ul className="space-y-1 text-sm">
              {products.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>
                    {categoryIcon(p.category)} {p.name}
                  </span>
                  <span className="text-muted">
                    {p.availableKg} kg · {money(p.currentPrice)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={createProducer} className="card">
          <Section title="Registrar granja" icon="🏡">
            <input name="farmName" placeholder="Nombre de la granja" className="input" required />
            <div className="flex gap-2">
              <input name="lat" type="number" step="any" min={-90} max={90} placeholder="Latitud" className="input" required />
              <input name="lng" type="number" step="any" min={-180} max={180} placeholder="Longitud" className="input" required />
            </div>
            <button className="btn">Registrar granja</button>
          </Section>
        </form>

        <form onSubmit={addCertification} className="card">
          <Section title="Certificaciones" icon="🏅">
            <select name="type" className="input" required>
              {Object.entries(certificationLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label className="label">
              <span>Válida hasta</span>
              <input name="validUntil" type="date" className="input" required />
            </label>
            <button className="btn" disabled={!producerId}>
              Guardar certificación
            </button>
            {!producerId && <p className="text-xs text-muted">Primero registra una granja.</p>}
          </Section>
        </form>

        <form onSubmit={createProduct} className="card">
          <Section title="Nuevo producto" icon="🥬">
            <input name="name" placeholder="Nombre (ej. Tomate chonto)" className="input" required />
            <input name="category" placeholder="Categoría (ej. Hortalizas, Frutas, Lácteos)" className="input" required />
            <input name="basePrice" type="number" min={0.01} step="any" placeholder="Precio base por kg" className="input" required />
            <input name="seasonMonths" placeholder="Meses de temporada (ej. 9,10,11)" className="input" />
            <label className="flex items-center gap-2 text-sm">
              <input name="requiresColdChain" type="checkbox" className="size-4 accent-[var(--brand)]" /> Requiere cadena de frío
            </label>
            <button className="btn" disabled={!producerId}>
              Crear producto
            </button>
          </Section>
        </form>

        <form onSubmit={createBatch} className="card">
          <Section title="Registrar cosecha (lote)" icon="🌾">
            <select name="productId" className="input" required>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="label">
                <span>Fecha de cosecha</span>
                <input name="harvestDate" type="date" className="input" required />
              </label>
              <label className="label">
                <span>Caducidad estimada</span>
                <input name="expiryEstimate" type="date" className="input" required />
              </label>
            </div>
            <input name="quantityKg" type="number" min={0.1} step="any" placeholder="Cantidad (kg)" className="input" required />
            <button className="btn" disabled={products.length === 0}>
              Registrar lote
            </button>
          </Section>
        </form>
      </div>
    </div>
  );
}
