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
  /** Qué datos pide al dueño (Banco, Teléfono…). */
  campos: string[];
}

/** Una forma de pago con todos sus datos llenos: la que ve el cliente. */
export interface MetodoActivo extends MetodoPago {
  /** Pares [etiqueta, valor] que el cliente ve para hacer el pago. */
  datos: [string, string][];
}

/** Lo que el dueño edita desde su panel. */
export interface DatosTienda {
  nombre: string;
  /** Con código de país y solo dígitos: 584141234567. Vacío si aún no lo puso. */
  whatsapp: string;
  /** { pago_movil: { Banco: '…', Teléfono: '…', Cédula: '…' }, … } */
  cobro: Record<string, Record<string, string>>;
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

export type EstadoPedido = 'por_revisar' | 'pagado' | 'enviado' | 'rechazado';

/** Cada producto del pedido, con el nombre y el precio que tenía al momento de comprar. */
export interface LineaGuardada {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUsd: Centavos;
}

export interface PedidoGuardado {
  numero: number;
  /** Fecha y hora en formato ISO (2026-10-24T21:35:15.676Z). */
  creado: string;
  estado: EstadoPedido;
  lineas: LineaGuardada[];
  envio: DatosEnvio;
  metodoId: string;
  referencia: string;
  /** Ruta del comprobante en la carpeta privada (o su nombre, en la demostración). */
  comprobante: string | null;
  totales: Totales;
}
