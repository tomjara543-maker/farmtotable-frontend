import type {
  CartItem,
  Delivery,
  DeliveryRoute,
  DeliveryStatus,
  Notification,
  Order,
  Payment,
  PaymentMethod,
  PricePoint,
  PricingRules,
  Producer,
  Reservation,
  Settlement,
} from "../api";
import type { Role } from "../session";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  createdAt: string;
}

export interface ProductRecord {
  id: string;
  producerId: string;
  name: string;
  category: string;
  basePrice: number;
  requiresColdChain: boolean;
  seasonMonths: number[];
}

export interface BatchRecord {
  batchId: string;
  productId: string;
  producerId: string;
  harvestDate: string;
  quantityKg: number;
  quantityAvailable: number;
  expiryEstimate: string;
}

export interface EventRecord {
  id: string;
  type: string;
  source: string;
  at: string;
  data: unknown;
}

export interface Db {
  users: UserRecord[];
  refreshTokens: { hash: string; userId: string; expiresAt: string; revoked: boolean }[];
  producers: Producer[];
  products: ProductRecord[];
  batches: BatchRecord[];
  carts: Record<string, CartItem[]>;
  orders: Order[];
  reservations: Reservation[];
  payments: Payment[];
  settlements: Settlement[];
  deliveries: Delivery[];
  routes: DeliveryRoute[];
  notifications: Notification[];
  pricingRules: PricingRules;
  priceHistory: PricePoint[];
  events: EventRecord[];
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const COMMISSION_RATE = 0.1;
export const MAX_AUTHORIZED_AMOUNT = 2_000_000;
export const COLD_CHAIN_RANGE = { min: 0, max: 8 };

let clockOffsetMs = 0;
export const setClockOffset = (days: number) => (clockOffsetMs = days * 86_400_000);
export const now = () => new Date(Date.now() - clockOffsetMs);
export const nowIso = () => now().toISOString();
export const today = () => toDate(now());
export const toDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (days: number) => toDate(new Date(now().getTime() + days * 86_400_000));
export const uid = () => crypto.randomUUID();
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((new Date(`${toIso}T00:00:00`).getTime() - new Date(`${fromIso}T00:00:00`).getTime()) / 86_400_000);
}

export async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const liveBatches = (db: Db, productId: string) =>
  db.batches.filter((b) => b.productId === productId && b.quantityAvailable > 0 && b.expiryEstimate >= today());

export const availableKg = (db: Db, productId: string) =>
  round2(liveBatches(db, productId).reduce((s, b) => s + b.quantityAvailable, 0));

export const isInSeason = (months: number[]) => months.length === 0 || months.includes(now().getMonth() + 1);

export function quote(db: Db, product: ProductRecord) {
  const rules = db.pricingRules;
  const kg = availableKg(db, product.id);
  const expiries = liveBatches(db, product.id).map((b) => daysBetween(today(), b.expiryEstimate));
  const daysToExpiry = expiries.length ? Math.min(...expiries) : null;

  const adjustments: { label: string; pct: number }[] = [];
  if (kg > 0 && kg < rules.lowStockKg) adjustments.push({ label: "Poca oferta", pct: rules.lowStockSurgePct });
  else if (kg > rules.highStockKg) adjustments.push({ label: "Mucha oferta", pct: -rules.highStockDiscountPct });
  if (daysToExpiry !== null && daysToExpiry <= rules.expiryDays) {
    adjustments.push({ label: "Próximo a vencer", pct: -rules.expiryDiscountPct });
  }
  const factor = Math.max(0.1, 1 + adjustments.reduce((s, a) => s + a.pct, 0) / 100);
  return { currentPrice: Math.round(product.basePrice * factor), availableKg: kg, daysToExpiry, adjustments };
}

export function publicProduct(db: Db, p: ProductRecord) {
  const q = quote(db, p);
  return { ...p, currentPrice: q.currentPrice, availableKg: q.availableKg, inSeason: isInSeason(p.seasonMonths) };
}

export function trackPrice(db: Db, productId: string, reason: string) {
  const product = db.products.find((p) => p.id === productId);
  if (!product) return;
  const { currentPrice } = quote(db, product);
  const last = db.priceHistory.findLast((h) => h.productId === productId);
  if (last?.price === currentPrice) return;
  db.priceHistory.push({ productId, price: currentPrice, reason, at: nowIso() });
  if (last) emit(db, "pricing-service", "price.updated", { productId, from: last.price, to: currentPrice, reason });
}

function notify(db: Db, userIds: string[], n: Omit<Notification, "id" | "userId" | "read" | "createdAt">) {
  for (const userId of new Set(userIds)) {
    db.notifications.unshift({ ...n, id: uid(), userId, read: false, createdAt: nowIso() });
  }
}
const admins = (db: Db) => db.users.filter((u) => u.role === "ADMIN").map((u) => u.id);
const ownerOf = (db: Db, producerId: string) => db.producers.find((p) => p.id === producerId)?.ownerId;
const shortId = (id: string) => id.slice(0, 8);

type Handler = (db: Db, data: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
const handlers: Record<string, Handler[]> = {};
const on = (type: string, handler: Handler) => (handlers[type] ??= []).push(handler);

export function emit(db: Db, source: string, type: string, data: unknown) {
  db.events.unshift({ id: uid(), type, source, at: nowIso(), data });
  db.events.length = Math.min(db.events.length, 300);
  for (const h of handlers[type] ?? []) h(db, data);
}

const findOrder = (db: Db, id: string) => db.orders.find((o) => o.id === id);

on("order.created", (db, { orderId }: { orderId: string }) => {
  const order = findOrder(db, orderId)!;
  const missing: { productId: string; requested: number; available: number }[] = [];
  const plan: Reservation["allocations"] = [];

  for (const item of order.items) {
    const batches = liveBatches(db, item.productId).sort((a, b) => a.expiryEstimate.localeCompare(b.expiryEstimate));
    const available = batches.reduce((s, b) => s + b.quantityAvailable, 0);
    if (available < item.quantity) {
      missing.push({ productId: item.productId, requested: item.quantity, available });
      continue;
    }
    let pending = item.quantity;
    for (const b of batches) {
      if (pending <= 0) break;
      const take = Math.min(pending, b.quantityAvailable);
      plan.push({ batchId: b.batchId, productId: item.productId, quantityKg: round2(take) });
      pending = round2(pending - take);
    }
  }

  if (missing.length) return emit(db, "inventory-service", "inventory.insufficient", { orderId, missing });
  for (const a of plan) db.batches.find((b) => b.batchId === a.batchId)!.quantityAvailable -= a.quantityKg;
  db.reservations.unshift({ orderId, allocations: plan, status: "RESERVED", createdAt: nowIso() });
  emit(db, "inventory-service", "inventory.reserved", { orderId, allocations: plan });
});

on("inventory.reserved", (db, { orderId, allocations }: { orderId: string; allocations: { productId: string }[] }) => {
  const order = findOrder(db, orderId)!;
  order.status = "CONFIRMED";
  order.statusReason = "Stock reservado. Pendiente de pago.";
  new Set(allocations.map((a) => a.productId)).forEach((id) => trackPrice(db, id, "Reserva de stock"));
  notify(db, [order.buyerId], {
    type: "ORDER",
    title: `Pedido ${shortId(orderId)} confirmado`,
    body: "Reservamos el producto más fresco para ti. Paga para programar la entrega.",
    link: "/pedidos",
  });
});

on("inventory.insufficient", (db, { orderId, missing }: { orderId: string; missing: { productId: string }[] }) => {
  const order = findOrder(db, orderId)!;
  const names = missing.map((m) => db.products.find((p) => p.id === m.productId)?.name ?? m.productId);
  order.status = "REJECTED";
  order.statusReason = `Stock insuficiente: ${names.join(", ")}`;
  notify(db, [order.buyerId], {
    type: "ORDER",
    title: `Pedido ${shortId(orderId)} rechazado`,
    body: order.statusReason,
    link: "/pedidos",
  });
});

on("order.cancelled", (db, { orderId }: { orderId: string }) => {
  const order = findOrder(db, orderId)!;
  releaseReservation(db, orderId);
  const payment = db.payments.find((p) => p.orderId === orderId && p.status === "AUTHORIZED");
  if (payment) {
    payment.status = "REFUNDED";
    emit(db, "payment-service", "payment.refunded", { paymentId: payment.id, orderId, amount: payment.amount });
  }
  for (const d of db.deliveries.filter((d) => d.orderId === orderId)) setStatus(d, "CANCELLED");
  for (const s of db.settlements.filter((s) => s.orderId === orderId)) s.status = "CANCELLED";
  notify(db, [order.buyerId], {
    type: "ORDER",
    title: `Pedido ${shortId(orderId)} cancelado`,
    body: payment ? "Se devolvió el pago a tu medio original." : "El stock reservado fue liberado.",
    link: "/pedidos",
  });
});

on("inventory.released", (db, { orderId, allocations }: { orderId: string; allocations: { productId: string }[] }) => {
  new Set(allocations.map((a) => a.productId)).forEach((id) => trackPrice(db, id, "Stock liberado"));
  const order = findOrder(db, orderId);
  if (order && order.status === "CONFIRMED") {
    order.status = "CANCELLED";
    order.statusReason = "La reserva de inventario fue liberada";
    notify(db, [order.buyerId], { type: "ORDER", title: `Pedido ${shortId(orderId)} cancelado`, body: order.statusReason, link: "/pedidos" });
  }
});

on("payment.authorized", (db, { orderId }: { orderId: string }) => {
  const order = findOrder(db, orderId)!;
  order.status = "PAID";
  order.statusReason = "Pago recibido. Preparando la entrega.";

  const delivery: Delivery = {
    id: uid(),
    orderId,
    buyerId: order.buyerId,
    zone: order.deliveryZone,
    address: order.deliveryAddress,
    totalKg: round2(order.items.reduce((s, i) => s + i.quantity, 0)),
    status: "PENDING",
    requiresColdChain: order.requiresColdChain,
    temperatureLog: [],
    coldChainBreach: false,
    history: [{ status: "PENDING", at: nowIso() }],
    createdAt: nowIso(),
  };
  db.deliveries.unshift(delivery);
  emit(db, "logistics-service", "delivery.created", { deliveryId: delivery.id, orderId, zone: delivery.zone });

  const byProducer = new Map<string, number>();
  for (const i of order.items) byProducer.set(i.producerId, (byProducer.get(i.producerId) ?? 0) + i.quantity * i.unitPrice);
  for (const [producerId, gross] of byProducer) {
    const commission = Math.round(gross * COMMISSION_RATE);
    db.settlements.unshift({
      id: uid(),
      producerId,
      orderId,
      gross: Math.round(gross),
      commission,
      net: Math.round(gross) - commission,
      status: "PENDING",
      createdAt: nowIso(),
    });
    notify(db, [ownerOf(db, producerId) ?? ""], {
      type: "PAYMENT",
      title: "Nueva venta",
      body: `El pedido ${shortId(orderId)} fue pagado. Recibirás tu liquidación al entregarse.`,
      link: "/pagos",
    });
  }
  notify(db, [order.buyerId], {
    type: "PAYMENT",
    title: "Pago aprobado",
    body: `Recibimos el pago del pedido ${shortId(orderId)}. Te avisaremos cuando salga a ruta.`,
    link: "/entregas",
  });
});

on("payment.declined", (db, { orderId, reason }: { orderId: string; reason: string }) => {
  const order = findOrder(db, orderId)!;
  notify(db, [order.buyerId], { type: "PAYMENT", title: "Pago rechazado", body: reason, link: "/pedidos" });
});

on("delivery.in_transit", (db, { orderId }: { orderId: string }) => {
  const order = findOrder(db, orderId)!;
  order.status = "IN_DELIVERY";
  order.statusReason = "Tu pedido va en camino.";
  notify(db, [order.buyerId], { type: "DELIVERY", title: "Pedido en camino", body: `El pedido ${shortId(orderId)} salió a ruta.`, link: "/entregas" });
});

on("delivery.completed", (db, { orderId }: { orderId: string }) => {
  const order = findOrder(db, orderId)!;
  order.status = "DELIVERED";
  order.statusReason = "Entregado.";
  for (const s of db.settlements.filter((s) => s.orderId === orderId && s.status === "PENDING")) {
    s.status = "AVAILABLE";
    notify(db, [ownerOf(db, s.producerId) ?? ""], {
      type: "PAYMENT",
      title: "Liquidación disponible",
      body: `El pedido ${shortId(orderId)} fue entregado. Tu pago está listo para transferirse.`,
      link: "/pagos",
    });
  }
  notify(db, [order.buyerId], { type: "DELIVERY", title: "Pedido entregado", body: `¡Que lo disfrutes! Pedido ${shortId(orderId)}.`, link: "/pedidos" });
});

on("delivery.failed", (db, { orderId }: { orderId: string }) => {
  const order = findOrder(db, orderId)!;
  order.statusReason = "No pudimos entregar. Reintentaremos.";
  notify(db, [order.buyerId, ...admins(db)], {
    type: "DELIVERY",
    title: "Entrega fallida",
    body: `No fue posible entregar el pedido ${shortId(orderId)}. Se programará un nuevo intento.`,
    link: "/entregas",
  });
});

on("coldchain.breach", (db, { orderId, celsius }: { orderId: string; celsius: number }) => {
  notify(db, admins(db), {
    type: "DELIVERY",
    title: "⚠ Ruptura de cadena de frío",
    body: `El pedido ${shortId(orderId)} registró ${celsius} °C (rango ${COLD_CHAIN_RANGE.min}–${COLD_CHAIN_RANGE.max} °C).`,
    link: "/entregas",
  });
});

on("settlement.paid", (db, { settlementId }: { settlementId: string }) => {
  const s = db.settlements.find((x) => x.id === settlementId)!;
  notify(db, [ownerOf(db, s.producerId) ?? ""], {
    type: "PAYMENT",
    title: "Te pagamos",
    body: `Transferimos ${s.net.toLocaleString("es-CO")} COP del pedido ${shortId(s.orderId)}.`,
    link: "/pagos",
  });
});

on("user.registered", (db, { userId, role }: { userId: string; role: Role }) => {
  notify(db, [userId], {
    type: "SYSTEM",
    title: "¡Bienvenido a FarmToTable!",
    body: role === "PRODUCER" ? "Registra tu granja y tus productos para empezar a vender." : "Explora el catálogo de temporada.",
    link: role === "PRODUCER" ? "/productor" : "/catalogo",
  });
});

export function createOrder(db: Db, buyerId: string, items: CartItem[], deliveryZone: string, deliveryAddress: string) {
  if (items.length === 0) throw new HttpError(422, "El pedido no tiene productos");
  const orderItems: Order["items"] = [];
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) throw new HttpError(422, `Producto ${item.productId} no existe`);
    const q = quote(db, product);
    if (q.availableKg < item.quantity) throw new HttpError(422, `Stock insuficiente de ${product.name} (quedan ${q.availableKg} kg)`);
    orderItems.push({
      productId: product.id,
      producerId: product.producerId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: q.currentPrice,
    });
  }
  const order: Order = {
    id: uid(),
    buyerId,
    deliveryZone,
    deliveryAddress,
    status: "PENDING_INVENTORY",
    statusReason: "Reservando stock…",
    requiresColdChain: orderItems.some((i) => db.products.find((p) => p.id === i.productId)?.requiresColdChain),
    items: orderItems,
    total: Math.round(orderItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0)),
    createdAt: nowIso(),
  };
  db.orders.unshift(order);
  emit(db, "order-service", "order.created", { orderId: order.id, buyerId, deliveryZone, total: order.total });
  return order;
}

export function cancelOrder(db: Db, order: Order) {
  if (!["PENDING_INVENTORY", "CONFIRMED", "PAID"].includes(order.status)) {
    throw new HttpError(409, "El pedido ya no se puede cancelar");
  }
  order.status = "CANCELLED";
  order.statusReason = "Cancelado por el comprador";
  emit(db, "order-service", "order.cancelled", { orderId: order.id });
}

export function releaseReservation(db: Db, orderId: string) {
  const r = db.reservations.find((x) => x.orderId === orderId && x.status === "RESERVED");
  if (!r) return false;
  for (const a of r.allocations) {
    const b = db.batches.find((x) => x.batchId === a.batchId);
    if (b) b.quantityAvailable = round2(b.quantityAvailable + a.quantityKg);
  }
  r.status = "RELEASED";
  emit(db, "inventory-service", "inventory.released", { orderId, allocations: r.allocations });
  return true;
}

export function pay(db: Db, order: Order, method: PaymentMethod, cardLast4?: string) {
  if (order.status !== "CONFIRMED") throw new HttpError(409, "Solo se pueden pagar pedidos confirmados");
  let reason: string | undefined;
  if (order.total > MAX_AUTHORIZED_AMOUNT) reason = "El monto supera el límite autorizado por la pasarela";
  else if (method === "CARD" && cardLast4 === "0002") reason = "Fondos insuficientes (tarjeta de prueba rechazada)";

  const payment: Payment = {
    id: uid(),
    orderId: order.id,
    buyerId: order.buyerId,
    amount: order.total,
    method,
    status: reason ? "DECLINED" : "AUTHORIZED",
    reason,
    cardLast4,
    createdAt: nowIso(),
  };
  db.payments.unshift(payment);
  if (reason) emit(db, "payment-service", "payment.declined", { paymentId: payment.id, orderId: order.id, reason });
  else emit(db, "payment-service", "payment.authorized", { paymentId: payment.id, orderId: order.id, amount: payment.amount });
  return payment;
}

export function planRoute(db: Db, zone: string) {
  const pending = db.deliveries.filter((d) => d.zone === zone && d.status === "PENDING");
  if (pending.length === 0) throw new HttpError(422, `No hay entregas pendientes en la zona ${zone}`);
  pending.sort((a, b) => Number(b.requiresColdChain) - Number(a.requiresColdChain));
  const route: DeliveryRoute = {
    id: uid(),
    zone,
    deliveryIds: pending.map((d) => d.id),
    totalKg: round2(pending.reduce((s, d) => s + d.totalKg, 0)),
    requiresColdChain: pending.some((d) => d.requiresColdChain),
    createdAt: nowIso(),
  };
  pending.forEach((d, i) => {
    d.routeId = route.id;
    d.sequence = i + 1;
    setStatus(d, "ASSIGNED");
  });
  db.routes.unshift(route);
  emit(db, "logistics-service", "route.planned", { routeId: route.id, zone, deliveries: pending.length });
  return route;
}

const transitions: Partial<Record<DeliveryStatus, DeliveryStatus[]>> = {
  ASSIGNED: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  FAILED: ["IN_TRANSIT"],
};

function setStatus(d: Delivery, status: DeliveryStatus) {
  d.status = status;
  d.history.push({ status, at: nowIso() });
}

export function advanceDelivery(db: Db, d: Delivery, status: DeliveryStatus) {
  if (!transitions[d.status]?.includes(status)) {
    throw new HttpError(409, `No se puede pasar de ${d.status} a ${status}`);
  }
  setStatus(d, status);
  const event = { IN_TRANSIT: "delivery.in_transit", DELIVERED: "delivery.completed", FAILED: "delivery.failed" }[status as string];
  if (event) emit(db, "logistics-service", event, { deliveryId: d.id, orderId: d.orderId });
}

export function recordTemperature(db: Db, d: Delivery, celsius: number) {
  if (!d.requiresColdChain) throw new HttpError(422, "Esta entrega no requiere cadena de frío");
  d.temperatureLog.push({ celsius, at: nowIso() });
  if (celsius < COLD_CHAIN_RANGE.min || celsius > COLD_CHAIN_RANGE.max) {
    d.coldChainBreach = true;
    emit(db, "logistics-service", "coldchain.breach", { deliveryId: d.id, orderId: d.orderId, celsius });
  }
}

export function paySettlement(db: Db, s: Settlement) {
  if (s.status !== "AVAILABLE") throw new HttpError(409, "Solo se pagan liquidaciones de pedidos entregados");
  s.status = "PAID";
  s.paidAt = nowIso();
  emit(db, "payment-service", "settlement.paid", { settlementId: s.id, producerId: s.producerId, net: s.net });
}

export function addBatch(db: Db, product: ProductRecord, data: { harvestDate: string; quantityKg: number; expiryEstimate: string }) {
  const batch: BatchRecord = {
    batchId: uid(),
    productId: product.id,
    producerId: product.producerId,
    ...data,
    quantityAvailable: data.quantityKg,
  };
  db.batches.push(batch);
  emit(db, "catalog-service", "product.available", { productId: product.id, batchId: batch.batchId, quantityKg: data.quantityKg });
  trackPrice(db, product.id, "Nueva cosecha");
  return batch;
}
