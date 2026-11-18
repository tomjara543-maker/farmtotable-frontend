import { CartIcon, SproutIcon, WrenchIcon } from "@/components/landing/icons";
export const DEMO_ACCOUNTS = [
  { email: "comprador@demo.com", password: "demo12345", label: "Comprador", icon: CartIcon },
  { email: "productor@demo.com", password: "demo12345", label: "Productor", icon: SproutIcon },
  { email: "admin@farmtotable.com", password: "admin12345", label: "Administrador", icon: WrenchIcon },
] as const;
