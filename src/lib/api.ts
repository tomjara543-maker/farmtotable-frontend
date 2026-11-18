import { getSession, isExpiring, refreshSession, Session } from "./session";
import { NetworkError, request } from "./transport";

export { API_URL, DEMO_MODE, SHOW_TEST_ACCOUNTS } from "./transport";
export type { Role, Session, User } from "./session";

export interface Producer {
  id: string;
  ownerId: string;
  farmName: string;
  locationLat: number;
  locationLng: number;
  certifications: { type: string; validUntil: string }[];
}

export interface Product {
  id: string;
  producerId: string;
  name: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  requiresColdChain: boolean;
  seasonMonths: number[];
  availableKg: number;
  inSeason: boolean;
}

export interface HarvestBatch {
  batchId: string;
  productId: string;
  harvestDate: string;
  quantityKg: number;
  expiryEstimate: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type OrderStatus =
  | "PENDING_INVENTORY"
  | "CONFIRMED"
  | "PAID"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export interface Order {
  id: string;
  buyerId: string;
  deliveryZone: string;
  deliveryAddress: string;
  status: OrderStatus;
  statusReason?: string;
  requiresColdChain: boolean;
  items: { productId: string; producerId: string; productName?: string; quantity: number; unitPrice: number }[];
  total: number;
  createdAt: string;
}

export type ZoneSummary = Record<
  string,
  { orders: number; totalKg: number; requiresColdChain: boolean; orderIds: string[] }
>;

export interface StockByBatch {
  batchId: string;
  productId: string;
  producerId: string;
  quantityAvailable: number;
  expiryEstimate: string;
}

export interface Reservation {
  orderId: string;
  allocations: { batchId: string; productId: string; quantityKg: number }[];
  status: "RESERVED" | "RELEASED";
  createdAt: string;
}

export type PaymentMethod = "CARD" | "PSE" | "CASH_ON_DELIVERY";

export interface Payment {
  id: string;
  orderId: string;
  buyerId: string;
  amount: number;
  method: PaymentMethod;
  status: "AUTHORIZED" | "DECLINED" | "REFUNDED";
  reason?: string;
  cardLast4?: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  producerId: string;
  farmName?: string;
  orderId: string;
  gross: number;
  commission: number;
  net: number;
  status: "PENDING" | "AVAILABLE" | "PAID" | "CANCELLED";
  createdAt: string;
  paidAt?: string;
}

export type DeliveryStatus = "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "FAILED" | "CANCELLED";

export interface Delivery {
  id: string;
  orderId: string;
  buyerId: string;
  zone: string;
  address: string;
  totalKg: number;
  status: DeliveryStatus;
  requiresColdChain: boolean;
  routeId?: string;
  sequence?: number;
  lat?: number;
  lng?: number;
  geoSource?: "nominatim" | "zone";
  temperatureLog: { celsius: number; at: string }[];
  coldChainBreach: boolean;
  history: { status: DeliveryStatus; at: string }[];
  createdAt: string;
}

export interface DeliveryRoute {
  id: string;
  zone: string;
  deliveryIds: string[];
  totalKg: number;
  requiresColdChain: boolean;
  distanceKm?: number;
  depot?: { name: string; lat: number; lng: number };
  stops?: { id: string; sequence: number; address: string; lat: number; lng: number; coldChain: boolean }[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "ORDER" | "PAYMENT" | "DELIVERY" | "INVENTORY" | "SYSTEM";
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface PricingRules {
  lowStockKg: number;
  lowStockSurgePct: number;
  highStockKg: number;
  highStockDiscountPct: number;
  expiryDays: number;
  expiryDiscountPct: number;
}

export interface ProductPrice {
  productId: string;
  name: string;
  basePrice: number;
  currentPrice: number;
  availableKg: number;
  daysToExpiry: number | null;
  adjustments: { label: string; pct: number }[];
}

export interface PricePoint {
  productId: string;
  price: number;
  reason: string;
  at: string;
}

export interface Dashboard {
  revenue: number;
  commission: number;
  orders: number;
  avgTicket: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  salesByDay: { date: string; revenue: number; orders: number }[];
  topProducts: { productId: string; name: string; kg: number; revenue: number }[];
  wasteKg: number;
  atRiskKg: number;
  deliveries: { delivered: number; failed: number; inProgress: number; coldChainBreaches: number };
  producers: number;
  buyers: number;
  recentEvents: { id: string; type: string; source: string; at: string }[];
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message);
  }
}

function withAuth(init: RequestInit, session: Session | null): RequestInit {
  if (!session) return init;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.accessToken}`);
  return { ...init, headers };
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let session = getSession();
  if (session && isExpiring(session.accessToken)) session = await refreshSession();

  let res;
  try {
    res = await request(path, withAuth(init, session));
    if (res.status === 401 && session) {
      session = await refreshSession();
      if (session) res = await request(path, withAuth(init, session));
    }
  } catch (e) {
    if (e instanceof NetworkError) throw new ApiError(e.message, 0);
    throw e;
  }

  const body = (res.body ?? {}) as { error?: unknown; details?: unknown };
  if (res.status >= 400) throw new ApiError(errorMessage(res.status, body), res.status, body.details ?? body.error);
  return res.body as T;
}

function errorMessage(status: number, body: { error?: unknown }): string {
  if (typeof body.error === "string") return body.error;
  if (status >= 502 && status <= 504) return "Un microservicio no responde. Revisa que todo el backend esté corriendo.";
  if (status === 400 && Array.isArray(body.error)) {
    const fields = body.error.map((issue: { path?: unknown[] }) => issue.path?.join(".")).filter(Boolean);
    return fields.length ? `Datos inválidos en: ${[...new Set(fields)].join(", ")}` : "Datos inválidos";
  }
  if (status === 401) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para esta acción";
  if (status === 404) return "No encontrado";
  return `Error del servidor (${status})`;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data ?? {}) });

export const post = <T>(path: string, data?: unknown) => api<T>(path, json("POST", data));
export const put = <T>(path: string, data: unknown) => api<T>(path, json("PUT", data));
export const patch = <T>(path: string, data: unknown) => api<T>(path, json("PATCH", data));
export const del = <T>(path: string) => api<T>(path, { method: "DELETE" });
