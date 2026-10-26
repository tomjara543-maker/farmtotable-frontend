# FarmToTable · Frontend

Marketplace de productos agrícolas directos (Next.js 16 + React 19 + Tailwind 4). Todas las
peticiones van al **API Gateway**; cada pantalla corresponde a uno o varios de los 10 microservicios.

## Cómo levantarlo

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública del API Gateway (`http://localhost:4000/api`) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` = el backend se simula en el navegador (no necesitas los microservicios) |

### Modo demo

Con `NEXT_PUBLIC_DEMO_MODE=true` el frontend usa `src/lib/mock/`, que reproduce en el navegador la
lógica y el flujo de eventos de los 10 microservicios con **el mismo contrato REST** que tendrán los
reales (los datos quedan en `localStorage`). Sirve para probar todo antes de tener el backend con
PostgreSQL. Cuentas de prueba (botones en `/login`):

| Rol | Correo | Contraseña |
|---|---|---|
| Comprador | `comprador@demo.com` | `demo12345` |
| Productor | `productor@demo.com` | `demo12345` |
| Administrador | `admin@farmtotable.com` | `admin12345` |

La franja amarilla superior permite reiniciar los datos de ejemplo. Al tener el backend, cambia a
`NEXT_PUBLIC_DEMO_MODE=false`.

## Autenticación

- `POST /auth/login` / `register` devuelven `accessToken` (JWT, 15 min) + `refreshToken` (opaco, 7 días).
- `src/lib/session.ts`: guarda la sesión, la sincroniza entre pestañas y renueva el access token antes
  de expirar; si el backend responde 401 renueva y reintenta una vez.
- El auth-service **rota** el refresh token en cada uso y, si detecta la reutilización de uno ya usado,
  cierra todas las sesiones. Por eso la renovación es de una en una, incluso entre pestañas (Web Locks).
- `RequireRole` protege cada página (redirige a `/login?next=…`); el backend vuelve a validar el rol
  en cada petición.
- Cerrar sesión revoca el refresh token en el servidor.

## Pantallas

| Ruta | Rol | Microservicios |
|---|---|---|
| `/login`, `/registro` | público | auth |
| `/catalogo` | público (comprar: comprador) | catalog, pricing, order |
| `/carrito` | comprador | order, catalog |
| `/pedidos` | comprador | order, payment (pago con tarjeta / PSE / contra entrega) |
| `/entregas` | comprador: seguimiento · admin: rutas, estados y cadena de frío | logistics |
| `/productor` | productor | producer, catalog |
| `/inventario` | productor, admin | inventory |
| `/pagos` | comprador: pagos · productor: liquidaciones · admin: ambos | payment |
| `/notificaciones` | todos (campana en la barra) | notification |
| `/analitica` | admin | analytics |
| `/zonas` | admin | order |
| `/precios` | admin | pricing |
| `/admin/usuarios` | admin | auth |

## Flujo de un pedido

`order.created` → inventory reserva FEFO → `inventory.reserved` (pedido CONFIRMED) → el comprador paga →
`payment.authorized` (PAID, logistics crea la entrega, payment crea las liquidaciones) → ruta por zona →
`delivery.in_transit` → `delivery.completed` (DELIVERED, liquidaciones disponibles) → el admin transfiere
al productor. Cancelar compensa: libera stock, reembolsa y anula entrega y liquidaciones.

## Despliegue

Vercel: importa el repo y define `NEXT_PUBLIC_API_URL` (URL del gateway en Render) y
`NEXT_PUBLIC_DEMO_MODE`.
