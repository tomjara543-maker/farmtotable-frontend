import type { RawResponse } from "../transport";
import type { Role } from "../session";
import {
  addBatch,
  advanceDelivery,
  availableKg,
  cancelOrder,
  createOrder,
  Db,
  HttpError,
  isInSeason,
  nowIso,
  pay,
  paySettlement,
  planRoute,
  publicProduct,
  quote,
  recordTemperature,
  releaseReservation,
  round2,
  sha256,
  today,
  toDate,
  trackPrice,
  uid,
  UserRecord,
  emit,
  daysBetween,
} from "./engine";
import { seed } from "./seed";

const KEY = "farmtotable.demo.v1";
const LATENCY_MS = 150;
const ACCESS_TTL_S = 15 * 60;
const REFRESH_DAYS = 7;

let pending: Promise<Db> | null = null;

async function load(): Promise<Db> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {}
  pending ??= seed().then((db) => (save(db), db));
  return pending;
}

function save(db: Db) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}

export function resetDemo() {
  pending = null;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

const b64url = (obj: object) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function accessToken(u: UserRecord) {
  const iat = Math.floor(Date.now() / 1000);
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url({ sub: u.id, role: u.role, email: u.email, name: u.name, iat, exp: iat + ACCESS_TTL_S })}.demo`;
}

function decode(token: string): { sub: string; exp: number } | null {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

const publicUser = ({ id, email, name, role, createdAt, active }: UserRecord) => ({ id, email, name, role, createdAt, active });

async function issueTokens(db: Db, u: UserRecord) {
  const refreshToken = `${uid()}${uid()}`.replace(/-/g, "");
  db.refreshTokens.push({
    hash: await sha256(refreshToken),
    userId: u.id,
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 86_400_000).toISOString(),
    revoked: false,
  });
  return { accessToken: accessToken(u), refreshToken, user: publicUser(u) };
}

interface Ctx {
  db: Db;
  params: Record<string, string>;
  query: URLSearchParams;
  body: Record<string, unknown>;
  user: UserRecord | null;
}

type Result = unknown | { __status: number; body: unknown };
const created = (body: unknown) => ({ __status: 201, body });
const noContent = { __status: 204, body: undefined };

const routes: { method: string; regex: RegExp; keys: string[]; handler: (ctx: Ctx) => Result | Promise<Result> }[] = [];

function route(method: string, pattern: string, handler: (ctx: Ctx) => Result | Promise<Result>) {
  const keys: string[] = [];
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), "([^/]+)"))}$`);
  routes.push({ method, regex, keys, handler });
}

function auth(ctx: Ctx, ...roles: Role[]) {
  if (!ctx.user) throw new HttpError(401, "Debes iniciar sesión");
  if (roles.length && !roles.includes(ctx.user.role)) throw new HttpError(403, "No tienes permiso para esta acción");
  return ctx.user;
}

const str = (v: unknown, field: string) => {
  if (typeof v !== "string" || !v.trim()) throw new HttpError(400, `El campo ${field} es obligatorio`);
  return v.trim();
};
const num = (v: unknown, field: string, min = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= min) throw new HttpError(400, `El campo ${field} debe ser un número mayor que ${min}`);
  return n;
};
const date = (v: unknown, field: string) => {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, `El campo ${field} debe ser una fecha`);
  return v;
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function find<T>(list: T[], pred: (x: T) => boolean, what: string): T {
  const item = list.find(pred);
  if (!item) throw new HttpError(404, `${what} no encontrado`);
  return item;
}

function ownProducer(ctx: Ctx, producerId: string) {
  const producer = find(ctx.db.producers, (p) => p.id === producerId, "Productor");
  if (ctx.user?.role !== "ADMIN" && producer.ownerId !== ctx.user?.id) throw new HttpError(403, "Esta granja no es tuya");
  return producer;
}

const myProducerIds = (ctx: Ctx) => ctx.db.producers.filter((p) => p.ownerId === ctx.user?.id).map((p) => p.id);

route("POST", "/auth/register", async ({ db, body }) => {
  const email = str(body.email, "email").toLowerCase();
  if (!EMAIL.test(email)) throw new HttpError(400, "Correo inválido");
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
  const role = body.role === "PRODUCER" ? "PRODUCER" : "BUYER";
  if (db.users.some((u) => u.email === email)) throw new HttpError(409, "Ya existe una cuenta con ese correo");
  const user: UserRecord = { id: uid(), email, name: str(body.name, "nombre"), role, active: true, passwordHash: await sha256(password), createdAt: nowIso() };
  db.users.push(user);
  emit(db, "auth-service", "user.registered", { userId: user.id, email, name: user.name, role });
  return created(await issueTokens(db, user));
});

route("POST", "/auth/login", async ({ db, body }) => {
  const email = String(body.email ?? "").toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user || !user.active || user.passwordHash !== (await sha256(String(body.password ?? "")))) {
    throw new HttpError(401, "Correo o contraseña incorrectos");
  }
  return issueTokens(db, user);
});

route("POST", "/auth/refresh", async ({ db, body }) => {
  const hash = await sha256(String(body.refreshToken ?? ""));
  const token = db.refreshTokens.find((t) => t.hash === hash);
  if (!token) throw new HttpError(401, "Refresh token inválido");
  if (token.revoked) {
    db.refreshTokens.filter((t) => t.userId === token.userId).forEach((t) => (t.revoked = true));
    save(db);
    throw new HttpError(401, "Refresh token reutilizado: se cerraron todas las sesiones");
  }
  const user = db.users.find((u) => u.id === token.userId);
  if (!user?.active || token.expiresAt < new Date().toISOString()) throw new HttpError(401, "Sesión expirada");
  token.revoked = true;
  return issueTokens(db, user);
});

route("POST", "/auth/logout", async ({ db, body }) => {
  const hash = await sha256(String(body.refreshToken ?? ""));
  db.refreshTokens.filter((t) => t.hash === hash).forEach((t) => (t.revoked = true));
  return noContent;
});

route("GET", "/auth/me", (ctx) => publicUser(auth(ctx)));

route("GET", "/auth/users", (ctx) => {
  auth(ctx, "ADMIN");
  return [...ctx.db.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(publicUser);
});

route("PATCH", "/auth/users/:id", (ctx) => {
  const me = auth(ctx, "ADMIN");
  const user = find(ctx.db.users, (u) => u.id === ctx.params.id, "Usuario");
  if (user.id === me.id) throw new HttpError(409, "No puedes modificar tu propia cuenta");
  if (typeof ctx.body.active === "boolean") {
    user.active = ctx.body.active;
    if (!user.active) ctx.db.refreshTokens.filter((t) => t.userId === user.id).forEach((t) => (t.revoked = true));
  }
  if (ctx.body.role === "BUYER" || ctx.body.role === "PRODUCER" || ctx.body.role === "ADMIN") user.role = ctx.body.role;
  return publicUser(user);
});

route("GET", "/producers", ({ db }) => db.producers);
route("GET", "/producers/mine", (ctx) => {
  auth(ctx, "PRODUCER");
  return ctx.db.producers.filter((p) => p.ownerId === ctx.user!.id);
});
route("GET", "/producers/:id", ({ db, params }) => find(db.producers, (p) => p.id === params.id, "Productor"));

route("POST", "/producers", (ctx) => {
  const user = auth(ctx, "PRODUCER");
  const lat = Number(ctx.body.locationLat);
  const lng = Number(ctx.body.locationLng);
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) throw new HttpError(400, "Coordenadas inválidas");
  const producer = { id: uid(), ownerId: user.id, farmName: str(ctx.body.farmName, "farmName"), locationLat: lat, locationLng: lng, certifications: [] };
  ctx.db.producers.push(producer);
  emit(ctx.db, "producer-service", "producer.created", { producerId: producer.id, ownerId: user.id });
  return created(producer);
});

route("POST", "/producers/:id/certifications", (ctx) => {
  auth(ctx, "PRODUCER", "ADMIN");
  const producer = ownProducer(ctx, ctx.params.id);
  const type = String(ctx.body.type);
  if (!["ORGANIC", "FAIR_TRADE", "DESIGNATION_OF_ORIGIN"].includes(type)) throw new HttpError(400, "Tipo de certificación inválido");
  producer.certifications = [...producer.certifications.filter((c) => c.type !== type), { type, validUntil: date(ctx.body.validUntil, "validUntil") }];
  return created(producer);
});

route("GET", "/products", ({ db, query }) => {
  let list = db.products;
  const producerId = query.get("producerId");
  if (producerId) list = list.filter((p) => p.producerId === producerId);
  if (query.get("inSeason") === "true") list = list.filter((p) => isInSeason(p.seasonMonths));
  return list.map((p) => publicProduct(db, p));
});

route("GET", "/products/:id", ({ db, params }) => publicProduct(db, find(db.products, (p) => p.id === params.id, "Producto")));

route("POST", "/products", (ctx) => {
  auth(ctx, "PRODUCER");
  const producer = ownProducer(ctx, str(ctx.body.producerId, "producerId"));
  const months = Array.isArray(ctx.body.seasonMonths) ? (ctx.body.seasonMonths as unknown[]).map(Number).filter((m) => m >= 1 && m <= 12) : [];
  const product = {
    id: uid(),
    producerId: producer.id,
    name: str(ctx.body.name, "name"),
    category: str(ctx.body.category, "category"),
    basePrice: num(ctx.body.basePrice, "basePrice"),
    requiresColdChain: ctx.body.requiresColdChain === true,
    seasonMonths: months,
  };
  ctx.db.products.push(product);
  trackPrice(ctx.db, product.id, "Precio inicial");
  return created(publicProduct(ctx.db, product));
});

route("GET", "/products/:id/availability", ({ db, params }) => {
  const p = find(db.products, (x) => x.id === params.id, "Producto");
  return { productId: p.id, availableKg: availableKg(db, p.id), currentPrice: quote(db, p).currentPrice };
});

route("GET", "/products/:id/batches", ({ db, params }) =>
  db.batches.filter((b) => b.productId === params.id).map(({ batchId, productId, harvestDate, quantityKg, expiryEstimate }) => ({ batchId, productId, harvestDate, quantityKg, expiryEstimate })),
);

route("POST", "/products/:id/batches", (ctx) => {
  auth(ctx, "PRODUCER");
  const product = find(ctx.db.products, (p) => p.id === ctx.params.id, "Producto");
  ownProducer(ctx, product.producerId);
  const harvestDate = date(ctx.body.harvestDate, "harvestDate");
  const expiryEstimate = date(ctx.body.expiryEstimate, "expiryEstimate");
  if (expiryEstimate < harvestDate) throw new HttpError(400, "La caducidad debe ser posterior a la cosecha");
  const b = addBatch(ctx.db, product, { harvestDate, expiryEstimate, quantityKg: num(ctx.body.quantityKg, "quantityKg") });
  return created({ batchId: b.batchId, productId: b.productId, harvestDate, quantityKg: b.quantityKg, expiryEstimate });
});

const cartOf = (ctx: Ctx) => (ctx.db.carts[auth(ctx, "BUYER").id] ??= []);

route("GET", "/carts/me", (ctx) => ({ buyerId: ctx.user?.id, items: cartOf(ctx) }));

route("PUT", "/carts/me/items", (ctx) => {
  const items = cartOf(ctx);
  const productId = str(ctx.body.productId, "productId");
  find(ctx.db.products, (p) => p.id === productId, "Producto");
  const quantity = num(ctx.body.quantity, "quantity");
  ctx.db.carts[ctx.user!.id] = [...items.filter((i) => i.productId !== productId), { productId, quantity }];
  return { buyerId: ctx.user!.id, items: ctx.db.carts[ctx.user!.id] };
});

route("DELETE", "/carts/me/items/:productId", (ctx) => {
  const items = cartOf(ctx).filter((i) => i.productId !== ctx.params.productId);
  ctx.db.carts[ctx.user!.id] = items;
  return { buyerId: ctx.user!.id, items };
});

route("POST", "/carts/me/checkout", (ctx) => {
  const items = cartOf(ctx);
  const order = createOrder(ctx.db, ctx.user!.id, items, str(ctx.body.deliveryZone, "deliveryZone"), str(ctx.body.deliveryAddress, "deliveryAddress"));
  ctx.db.carts[ctx.user!.id] = [];
  return created(order);
});

route("GET", "/orders/mine", (ctx) => ctx.db.orders.filter((o) => o.buyerId === auth(ctx, "BUYER").id));

route("GET", "/orders", (ctx) => {
  auth(ctx, "ADMIN");
  const status = ctx.query.get("status");
  return status ? ctx.db.orders.filter((o) => o.status === status) : ctx.db.orders;
});

route("GET", "/orders/consolidated", (ctx) => {
  auth(ctx, "ADMIN");
  const byZone: Record<string, { orders: number; totalKg: number; requiresColdChain: boolean; orderIds: string[] }> = {};
  for (const o of ctx.db.orders.filter((o) => o.status === "CONFIRMED" || o.status === "PAID")) {
    const z = (byZone[o.deliveryZone] ??= { orders: 0, totalKg: 0, requiresColdChain: false, orderIds: [] });
    z.orders++;
    z.totalKg = round2(z.totalKg + o.items.reduce((s, i) => s + i.quantity, 0));
    z.requiresColdChain ||= o.requiresColdChain;
    z.orderIds.push(o.id);
  }
  return byZone;
});

const visibleOrder = (ctx: Ctx, id: string) => {
  const user = auth(ctx);
  const order = find(ctx.db.orders, (o) => o.id === id, "Pedido");
  if (user.role !== "ADMIN" && order.buyerId !== user.id) throw new HttpError(404, "Pedido no encontrado");
  return order;
};

route("GET", "/orders/:id", (ctx) => visibleOrder(ctx, ctx.params.id));
route("POST", "/orders/:id/cancel", (ctx) => {
  const order = visibleOrder(ctx, ctx.params.id);
  cancelOrder(ctx.db, order);
  return order;
});

route("GET", "/inventory/stock", (ctx) => {
  const user = auth(ctx, "PRODUCER", "ADMIN");
  const mine = myProducerIds(ctx);
  return ctx.db.batches
    .filter((b) => user.role === "ADMIN" || mine.includes(b.producerId))
    .filter((b) => !ctx.query.get("producerId") || b.producerId === ctx.query.get("producerId"))
    .sort((a, b) => a.expiryEstimate.localeCompare(b.expiryEstimate))
    .map(({ batchId, productId, producerId, quantityAvailable, expiryEstimate }) => ({ batchId, productId, producerId, quantityAvailable: round2(quantityAvailable), expiryEstimate }));
});

route("GET", "/inventory/reservations", (ctx) => {
  const user = auth(ctx, "PRODUCER", "ADMIN");
  if (user.role === "ADMIN") return ctx.db.reservations;
  const mineProducts = new Set(ctx.db.products.filter((p) => myProducerIds(ctx).includes(p.producerId)).map((p) => p.id));
  return ctx.db.reservations
    .map((r) => ({ ...r, allocations: r.allocations.filter((a) => mineProducts.has(a.productId)) }))
    .filter((r) => r.allocations.length > 0);
});

route("POST", "/inventory/reservations/:orderId/release", (ctx) => {
  auth(ctx, "ADMIN");
  const order = ctx.db.orders.find((o) => o.id === ctx.params.orderId);
  if (order && order.status !== "CONFIRMED") throw new HttpError(409, "Solo se liberan reservas de pedidos sin pagar; para los demás cancela el pedido");
  if (!releaseReservation(ctx.db, ctx.params.orderId)) throw new HttpError(404, "No hay una reserva activa para ese pedido");
  return find(ctx.db.reservations, (r) => r.orderId === ctx.params.orderId, "Reserva");
});

route("POST", "/payments", (ctx) => {
  const user = auth(ctx, "BUYER");
  const order = find(ctx.db.orders, (o) => o.id === ctx.body.orderId && o.buyerId === user.id, "Pedido");
  const method = String(ctx.body.method);
  if (!["CARD", "PSE", "CASH_ON_DELIVERY"].includes(method)) throw new HttpError(400, "Método de pago inválido");
  const last4 = method === "CARD" ? String(ctx.body.cardLast4 ?? "") : undefined;
  if (last4 !== undefined && !/^\d{4}$/.test(last4)) throw new HttpError(400, "Tarjeta inválida");
  const payment = pay(ctx.db, order, method as "CARD", last4);
  return payment.status === "DECLINED" ? { __status: 402, body: { error: payment.reason, payment } } : created(payment);
});

route("GET", "/payments/mine", (ctx) => ctx.db.payments.filter((p) => p.buyerId === auth(ctx, "BUYER").id));
route("GET", "/payments", (ctx) => (auth(ctx, "ADMIN"), ctx.db.payments));

route("GET", "/payments/settlements", (ctx) => {
  const user = auth(ctx, "PRODUCER", "ADMIN");
  const mine = myProducerIds(ctx);
  return ctx.db.settlements
    .filter((s) => user.role === "ADMIN" || mine.includes(s.producerId))
    .map((s) => ({ ...s, farmName: ctx.db.producers.find((p) => p.id === s.producerId)?.farmName }));
});

route("POST", "/payments/settlements/:id/pay", (ctx) => {
  auth(ctx, "ADMIN");
  const s = find(ctx.db.settlements, (x) => x.id === ctx.params.id, "Liquidación");
  paySettlement(ctx.db, s);
  return s;
});

route("GET", "/deliveries/mine", (ctx) => ctx.db.deliveries.filter((d) => d.buyerId === auth(ctx, "BUYER").id));
route("GET", "/deliveries", (ctx) => {
  auth(ctx, "ADMIN");
  const status = ctx.query.get("status");
  return status ? ctx.db.deliveries.filter((d) => d.status === status) : ctx.db.deliveries;
});
route("GET", "/deliveries/routes", (ctx) => (auth(ctx, "ADMIN"), ctx.db.routes));
route("POST", "/deliveries/routes", (ctx) => (auth(ctx, "ADMIN"), created(planRoute(ctx.db, str(ctx.body.zone, "zone")))));

route("PATCH", "/deliveries/:id/status", (ctx) => {
  auth(ctx, "ADMIN");
  const d = find(ctx.db.deliveries, (x) => x.id === ctx.params.id, "Entrega");
  advanceDelivery(ctx.db, d, String(ctx.body.status) as "IN_TRANSIT");
  return d;
});

route("POST", "/deliveries/:id/temperature", (ctx) => {
  auth(ctx, "ADMIN");
  const d = find(ctx.db.deliveries, (x) => x.id === ctx.params.id, "Entrega");
  const celsius = Number(ctx.body.celsius);
  if (!Number.isFinite(celsius) || celsius < -30 || celsius > 50) throw new HttpError(400, "Temperatura inválida");
  recordTemperature(ctx.db, d, celsius);
  return created(d);
});

const myNotifications = (ctx: Ctx) => ctx.db.notifications.filter((n) => n.userId === auth(ctx).id);

route("GET", "/notifications/mine", (ctx) => myNotifications(ctx).slice(0, 100));
route("GET", "/notifications/unread-count", (ctx) => ({ count: myNotifications(ctx).filter((n) => !n.read).length }));
route("POST", "/notifications/read-all", (ctx) => {
  myNotifications(ctx).forEach((n) => (n.read = true));
  return noContent;
});
route("POST", "/notifications/:id/read", (ctx) => {
  const n = find(myNotifications(ctx), (x) => x.id === ctx.params.id, "Notificación");
  n.read = true;
  return n;
});

route("GET", "/pricing/rules", (ctx) => (auth(ctx, "ADMIN"), ctx.db.pricingRules));
route("PUT", "/pricing/rules", (ctx) => {
  auth(ctx, "ADMIN");
  const r = ctx.body;
  const pct = (v: unknown, f: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 90) throw new HttpError(400, `${f} debe estar entre 0 y 90 %`);
    return n;
  };
  const rules = {
    lowStockKg: num(r.lowStockKg, "lowStockKg"),
    lowStockSurgePct: pct(r.lowStockSurgePct, "lowStockSurgePct"),
    highStockKg: num(r.highStockKg, "highStockKg"),
    highStockDiscountPct: pct(r.highStockDiscountPct, "highStockDiscountPct"),
    expiryDays: num(r.expiryDays, "expiryDays", -1),
    expiryDiscountPct: pct(r.expiryDiscountPct, "expiryDiscountPct"),
  };
  if (rules.highStockKg <= rules.lowStockKg) throw new HttpError(400, "El umbral de mucha oferta debe ser mayor al de poca oferta");
  ctx.db.pricingRules = rules;
  ctx.db.products.forEach((p) => trackPrice(ctx.db, p.id, "Cambio de reglas"));
  return ctx.db.pricingRules;
});
route("GET", "/pricing/products", (ctx) => {
  auth(ctx, "ADMIN");
  return ctx.db.products.map((p) => ({ productId: p.id, name: p.name, basePrice: p.basePrice, ...quote(ctx.db, p) }));
});
route("GET", "/pricing/history/:productId", (ctx) => (auth(ctx, "ADMIN"), ctx.db.priceHistory.filter((h) => h.productId === ctx.params.productId)));

route("GET", "/analytics/dashboard", (ctx) => {
  auth(ctx, "ADMIN");
  const { db } = ctx;
  const days = Math.min(90, Math.max(7, Number(ctx.query.get("days")) || 14));
  const paid = db.payments.filter((p) => p.status === "AUTHORIZED");
  const revenue = paid.reduce((s, p) => s + p.amount, 0);
  const soldOrders = db.orders.filter((o) => ["PAID", "IN_DELIVERY", "DELIVERED"].includes(o.status));

  const salesByDay = Array.from({ length: days }, (_, i) => {
    const d = toDate(new Date(Date.now() - (days - 1 - i) * 86_400_000));
    const dayPayments = paid.filter((p) => toDate(new Date(p.createdAt)) === d);
    return { date: d, revenue: dayPayments.reduce((s, p) => s + p.amount, 0), orders: dayPayments.length };
  });

  const byProduct = new Map<string, { kg: number; revenue: number }>();
  for (const o of soldOrders)
    for (const i of o.items) {
      const acc = byProduct.get(i.productId) ?? { kg: 0, revenue: 0 };
      byProduct.set(i.productId, { kg: round2(acc.kg + i.quantity), revenue: acc.revenue + i.quantity * i.unitPrice });
    }
  const topProducts = [...byProduct.entries()]
    .map(([productId, v]) => ({ productId, name: db.products.find((p) => p.id === productId)?.name ?? productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const ordersByStatus: Record<string, number> = {};
  db.orders.forEach((o) => (ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1));

  const t = today();
  return {
    revenue,
    commission: db.settlements.filter((s) => s.status !== "CANCELLED").reduce((s, x) => s + x.commission, 0),
    orders: db.orders.length,
    avgTicket: paid.length ? Math.round(revenue / paid.length) : 0,
    ordersByStatus,
    salesByDay,
    topProducts,
    wasteKg: round2(db.batches.filter((b) => b.expiryEstimate < t).reduce((s, b) => s + b.quantityAvailable, 0)),
    atRiskKg: round2(
      db.batches.filter((b) => b.expiryEstimate >= t && daysBetween(t, b.expiryEstimate) <= 3).reduce((s, b) => s + b.quantityAvailable, 0),
    ),
    deliveries: {
      delivered: db.deliveries.filter((d) => d.status === "DELIVERED").length,
      failed: db.deliveries.filter((d) => d.status === "FAILED").length,
      inProgress: db.deliveries.filter((d) => ["PENDING", "ASSIGNED", "IN_TRANSIT"].includes(d.status)).length,
      coldChainBreaches: db.deliveries.filter((d) => d.coldChainBreach).length,
    },
    producers: db.producers.length,
    buyers: db.users.filter((u) => u.role === "BUYER").length,
    recentEvents: db.events.slice(0, 15).map(({ id, type, source, at }) => ({ id, type, source, at })),
  };
});

export async function mockRequest(method: string, fullPath: string, body: unknown, authorization: string | null): Promise<RawResponse> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  const db = await load();
  const url = new URL(fullPath, "http://demo");
  const match = routes.find((r) => r.method === method && r.regex.test(url.pathname));
  if (!match) return { status: 404, body: { error: "Ruta no encontrada en el gateway" } };

  const params: Record<string, string> = {};
  const values = url.pathname.match(match.regex)!.slice(1);
  match.keys.forEach((k, i) => (params[k] = decodeURIComponent(values[i])));

  let user: UserRecord | null = null;
  const token = authorization?.replace(/^Bearer /, "");
  if (token) {
    const payload = decode(token);
    user = db.users.find((u) => u.id === payload?.sub && u.active) ?? null;
    if (!payload || payload.exp * 1000 < Date.now() || !user) return { status: 401, body: { error: "Token inválido o expirado" } };
  }

  try {
    const result = await match.handler({ db, params, query: url.searchParams, body: (body ?? {}) as Record<string, unknown>, user });
    save(db);
    if (result && typeof result === "object" && "__status" in result) {
      const r = result as { __status: number; body: unknown };
      return { status: r.__status, body: r.body };
    }
    return { status: 200, body: structuredClone(result) };
  } catch (err) {
    if (err instanceof HttpError) {
      return { status: err.status, body: { error: err.message } };
    }
    console.error("[demo]", err);
    return { status: 500, body: { error: "Error interno del backend simulado" } };
  }
}
