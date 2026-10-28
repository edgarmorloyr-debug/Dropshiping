/** Dinero siempre en centavos (números enteros) para no perder céntimos al sumar. */
export type Centavos = number;

/** Un producto digital: curso, guía o plantillas. */
export interface Producto {
  id: string;
  /** Nombre corto, el que va en la portada. */
  nombre: string;
  /** Titular con el beneficio: «Consigue tus primeros clientes…». */
  titular: string;
  /** Subtítulo que aclara el titular. */
  frase: string;
  /** Tipo que se lee en la portada: «Guía práctica», «Plantillas», «Curso». */
  etiqueta: string;
  /** «Lo que vas a lograr». */
  beneficios: string[];
  /** Lo que recibe, en pocas palabras: «45 páginas», «10 plantillas». */
  incluye: string[];
  /** Partes del contenido: título y detalle («8 págs.»). */
  contenido: { titulo: string; detalle: string }[];
  precioUsd: Centavos;
  /** Precio de oferta y hasta cuándo dura (fecha ISO). Sin oferta: null. */
  ofertaUsd: Centavos | null;
  ofertaFin: string | null;
  garantiaDias: number;
  /** Dos colores para la portada, mientras no haya imagen subida. */
  colores: [string, string];
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

/** A quién avisamos. Los productos digitales no necesitan dirección de envío. */
export interface DatosCliente {
  nombre: string;
  telefono: string;
  /** Opcional. */
  correo: string;
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
  cliente: DatosCliente;
  metodoId: string;
  referencia: string;
  /** Ruta del comprobante en la carpeta privada (o su nombre, en la demostración). */
  comprobante: string | null;
  totales: Totales;
}
