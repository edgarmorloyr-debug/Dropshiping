# Tienda de dropshipping — Progreso

## En qué vamos

**Paso 3 aprobado (2026-10-24); publicada en https://dropshiping-wine.vercel.app. Paso 4 listo para revisar: panel privado en `#/panel` y conexión a Supabase (`supabase/cambios/001_tienda.sql`). Sin las claves de Supabase todo sigue en modo demostración.**

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
| Tienda en demostración | Aprobada tal cual (Inicio, Producto, Carrito, Pagar, Confirmación) | El dueño la probó en su teléfono desde Vercel |
| Ramas | `claude/elegant-hawking-lv5prd` = pruebas; `main` = la que publica la tienda | Lo aprobado pasa a `main` con pruebas, typecheck y build en verde |
| Proveedor | Dropi Venezuela, por confirmar | Hay que verificar si acepta pedidos ya pagados (trabaja sobre todo contra entrega) |

## Reglas

- El precio y el total se calculan en el servidor, nunca en el teléfono del cliente.
- Un pedido solo se envía al proveedor después de que el dueño marque «Pago confirmado».
- Precios en dólares, con su equivalente en bolívares según la tasa del día.
- Nunca se suben contraseñas ni claves al repositorio.

## Cómo está hecha

- `src/config.ts`: nombre, WhatsApp, días de entrega, empresas de envío y datos de cobro. **Todo lo que el dueño puede querer cambiar está aquí.**
- `src/logica/`: cálculo de totales y bolívares (en centavos, sin decimales perdidos) y validación de teléfono y cédula venezolanos.
- `src/datos/`: el «almacén». Hoy es de demostración (productos de ejemplo y pedidos guardados en el navegador). El de Supabase cumplirá el mismo contrato.
- `src/pantallas/`: las pantallas del boceto aprobado, más el panel (`Panel.tsx`, en `#/panel`).
- `src/datos/supabase.ts`: el almacén real. Se activa solo si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (en Vercel → Settings → Environment Variables).
- `supabase/cambios/001_tienda.sql`: tablas, permisos, carpeta privada de comprobantes y las funciones `crear_pedido` (calcula el total en el servidor), `cambiar_estado_pedido` y `guardar_tasa`. Probado en `src/datos/supabase.test.ts`.
- `supabase/hacerme_admin.sql`: da acceso al panel al único usuario que exista. `supabase/revisar.sql`: muestra qué está cargado.

## Pendientes conocidos

- Si el dueño cambia la tasa justo mientras un cliente está pagando, el pedido queda guardado con la tasa nueva. El dueño lo ve en el panel al comparar el monto con el comprobante.
- La demostración no guarda la foto del comprobante (solo su nombre).

| Comando | Qué deberías ver |
|---|---|
| `npm test` | `Tests  44 passed` (o más) |
| `npm run typecheck` | Nada (todo bien) |
| `npm run build` | `built in …` |
| `npm run dev` | Una dirección como `http://localhost:5173` |

## Hoja de ruta

1. Boceto de las pantallas: Inicio, Producto, Pagar y Panel de pedidos.
2. Elegir de 2 a 3 productos con precios reales del catálogo de Dropi.
3. Construir la tienda (catálogo, carrito, pago con referencia y comprobante).
4. Construir el panel privado de pedidos. ✅ Hecho, esperando aprobación y que el dueño cargue Supabase.
5. Publicarla en internet (Vercel). ✅ Publicada en modo demostración.
6. Probar con publicidad pequeña y quedarse con el producto que venda.
7. Agregar Colombia.

## Pendiente del dueño

- Crear una cuenta en Dropi Venezuela (app.dropi.com.ve) y preguntar si aceptan pedidos ya pagados.
- Elegir el nombre de la tienda.
- Crear un proyecto nuevo en Supabase para la tienda (los pasos se los da Claude).
- Tener a mano los datos de cobro que verán los clientes: Pago Móvil (banco, teléfono, cédula), correo de Zelle, usuario o ID de Binance, cuenta para transferencias y correo de PayPal.
