// Todos los datos de la tienda que el dueño puede querer cambiar están aquí.
// Ninguna otra parte del código escribe estos números a mano.

import type { MetodoPago } from './tipos';

export const TIENDA = {
  nombre: 'NOMBRE DE LA TIENDA',
  lema: 'Cosas útiles para tu hogar y tu cocina',
  /** Número de WhatsApp con código de país, sin «+» ni espacios. */
  whatsapp: '580000000000',
  /** Máximo de unidades de un mismo producto por pedido. */
  maxPorProducto: 5,
  /** Días que tarda en llegar un pedido (se muestra al cliente). */
  diasEntrega: { desde: 2, hasta: 5 },
  empresasEnvio: ['MRW', 'Zoom', 'Liberty Express'],
} as const;

/** Formas de pago. Los datos de cobro son de ejemplo hasta que el dueño ponga los suyos. */
export const METODOS_PAGO: MetodoPago[] = [
  {
    id: 'pago_movil',
    nombre: 'Pago Móvil',
    moneda: 'VES',
    datos: [
      ['Banco', 'Banco de ejemplo (0000)'],
      ['Teléfono', '0414-000-0000'],
      ['Cédula', 'V-00.000.000'],
    ],
  },
  {
    id: 'zelle',
    nombre: 'Zelle',
    moneda: 'USD',
    datos: [
      ['Correo', 'pagos@ejemplo.com'],
      ['A nombre de', 'Nombre de ejemplo'],
    ],
  },
  {
    id: 'binance',
    nombre: 'Binance (USDT)',
    moneda: 'USD',
    datos: [
      ['Binance Pay ID', '000000000'],
      ['Moneda', 'USDT'],
    ],
  },
  {
    id: 'transferencia',
    nombre: 'Transferencia',
    moneda: 'VES',
    datos: [
      ['Banco', 'Banco de ejemplo'],
      ['Cuenta', '0000-0000-00-0000000000'],
      ['Titular', 'Nombre de ejemplo · V-00.000.000'],
    ],
  },
  {
    id: 'paypal',
    nombre: 'PayPal',
    moneda: 'USD',
    datos: [['Correo', 'pagos@ejemplo.com']],
  },
];

/** Los 24 estados de Venezuela, para que el cliente elija en vez de escribir. */
export const ESTADOS_VENEZUELA = [
  'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
  'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
  'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
  'Yaracuy', 'Zulia',
];
