import {
  addBatch,
  addDays,
  advanceDelivery,
  createOrder,
  Db,
  nowIso,
  pay,
  paySettlement,
  planRoute,
  ProductRecord,
  setClockOffset,
  sha256,
  UserRecord,
} from "./engine";

export async function seed(): Promise<Db> {
  const db: Db = {
    users: [],
    refreshTokens: [],
    producers: [],
    products: [],
    batches: [],
    carts: {},
    orders: [],
    reservations: [],
    payments: [],
    settlements: [],
    deliveries: [],
    routes: [],
    notifications: [],
    pricingRules: {
      lowStockKg: 50,
      lowStockSurgePct: 20,
      highStockKg: 1000,
      highStockDiscountPct: 15,
      expiryDays: 3,
      expiryDiscountPct: 25,
    },
    priceHistory: [],
    events: [],
  };

  setClockOffset(14);
  const user = async (id: string, email: string, name: string, role: UserRecord["role"], password: string) => {
    const u: UserRecord = { id, email, name, role, active: true, passwordHash: await sha256(password), createdAt: nowIso() };
    db.users.push(u);
    return u;
  };
  const admin = await user("u-admin", "admin@farmtotable.com", "Administrador", "ADMIN", "admin12345");
  const farmer = await user("u-productor", "productor@demo.com", "Marta Rojas", "PRODUCER", "demo12345");
  const farmer2 = await user("u-productor2", "elroble@demo.com", "Jorge Díaz", "PRODUCER", "demo12345");
  const buyer = await user("u-comprador", "comprador@demo.com", "Laura Gómez", "BUYER", "demo12345");
  const restaurant = await user("u-restaurante", "restaurante@demo.com", "Restaurante Sabores", "BUYER", "demo12345");
  void admin;

  db.producers.push(
    {
      id: "p-esperanza",
      ownerId: farmer.id,
      farmName: "Granja La Esperanza",
      locationLat: 4.8133,
      locationLng: -75.6961,
      certifications: [{ type: "ORGANIC", validUntil: addDays(400) }],
    },
    {
      id: "p-roble",
      ownerId: farmer2.id,
      farmName: "Finca El Roble",
      locationLat: 5.0689,
      locationLng: -75.5174,
      certifications: [
        { type: "FAIR_TRADE", validUntil: addDays(200) },
        { type: "DESIGNATION_OF_ORIGIN", validUntil: addDays(30) },
      ],
    },
  );

  const allMonths: number[] = [];
  const product = (p: ProductRecord) => (db.products.push(p), p);
  const tomate = product({ id: "pr-tomate", producerId: "p-esperanza", name: "Tomate chonto", category: "Hortalizas", basePrice: 3800, requiresColdChain: false, seasonMonths: allMonths });
  const fresa = product({ id: "pr-fresa", producerId: "p-esperanza", name: "Fresa", category: "Frutas", basePrice: 9500, requiresColdChain: true, seasonMonths: allMonths });
  const papa = product({ id: "pr-papa", producerId: "p-esperanza", name: "Papa criolla", category: "Tubérculos", basePrice: 4200, requiresColdChain: false, seasonMonths: allMonths });
  const queso = product({ id: "pr-queso", producerId: "p-roble", name: "Queso campesino", category: "Lácteos", basePrice: 22000, requiresColdChain: true, seasonMonths: allMonths });
  const aguacate = product({ id: "pr-aguacate", producerId: "p-roble", name: "Aguacate Hass", category: "Frutas", basePrice: 7800, requiresColdChain: false, seasonMonths: allMonths });
  const cafe = product({ id: "pr-cafe", producerId: "p-roble", name: "Café especial", category: "Café", basePrice: 38000, requiresColdChain: false, seasonMonths: [9, 10, 11, 12, 1] });

  addBatch(db, tomate, { harvestDate: addDays(0), quantityKg: 120, expiryEstimate: addDays(18) });
  addBatch(db, fresa, { harvestDate: addDays(0), quantityKg: 40, expiryEstimate: addDays(9) });
  addBatch(db, papa, { harvestDate: addDays(0), quantityKg: 300, expiryEstimate: addDays(40) });
  addBatch(db, queso, { harvestDate: addDays(0), quantityKg: 25, expiryEstimate: addDays(12) });
  addBatch(db, aguacate, { harvestDate: addDays(0), quantityKg: 90, expiryEstimate: addDays(13) });
  addBatch(db, cafe, { harvestDate: addDays(0), quantityKg: 60, expiryEstimate: addDays(200) });

  type Step = [number, () => void];
  const addresses: Record<string, string> = { Centro: "Cra 7 # 12-40", Norte: "Calle 140 # 19-22", Sur: "Av. Boyacá # 52-10 sur" };
  const order = (buyerId: string, items: [ProductRecord, number][], zone: string, final: "DELIVERED" | "PAID" | "CONFIRMED") => () => {
    const o = createOrder(db, buyerId, items.map(([p, q]) => ({ productId: p.id, quantity: q })), zone, addresses[zone]);
    if (final === "CONFIRMED") return;
    const card = db.payments.length % 2 === 0;
    pay(db, o, card ? "CARD" : "PSE", card ? "4242" : undefined);
    if (final !== "DELIVERED") return;
    planRoute(db, zone);
    const delivery = db.deliveries.find((d) => d.orderId === o.id)!;
    advanceDelivery(db, delivery, "IN_TRANSIT");
    if (delivery.requiresColdChain) delivery.temperatureLog.push({ celsius: 4.2, at: nowIso() });
    advanceDelivery(db, delivery, "DELIVERED");
  };
  const batch = (p: ProductRecord, quantityKg: number, shelfDays: number) => () =>
    addBatch(db, p, { harvestDate: addDays(0), quantityKg, expiryEstimate: addDays(shelfDays) });

  const timeline: Step[] = [
    [12, order(restaurant.id, [[tomate, 20], [papa, 30]], "Centro", "DELIVERED")],
    [10, order(buyer.id, [[fresa, 3], [aguacate, 4]], "Norte", "DELIVERED")],
    [8, order(restaurant.id, [[queso, 5], [tomate, 15]], "Centro", "DELIVERED")],
    [6, batch(fresa, 18, 8)],
    [6, order(buyer.id, [[cafe, 2], [papa, 10]], "Norte", "DELIVERED")],
    [4, order(restaurant.id, [[aguacate, 12], [fresa, 6]], "Centro", "DELIVERED")],
    [3, batch(queso, 20, 15)],
    [2, batch(aguacate, 60, 12)],
    [2, order(restaurant.id, [[papa, 25], [queso, 3]], "Sur", "PAID")],
    [1, order(buyer.id, [[tomate, 4], [fresa, 2]], "Norte", "PAID")],
    [0, order(buyer.id, [[aguacate, 3]], "Norte", "CONFIRMED")],
  ];
  for (const [daysAgo, run] of timeline) {
    setClockOffset(daysAgo);
    run();
  }
  setClockOffset(0);

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  db.settlements.filter((s) => s.status === "AVAILABLE" && s.createdAt < weekAgo).forEach((s) => paySettlement(db, s));

  db.carts[buyer.id] = [{ productId: papa.id, quantity: 2 }];
  const todayIso = nowIso().slice(0, 10);
  db.notifications.forEach((n) => (n.read = n.createdAt.slice(0, 10) !== todayIso));
  return db;
}
