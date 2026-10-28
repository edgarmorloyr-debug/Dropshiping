import { TIENDA } from '../config';
import { metodosActivos, whatsappValido } from '../logica/cobro';
import { puedeCambiar } from '../logica/estados';
import { precioVigente } from '../logica/oferta';
import { calcularTotales, ErrorPedido } from '../logica/precios';
import type { Almacen } from './almacen';
import type { DatosTienda, PedidoGuardado, Producto } from '../tipos';

/** Fin de la oferta de ejemplo: 2 h 14 min 37 s después de abrir la demostración. */
const FIN_OFERTA_EJEMPLO = new Date(Date.now() + (2 * 3600 + 14 * 60 + 37) * 1000).toISOString();

/** Productos digitales de ejemplo (los mismos de 003_digitales.sql). El dueño los cambiará por los suyos. */
export const CATALOGO_EJEMPLO: Producto[] = [
  {
    id: 'guia-instagram',
    nombre: 'Vende por Instagram desde cero',
    titular: 'Consigue tus primeros clientes por Instagram en 14 días',
    frase: 'El paso a paso, con plantillas listas para Canva, para que tu negocio venda aunque empieces con 0 seguidores.',
    etiqueta: 'Guía práctica',
    beneficios: [
      'Un perfil que da confianza desde el primer vistazo',
      '30 ideas de publicaciones que venden, listas para copiar',
      'Cómo responder mensajes para cerrar la venta',
      '10 plantillas editables en Canva',
    ],
    incluye: ['45 páginas', '10 plantillas'],
    contenido: [
      { titulo: 'Tu perfil que vende', detalle: '8 págs.' },
      { titulo: 'Qué publicar cada semana', detalle: '12 págs.' },
      { titulo: 'De mensaje a venta', detalle: '10 págs.' },
      { titulo: 'Plantillas para Canva', detalle: '10 diseños' },
    ],
    precioUsd: 1200,
    ofertaUsd: 900,
    ofertaFin: FIN_OFERTA_EJEMPLO,
    garantiaDias: 7,
    colores: ['#4c1d95', '#be185d'],
    destacado: true,
  },
  {
    id: 'plantillas-menu',
    nombre: 'Plantillas de menú para tu negocio',
    titular: 'Un menú bonito en 10 minutos, sin saber diseñar',
    frase: 'Plantillas editables en Canva para restaurantes, panaderías y emprendimientos de comida.',
    etiqueta: 'Plantillas',
    beneficios: [
      'Menús listos para imprimir o compartir por WhatsApp',
      'Cambias precios y fotos en minutos',
      'Diseños que se ven profesionales',
    ],
    incluye: ['20 plantillas', 'Canva'],
    contenido: [
      { titulo: 'Menús de una página', detalle: '8 diseños' },
      { titulo: 'Menús para redes', detalle: '8 diseños' },
      { titulo: 'Listas de precios', detalle: '4 diseños' },
    ],
    precioUsd: 800,
    ofertaUsd: null,
    ofertaFin: null,
    garantiaDias: 7,
    colores: ['#064e3b', '#f59e0b'],
  },
  {
    id: 'finanzas-bolivares',
    nombre: 'Finanzas en dólares y bolívares',
    titular: 'Organiza tu dinero aunque cobres en dos monedas',
    frase: 'Un método sencillo, con hoja de cálculo incluida, para saber cuánto gastas, ahorras y te queda.',
    etiqueta: 'Guía + hoja de cálculo',
    beneficios: [
      'Saber a dónde se va tu dinero cada mes',
      'Ahorrar en dólares aunque cobres en bolívares',
      'Una hoja de cálculo que hace las cuentas por ti',
    ],
    incluye: ['32 páginas', '1 hoja de cálculo'],
    contenido: [
      { titulo: 'Tu foto financiera', detalle: '8 págs.' },
      { titulo: 'Gastar en dos monedas', detalle: '12 págs.' },
      { titulo: 'Tu plan de ahorro', detalle: '12 págs.' },
    ],
    precioUsd: 1000,
    ofertaUsd: null,
    ofertaFin: null,
    garantiaDias: 7,
    colores: ['#1e3a8a', '#0ea5e9'],
  },
];

/** Tasa de ejemplo, solo para la demostración (la misma con la que arranca la base de datos). */
export const TASA_EJEMPLO = 215.5;

/** Datos de ejemplo para la demostración. Los reales los pone el dueño en su panel (Supabase). */
export const DATOS_EJEMPLO: DatosTienda = {
  nombre: 'NOMBRE DE LA TIENDA',
  whatsapp: '580000000000',
  cobro: {
    pago_movil: { Banco: 'Banco de ejemplo (0000)', Teléfono: '0414-000-0000', Cédula: 'V-00.000.000' },
    zelle: { Correo: 'pagos@ejemplo.com', 'A nombre de': 'Nombre de ejemplo' },
    binance: { 'Binance Pay ID o correo': '000000000' },
    transferencia: { Banco: 'Banco de ejemplo', 'Número de cuenta': '0000-0000-00-0000000000', Titular: 'Nombre de ejemplo', 'Cédula o RIF': 'V-00.000.000' },
    paypal: { Correo: 'pagos@ejemplo.com' },
  },
};

const CLAVE_PEDIDOS = 'tienda.demo.pedidos.v3';
const CLAVE_TASA = 'tienda.demo.tasa';
const CLAVE_DATOS = 'tienda.demo.datos';

type Guardado = Pick<Storage, 'getItem' | 'setItem'>;

export function crearAlmacenDemo(guardado: Guardado | null): Almacen {
  // Sin almacenamiento del navegador (modo privado), todo vive en memoria mientras la página esté abierta.
  const memoria = new Map<string, string>();
  const leerTexto = (clave: string) => {
    try {
      return guardado ? guardado.getItem(clave) : memoria.get(clave) ?? null;
    } catch {
      return memoria.get(clave) ?? null;
    }
  };
  const escribirTexto = (clave: string, valor: string) => {
    memoria.set(clave, valor);
    try {
      guardado?.setItem(clave, valor);
    } catch {
      // Se queda en memoria.
    }
  };
  const leerPedidos = (): PedidoGuardado[] => {
    try {
      const datos = JSON.parse(leerTexto(CLAVE_PEDIDOS) ?? '[]');
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };
  const escribirPedidos = (pedidos: PedidoGuardado[]) => escribirTexto(CLAVE_PEDIDOS, JSON.stringify(pedidos));
  const tasa = () => Number(leerTexto(CLAVE_TASA)) || TASA_EJEMPLO;
  const datosTienda = (): DatosTienda => {
    try {
      return JSON.parse(leerTexto(CLAVE_DATOS) ?? 'null') ?? DATOS_EJEMPLO;
    } catch {
      return DATOS_EJEMPLO;
    }
  };

  return {
    modo: 'demo',
    listarProductos: async () => CATALOGO_EJEMPLO,
    obtenerTasa: async () => tasa(),
    obtenerDatosTienda: async () => datosTienda(),

    async crearPedido(lineas, cliente, pago) {
      const ahora = new Date();
      const totales = calcularTotales(lineas, CATALOGO_EJEMPLO, tasa(), TIENDA.maxPorProducto, ahora);
      if (!metodosActivos(datosTienda()).some((m) => m.id === pago.metodoId)) {
        throw new ErrorPedido('Esa forma de pago no está disponible.');
      }
      const pedidos = leerPedidos();
      const numero = pedidos.reduce((mayor, p) => Math.max(mayor, p.numero), 0) + 1;
      pedidos.push({
        numero,
        creado: new Date().toISOString(),
        estado: 'por_revisar',
        lineas: lineas.map((l) => {
          const producto = CATALOGO_EJEMPLO.find((p) => p.id === l.productoId)!;
          return { productoId: l.productoId, nombre: producto.nombre, cantidad: l.cantidad, precioUsd: precioVigente(producto, ahora) };
        }),
        cliente: { ...cliente, correo: cliente.correo.trim() },
        metodoId: pago.metodoId,
        referencia: pago.referencia,
        comprobante: pago.comprobante?.name ?? null,
        totales,
      });
      escribirPedidos(pedidos);
      return { numero, totales, metodoId: pago.metodoId };
    },

    panel: {
      necesitaClave: false,
      sesionActiva: async () => true,
      entrar: async () => undefined,
      salir: async () => undefined,
      listarPedidos: async () => leerPedidos().sort((a, b) => b.numero - a.numero),
      async cambiarEstado(numero, estado) {
        const pedidos = leerPedidos();
        const pedido = pedidos.find((p) => p.numero === numero);
        if (!pedido) throw new ErrorPedido('Ese pedido no existe.');
        if (!puedeCambiar(pedido.estado, estado)) throw new ErrorPedido('Ese cambio no se puede hacer en este pedido.');
        pedido.estado = estado;
        escribirPedidos(pedidos);
      },
      verComprobante: async () => null,
      async guardarTasa(nueva) {
        if (!(nueva > 0) || nueva > 1_000_000) throw new ErrorPedido('Escribe una tasa válida.');
        escribirTexto(CLAVE_TASA, String(nueva));
      },
      async guardarDatosTienda(datos) {
        if (datos.nombre.trim().length < 2 || datos.nombre.trim().length > 60) {
          throw new ErrorPedido('El nombre de la tienda debe tener entre 2 y 60 letras.');
        }
        if (!whatsappValido(datos.whatsapp)) {
          throw new ErrorPedido('Escribe el WhatsApp con código de país, por ejemplo 584141234567.');
        }
        escribirTexto(CLAVE_DATOS, JSON.stringify({ ...datos, nombre: datos.nombre.trim() }));
      },
    },
  };
}
