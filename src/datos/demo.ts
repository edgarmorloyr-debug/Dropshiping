import { TIENDA } from '../config';
import { calcularTotales } from '../logica/precios';
import type { Almacen } from './almacen';
import type { Producto } from '../tipos';

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

/** Tasa de ejemplo, solo para la demostración. */
export const TASA_EJEMPLO = 215.5;

const CLAVE_PEDIDOS = 'tienda.demo.pedidos';

type Guardado = Pick<Storage, 'getItem' | 'setItem'>;

export function crearAlmacenDemo(guardado: Guardado | null): Almacen {
  const memoria: unknown[] = [];
  const leer = (): unknown[] => {
    if (!guardado) return memoria;
    try {
      return JSON.parse(guardado.getItem(CLAVE_PEDIDOS) ?? '[]') as unknown[];
    } catch {
      return [];
    }
  };
  const escribir = (pedidos: unknown[]) => {
    if (!guardado) return;
    try {
      guardado.setItem(CLAVE_PEDIDOS, JSON.stringify(pedidos));
    } catch {
      // En modo privado puede fallar; la demostración sigue funcionando igual.
    }
  };

  return {
    modo: 'demo',
    listarProductos: async () => CATALOGO_EJEMPLO,
    obtenerTasa: async () => TASA_EJEMPLO,
    async crearPedido(lineas, envio, pago) {
      const totales = calcularTotales(lineas, CATALOGO_EJEMPLO, TASA_EJEMPLO, TIENDA.maxPorProducto);
      const pedidos = leer();
      const numero = pedidos.length + 1;
      pedidos.push({
        numero,
        fecha: new Date().toISOString(),
        estado: 'por_revisar',
        lineas,
        envio,
        metodoId: pago.metodoId,
        referencia: pago.referencia,
        comprobante: pago.comprobante?.name ?? null,
        totales,
      });
      if (pedidos !== memoria) escribir(pedidos);
      return { numero, totales, metodoId: pago.metodoId };
    },
  };
}
