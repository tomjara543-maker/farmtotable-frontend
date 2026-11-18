import { CardIcon, PackageIcon, SproutIcon, TruckIcon, WheatIcon } from "@/components/landing/icons";
import type { Delivery, Notification, Order, Payment, PaymentMethod, Settlement } from "./api";

type Badge = { text: string; className: string };

export const orderStatus: Record<Order["status"], Badge> = {
  PENDING_INVENTORY: { text: "Reservando stock", className: "badge-warn" },
  CONFIRMED: { text: "Pendiente de pago", className: "badge-warn" },
  PAID: { text: "Pagado", className: "badge-brand" },
  IN_DELIVERY: { text: "En camino", className: "badge-info" },
  DELIVERED: { text: "Entregado", className: "badge-brand" },
  REJECTED: { text: "Rechazado", className: "badge-danger" },
  CANCELLED: { text: "Cancelado", className: "badge-muted" },
};

export const deliveryStatus: Record<Delivery["status"], Badge> = {
  PENDING: { text: "Por programar", className: "badge-warn" },
  ASSIGNED: { text: "En ruta asignada", className: "badge-info" },
  IN_TRANSIT: { text: "En camino", className: "badge-info" },
  DELIVERED: { text: "Entregado", className: "badge-brand" },
  FAILED: { text: "Fallida", className: "badge-danger" },
  CANCELLED: { text: "Cancelada", className: "badge-muted" },
};

export const paymentStatus: Record<Payment["status"], Badge> = {
  AUTHORIZED: { text: "Aprobado", className: "badge-brand" },
  DECLINED: { text: "Rechazado", className: "badge-danger" },
  REFUNDED: { text: "Reembolsado", className: "badge-muted" },
};

export const settlementStatus: Record<Settlement["status"], Badge> = {
  PENDING: { text: "Espera entrega", className: "badge-warn" },
  AVAILABLE: { text: "Por transferir", className: "badge-info" },
  PAID: { text: "Pagada", className: "badge-brand" },
  CANCELLED: { text: "Anulada", className: "badge-muted" },
};

export const paymentMethod: Record<PaymentMethod, string> = {
  CARD: "Tarjeta",
  PSE: "PSE",
  CASH_ON_DELIVERY: "Contra entrega",
};

export const notificationIcon: Record<Notification["type"], typeof PackageIcon> = {
  ORDER: PackageIcon,
  PAYMENT: CardIcon,
  DELIVERY: TruckIcon,
  INVENTORY: WheatIcon,
  SYSTEM: SproutIcon,
};
