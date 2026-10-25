// Datos fijos de la tienda. El nombre, el WhatsApp y los datos de cobro NO van aquí:
// el dueño los edita desde su panel y se guardan en Supabase (así no quedan en GitHub).

import type { MetodoPago } from './tipos';

export const TIENDA = {
  lema: 'Cosas útiles para tu hogar y tu cocina',
  /** Máximo de unidades de un mismo producto por pedido. */
  maxPorProducto: 5,
  /** Días que tarda en llegar un pedido (se muestra al cliente). */
  diasEntrega: { desde: 2, hasta: 5 },
  empresasEnvio: ['MRW', 'Zoom', 'Liberty Express'],
} as const;

/**
 * Formas de pago y qué datos pide cada una al dueño. Una forma de pago solo se muestra
 * al cliente cuando el dueño llenó todos sus datos en el panel.
 * Los id deben coincidir con los de guardar_datos_tienda (002_datos_tienda.sql).
 */
export const METODOS_PAGO: MetodoPago[] = [
  { id: 'pago_movil', nombre: 'Pago Móvil', moneda: 'VES', campos: ['Banco', 'Teléfono', 'Cédula'] },
  { id: 'zelle', nombre: 'Zelle', moneda: 'USD', campos: ['Correo', 'A nombre de'] },
  { id: 'binance', nombre: 'Binance (USDT)', moneda: 'USD', campos: ['Binance Pay ID o correo'] },
  { id: 'transferencia', nombre: 'Transferencia', moneda: 'VES', campos: ['Banco', 'Número de cuenta', 'Titular', 'Cédula o RIF'] },
  { id: 'paypal', nombre: 'PayPal', moneda: 'USD', campos: ['Correo'] },
];

/** Los 24 estados de Venezuela, para que el cliente elija en vez de escribir. */
export const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
  'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
  'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
  'Yaracuy', 'Zulia',
];
