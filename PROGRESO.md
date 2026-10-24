# Tienda de dropshipping — Progreso

## En qué vamos

**Paso 1 listo: boceto aprobado por el dueño (2026-10-24), en `bocetos/`. Base técnica elegida: Vercel + Supabase. Sigue: construir la tienda con productos de ejemplo mientras el dueño hace sus pendientes.**

## Decisiones tomadas (2026-10-24)

| Tema | Decisión | Por qué |
|---|---|---|
| Plataforma | Tienda completa hecha a medida (sin Shopify) | Sin mensualidad y con control total |
| País | Venezuela primero; Colombia después | Elección del dueño |
| Cobro | Solo pago en línea, verificado a mano en un panel privado | En Venezuela no hay cobro automático con tarjeta (Stripe y Mercado Pago no operan ahí) |
| Formas de pago | Pago Móvil, Zelle, Binance (USDT), transferencia bancaria y PayPal | Elección del dueño. PayPal cobra cerca del 5,4 % más un monto fijo |
| Tema | Hogar y cocina | Cavecom-e: lo más vendido por internet en Venezuela (dato de 2024) |
| Boceto | Aprobado tal cual: Inicio, Producto, Pagar sin crear cuenta y panel privado | Precio final visible desde el inicio y sin registro obligatorio (las dos causas principales de abandono según Baymard) |
| Base técnica | Vercel (publicar la página) + Supabase (pedidos, comprobantes privados y acceso al panel), en un proyecto de Supabase aparte del de Knight Core | Gratis para empezar y el dueño ya conoce las dos |
| Proveedor | Dropi Venezuela, por confirmar | Hay que verificar si acepta pedidos ya pagados (trabaja sobre todo contra entrega) |

## Reglas

- El precio y el total se calculan en el servidor, nunca en el teléfono del cliente.
- Un pedido solo se envía al proveedor después de que el dueño marque «Pago confirmado».
- Precios en dólares, con su equivalente en bolívares según la tasa del día.
- Nunca se suben contraseñas ni claves al repositorio.

## Hoja de ruta

1. Boceto de las pantallas: Inicio, Producto, Pagar y Panel de pedidos.
2. Elegir de 2 a 3 productos con precios reales del catálogo de Dropi.
3. Construir la tienda (catálogo, carrito, pago con referencia y comprobante).
4. Construir el panel privado de pedidos.
5. Publicarla en internet (Vercel).
6. Probar con publicidad pequeña y quedarse con el producto que venda.
7. Agregar Colombia.

## Pendiente del dueño

- Crear una cuenta en Dropi Venezuela (app.dropi.com.ve) y preguntar si aceptan pedidos ya pagados.
- Elegir el nombre de la tienda.
- Crear un proyecto nuevo en Supabase para la tienda (los pasos se los da Claude).
- Tener a mano los datos de cobro que verán los clientes: Pago Móvil (banco, teléfono, cédula), correo de Zelle, usuario o ID de Binance, cuenta para transferencias y correo de PayPal.
