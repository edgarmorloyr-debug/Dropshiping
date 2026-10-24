/** Dinero siempre en centavos (números enteros) para no perder céntimos al sumar. */
export type Centavos = number;

export interface Producto {
  id: string;
  nombre: string;
  frase: string;
  beneficios: string[];
  precioUsd: Centavos;
  /** Emoji que se usa como imagen mientras no haya fotos reales. */
  icono: string;
  color: string;
  destacado?: boolean;
}

export type Moneda = 'USD' | 'VES';

export interface MetodoPago {
  id: string;
  nombre: string;
  /** En qué moneda paga el cliente con este método. */
  moneda: Moneda;
  /** Pares [etiqueta, valor] que el cliente ve para hacer el pago. */
  datos: [string, string][];
}

export interface LineaCarrito {
  productoId: string;
  cantidad: number;
}

export interface DatosEnvio {
  nombre: string;
  telefono: string;
  cedula: string;
  estado: string;
  ciudad: string;
  empresaEnvio: string;
  oficina: string;
}

export interface DatosPago {
  metodoId: string;
  referencia: string;
  comprobante: File | null;
}

export interface Totales {
  usd: Centavos;
  /** Céntimos de bolívar, según la tasa del día. */
  ves: Centavos;
  tasa: number;
}

export interface PedidoCreado {
  numero: number;
  totales: Totales;
  metodoId: string;
}
