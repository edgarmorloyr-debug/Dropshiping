import type { EstadoPedido } from '../tipos';

/** Los mismos pasos que permite la base de datos (cambiar_estado_pedido en 001_tienda.sql). */
export const PASOS_PERMITIDOS: Record<EstadoPedido, EstadoPedido[]> = {
  por_revisar: ['pagado', 'rechazado'],
  pagado: ['enviado'],
  enviado: [],
  rechazado: ['por_revisar'],
};

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  por_revisar: 'Por revisar',
  pagado: 'Pagados',
  enviado: 'Entregados',
  rechazado: 'Rechazados',
};

export function puedeCambiar(de: EstadoPedido, a: EstadoPedido): boolean {
  return PASOS_PERMITIDOS[de].includes(a);
}
