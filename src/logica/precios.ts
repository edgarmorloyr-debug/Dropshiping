import type { Centavos, LineaCarrito, Moneda, Producto, Totales } from '../tipos';

export class ErrorPedido extends Error {}

/**
 * Suma el carrito usando SIEMPRE los precios del catálogo, nunca un precio que mande el teléfono.
 * Es la misma cuenta que hace la base de datos al guardar el pedido.
 */
export function calcularTotales(
  lineas: LineaCarrito[],
  catalogo: Producto[],
  tasa: number,
  maxPorProducto: number,
): Totales {
  if (lineas.length === 0) throw new ErrorPedido('El carrito está vacío.');
  if (!(tasa > 0)) throw new ErrorPedido('Falta la tasa del día.');

  let usd = 0;
  for (const linea of lineas) {
    const producto = catalogo.find((p) => p.id === linea.productoId);
    if (!producto) throw new ErrorPedido('Un producto del carrito ya no está disponible.');
    if (!Number.isInteger(linea.cantidad) || linea.cantidad < 1 || linea.cantidad > maxPorProducto) {
      throw new ErrorPedido(`La cantidad debe estar entre 1 y ${maxPorProducto}.`);
    }
    usd += producto.precioUsd * linea.cantidad;
  }
  return { usd, ves: aBolivares(usd, tasa), tasa };
}

/** Convierte centavos de dólar a céntimos de bolívar, redondeando al céntimo. */
export function aBolivares(usd: Centavos, tasa: number): Centavos {
  return Math.round(usd * tasa);
}

/** «$ 15,00» o «Bs. 3.232,50», con el formato que se usa en Venezuela. */
export function formatear(cantidad: Centavos, moneda: Moneda): string {
  const texto = (cantidad / 100).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return moneda === 'USD' ? `$ ${texto}` : `Bs. ${texto}`;
}
