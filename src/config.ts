// Datos fijos de la tienda. El nombre, el WhatsApp y los datos de cobro NO van aquí:
// el dueño los edita desde su panel y se guardan en Supabase (así no quedan en GitHub).

import type { MetodoPago } from './tipos';

export const TIENDA = {
  /** Productos digitales: se compra 1 de cada uno. Debe coincidir con ajustes.max_por_producto (003_digitales.sql). */
  maxPorProducto: 1,
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

/** Preguntas frecuentes que se muestran en cada producto. */
export const PREGUNTAS = [
  {
    pregunta: '¿Cómo lo recibo?',
    respuesta: 'Al terminar tu compra te damos un enlace privado. Apenas confirmamos tu pago, ahí mismo aparece el botón para descargar.',
  },
  {
    pregunta: '¿Cuánto tardan en confirmar mi pago?',
    respuesta: 'Revisamos cada pago a mano, normalmente en pocas horas. Si quieres que sea más rápido, avísanos por WhatsApp al terminar.',
  },
  {
    pregunta: '¿Puedo pagar en bolívares?',
    respuesta: 'Sí. Con Pago Móvil o transferencia pagas en bolívares, al cambio del día que te mostramos al pagar.',
  },
  {
    pregunta: '¿Y si no me sirve?',
    respuesta: 'Tienes garantía: escríbenos dentro del plazo y te devolvemos tu dinero por el mismo medio con que pagaste.',
  },
];
