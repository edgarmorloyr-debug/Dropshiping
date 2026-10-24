import type { DatosEnvio, DatosPago, EstadoPedido, LineaCarrito, PedidoCreado, PedidoGuardado, Producto } from '../tipos';
import { crearAlmacenDemo } from './demo';
import { crearAlmacenSupabase } from './supabase';

/** Lo que necesita el panel del dueño. */
export interface AlmacenPanel {
  /** En la demostración se entra sin contraseña. */
  necesitaClave: boolean;
  sesionActiva(): Promise<boolean>;
  entrar(correo: string, clave: string): Promise<void>;
  salir(): Promise<void>;
  listarPedidos(): Promise<PedidoGuardado[]>;
  cambiarEstado(numero: number, estado: EstadoPedido): Promise<void>;
  /** Dirección temporal para ver la foto del comprobante (o null si no hay). */
  verComprobante(pedido: PedidoGuardado): Promise<string | null>;
  guardarTasa(tasa: number): Promise<void>;
}

/**
 * Lo que la tienda necesita de su base de datos. La demostración y Supabase cumplen
 * este mismo contrato, así las pantallas no cambian.
 */
export interface Almacen {
  modo: 'demo' | 'supabase';
  listarProductos(): Promise<Producto[]>;
  /** Bolívares por dólar del día. */
  obtenerTasa(): Promise<number>;
  /** Guarda el pedido. El total lo calcula el almacén con sus propios precios, no el teléfono. */
  crearPedido(lineas: LineaCarrito[], envio: DatosEnvio, pago: DatosPago): Promise<PedidoCreado>;
  panel: AlmacenPanel;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Con las dos claves de Supabase (en .env o en Vercel) usa la base real; sin ellas, la demostración. */
export const almacen: Almacen = url && clave
  ? crearAlmacenSupabase(url, clave)
  : crearAlmacenDemo(typeof localStorage === 'undefined' ? null : localStorage);
