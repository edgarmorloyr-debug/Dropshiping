import type { DatosEnvio, DatosPago, LineaCarrito, PedidoCreado, Producto } from '../tipos';
import { crearAlmacenDemo } from './demo';

/**
 * Lo que la tienda necesita de su base de datos. Hoy existe la versión de demostración;
 * la de Supabase cumplirá este mismo contrato, así las pantallas no cambian.
 */
export interface Almacen {
  modo: 'demo' | 'supabase';
  listarProductos(): Promise<Producto[]>;
  /** Bolívares por dólar del día. */
  obtenerTasa(): Promise<number>;
  /** Guarda el pedido. El total lo calcula el almacén con sus propios precios, no el teléfono. */
  crearPedido(lineas: LineaCarrito[], envio: DatosEnvio, pago: DatosPago): Promise<PedidoCreado>;
}

export const almacen: Almacen = crearAlmacenDemo(
  typeof localStorage === 'undefined' ? null : localStorage,
);
