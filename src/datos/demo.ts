import { TIENDA } from '../config';
import { metodosActivos, whatsappValido } from '../logica/cobro';
import { puedeCambiar } from '../logica/estados';
import { calcularTotales, ErrorPedido } from '../logica/precios';
import type { Almacen } from './almacen';
import type { DatosTienda, PedidoGuardado, Producto } from '../tipos';

/** Productos de ejemplo: se reemplazan por los reales del catálogo de Dropi. */
export const CATALOGO_EJEMPLO: Producto[] = [
  {
    id: 'organizador-especias',
    nombre: 'Organizador giratorio de especias',
    frase: 'Todas tus especias a la vista, en un solo giro',
    beneficios: ['Ahorra espacio en el mesón', 'Gira 360° para encontrar todo rápido', 'Incluye 12 frascos con tapa'],
    precioUsd: 1800,
    icono: '🧂',
    color: '#f4c27a',
    destacado: true,
  },
  {
    id: 'picador-verduras',
    nombre: 'Picador de verduras manual',
    frase: 'Pica cebolla en segundos y sin lágrimas',
    beneficios: ['3 cuchillas incluidas', 'Se lava fácil', 'Sin electricidad'],
    precioUsd: 1500,
    icono: '🧅',
    color: '#9fd3a8',
  },
  {
    id: 'lampara-sensor',
    nombre: 'Lámpara LED con sensor de movimiento',
    frase: 'Luz automática cuando se va la electricidad',
    beneficios: ['Recargable por USB', 'Se pega sin taladro', 'Se enciende sola al pasar'],
    precioUsd: 1200,
    icono: '💡',
    color: '#a9c4f5',
  },
  {
    id: 'bolsas-vacio',
    nombre: 'Set de bolsas al vacío (10 unidades)',
    frase: 'Guarda la ropa en la mitad del espacio',
    beneficios: ['Con bomba manual incluida', 'Protege de humedad y polvo', 'Reutilizables'],
    precioUsd: 2000,
    icono: '🧺',
    color: '#d7b4ec',
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

const CLAVE_PEDIDOS = 'tienda.demo.pedidos.v2';
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

    async crearPedido(lineas, envio, pago) {
      const totales = calcularTotales(lineas, CATALOGO_EJEMPLO, tasa(), TIENDA.maxPorProducto);
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
          return { productoId: l.productoId, nombre: producto.nombre, cantidad: l.cantidad, precioUsd: producto.precioUsd };
        }),
        envio,
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
