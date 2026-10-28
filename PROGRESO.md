# Tienda de dropshipping — Progreso

## En qué vamos

**Productos digitales, Parte 1 de 5 lista para revisar (2026-10-28): diseño nuevo aprobado, página del producto (oferta con cronómetro real, garantía, qué incluye, contenido, preguntas frecuentes, barra de compra fija) y pago sin dirección. SQL nuevo: `003_digitales.sql`. Siguen: Parte 2 «Mi pedido» con descarga automática, Parte 3 productos desde el panel (portada, archivos, muestra), Parte 4 cupones, Parte 5 opiniones. Pendiente: el panel da «Failed to fetch» (revisar `VITE_SUPABASE_URL` en Vercel).**

## Decisiones tomadas (2026-10-24)

| Tema | Decisión | Por qué |
|---|---|---|
| Plataforma | Tienda completa hecha a medida (sin Shopify) | Sin mensualidad y con control total |
| País | Venezuela primero; Colombia después | Elección del dueño |
| Cobro | Solo pago en línea, verificado a mano en un panel privado | En Venezuela no hay cobro automático con tarjeta (Stripe y Mercado Pago no operan ahí) |
| Formas de pago | Pago Móvil, Zelle, Binance (USDT), transferencia bancaria y PayPal | Elección del dueño. PayPal cobra cerca del 5,4 % más un monto fijo |
| Tema | ~~Hogar y cocina~~ → Productos digitales e importados (2026-10-28) | Decisión del dueño: «nosotros solo somos intermediarios» |
| Boceto | Aprobado tal cual: Inicio, Producto, Pagar sin crear cuenta y panel privado | Precio final visible desde el inicio y sin registro obligatorio (las dos causas principales de abandono según Baymard) |
| Base técnica | Vercel (publicar la página) + Supabase (pedidos, comprobantes privados y acceso al panel), en un proyecto de Supabase aparte del de Knight Core | Gratis para empezar y el dueño ya conoce las dos |
| Tienda en demostración | Aprobada tal cual (Inicio, Producto, Carrito, Pagar, Confirmación) | El dueño la probó en su teléfono desde Vercel |
| Ramas | `claude/elegant-hawking-lv5prd` = pruebas; `main` = la que publica la tienda | Lo aprobado pasa a `main` con pruebas, typecheck y build en verde |
| Panel y Supabase | Aprobados (2026-10-25). Variables en Vercel como «Config»: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (clave pública) | El dueño hizo una compra de prueba y la confirmó en el panel |
| Datos personales | Nombre, WhatsApp y datos de cobro van en Supabase y se editan desde el panel; nunca en el código | El repositorio de GitHub es público (2026-10-25) |
| Formas de pago visibles | Solo las que tienen todos sus datos llenos; la base de datos aplica la misma regla | Que nadie pague a datos incompletos o de ejemplo |
| Proveedor | ~~Dropi Venezuela~~ → ya no se usa (2026-10-28) | Ya no se venden productos locales |
| Productos digitales | Cursos, guías o plantillas (propios o con licencia de reventa) | Elección del dueño (2026-10-28). Sin licencia sería piratería |
| Entrega digital | Automática: al tocar «Pago confirmado», el cliente puede descargar desde el enlace secreto de su pedido | Elección del dueño. El pago en Venezuela (Pago Móvil, Zelle…) no se puede confirmar solo; todo lo de después sí |
| Importados | «La forma que se pueda automatizar»: CJ Dropshipping tiene conexión para mandar pedidos solos, pero falta confirmar que envíe a Venezuela | Decisión del dueño (2026-10-28) |
| Orden | Primero digitales, después importados | Elección del dueño (2026-10-28) |
| Camino | Tienda propia (no Hotmart, Gumroad ni Payhip) | Esas plataformas no aceptan Pago Móvil, transferencia ni Binance (2026-10-28) |
| Para vender más | Muestra gratis, garantía de devolución (7 días), opiniones con número de ventas, cupones y oferta por tiempo limitado con cronómetro | Elección del dueño (2026-10-28), copiando lo que funciona en Hotmart y Gumroad |
| Cronómetro | Real: el dueño pone la fecha y hora de fin, igual para todos; el servidor cobra el precio normal si ya terminó. Nunca un cronómetro falso que se reinicia | Uno falso es publicidad engañosa y destruye la confianza |
| Opiniones | Solo de compras verificadas; el dueño decide cuáles se publican | Que no haya opiniones inventadas |
| Diseño | Aprobado (2026-10-28): `bocetos/digitales-real.html` (estilo Hotmart / Stan Store: portada 3D, precio antes/ahora, sellos de confianza, barra de compra fija) | El dueño pidió que no se viera artificial |
| Un botón naranja | La barra de compra fija solo aparece cuando el botón grande ya no se ve | Regla de diseño: una acción principal a la vista |
| Correo automático | Más adelante (necesita un servicio aparte). Al inicio el enlace se muestra en pantalla y por WhatsApp | Empezar sin costos extra |

## Reglas

- El precio y el total se calculan en el servidor, nunca en el teléfono del cliente.
- Un pedido solo se envía al proveedor después de que el dueño marque «Pago confirmado».
- Precios en dólares, con su equivalente en bolívares según la tasa del día.
- Nunca se suben contraseñas ni claves al repositorio.

## Cómo está hecha

- `src/config.ts`: días de entrega, empresas de envío, máximo por producto y qué datos pide cada forma de pago. El nombre, el WhatsApp y los datos de cobro **no** van aquí: el dueño los edita en el panel (Supabase).
- `src/logica/cobro.ts`: qué formas de pago ve el cliente (solo las completas).
- `src/logica/oferta.ts`: precio vigente (oferta solo antes de su fin), % de descuento y tiempo restante del cronómetro.
- `supabase/cambios/003_digitales.sql`: ficha del producto digital, oferta con fin real, pedidos sin dirección (nombre, WhatsApp, correo opcional) y código secreto `token` para «Mi pedido». Probado en `src/datos/digitales.test.ts`.
- `src/logica/`: cálculo de totales y bolívares (en centavos, sin decimales perdidos) y validación de teléfono y cédula venezolanos.
- `src/datos/`: el «almacén». Hoy es de demostración (productos de ejemplo y pedidos guardados en el navegador). El de Supabase cumplirá el mismo contrato.
- `src/pantallas/`: las pantallas del boceto aprobado, más el panel (`Panel.tsx`, en `#/panel`).
- `src/datos/supabase.ts`: el almacén real. Se activa solo si existen `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (en Vercel → Settings → Environment Variables).
- `supabase/cambios/001_tienda.sql`: tablas, permisos, carpeta privada de comprobantes y las funciones `crear_pedido` (calcula el total en el servidor), `cambiar_estado_pedido` y `guardar_tasa`. Probado en `src/datos/supabase.test.ts`.
- `supabase/hacerme_admin.sql`: da acceso al panel al único usuario que exista. `supabase/revisar.sql`: muestra qué está cargado.

## Problemas resueltos

- 2026-10-28 · El dueño no podía entrar al panel (usuario confirmado y administrador, pero nunca había entrado). Se arregló poniéndole una contraseña nueva desde el SQL Editor con `extensions.crypt(...)`. El panel ahora dice si el correo no está confirmado o si la contraseña es incorrecta.

## Pendientes conocidos

- Si el dueño cambia la tasa justo mientras un cliente está pagando, el pedido queda guardado con la tasa nueva. El dueño lo ve en el panel al comparar el monto con el comprobante.
- La demostración no guarda la foto del comprobante (solo su nombre).

| Comando | Qué deberías ver |
|---|---|
| `npm test` | `Tests  70 passed` (o más) |
| `npm run typecheck` | Nada (todo bien) |
| `npm run build` | `built in …` |
| `npm run dev` | Una dirección como `http://localhost:5173` |

## Hoja de ruta

1. Boceto de las pantallas: Inicio, Producto, Pagar y Panel de pedidos. ✅
2. ~~Elegir productos de Dropi~~ (cambio de rumbo 2026-10-28).
3. Construir la tienda (catálogo, carrito, pago con referencia y comprobante). ✅
4. Construir el panel privado de pedidos. ✅ Aprobado y conectado a Supabase.
5. Publicarla en internet (Vercel). ✅ Publicada y conectada a Supabase.
6. Productos digitales: boceto → productos y archivos desde el panel → enlace secreto «Mi pedido» con descarga automática.
7. Productos importados (CJ Dropshipping, si envía a Venezuela).
8. Probar con publicidad pequeña y quedarse con lo que venda.
9. Agregar Colombia.

## Cargado en Supabase (proyecto `tienda`)

- `001_tienda.sql` y `hacerme_admin.sql` (2026-10-25).
- Pendiente de pegar: `002_datos_tienda.sql`. Después, `revisar.sql` debe mostrar 4 filas OK (la de «formas de pago activas» se pone OK cuando el dueño llena sus datos en el panel).

## Pendiente del dueño

- En Vercel, hacer que la tienda se publique desde `main` (Settings → Environments → Production → Branch Tracking).

- Preguntar a CJ Dropshipping si envía a Venezuela, con qué empresa y en cuántos días.
- Tener listos los primeros cursos o guías (propios o con licencia de reventa).
- Elegir el nombre de la tienda.
- Pegar `002_datos_tienda.sql` y `003_digitales.sql` (en ese orden) y llenar sus datos reales en el panel → «Datos de tu tienda».
