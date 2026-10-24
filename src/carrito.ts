import { useCallback, useEffect, useState } from 'react';
import { TIENDA } from './config';
import type { LineaCarrito } from './tipos';

const CLAVE = 'tienda.carrito';

function leer(): LineaCarrito[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

const limitar = (n: number) => Math.max(1, Math.min(TIENDA.maxPorProducto, Math.round(n)));

/** El carrito vive en el teléfono; los precios NO se guardan aquí, solo qué y cuánto. */
export function useCarrito() {
  const [lineas, setLineas] = useState<LineaCarrito[]>(leer);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lineas));
    } catch {
      // Sin almacenamiento (modo privado): el carrito dura mientras la página esté abierta.
    }
  }, [lineas]);

  const agregar = useCallback((productoId: string, cantidad: number) => {
    setLineas((actual) => {
      const existe = actual.find((l) => l.productoId === productoId);
      if (!existe) return [...actual, { productoId, cantidad: limitar(cantidad) }];
      return actual.map((l) =>
        l.productoId === productoId ? { ...l, cantidad: limitar(l.cantidad + cantidad) } : l,
      );
    });
  }, []);

  const cambiar = useCallback((productoId: string, cantidad: number) => {
    setLineas((actual) =>
      actual.map((l) => (l.productoId === productoId ? { ...l, cantidad: limitar(cantidad) } : l)),
    );
  }, []);

  const quitar = useCallback((productoId: string) => {
    setLineas((actual) => actual.filter((l) => l.productoId !== productoId));
  }, []);

  const vaciar = useCallback(() => setLineas([]), []);

  const unidades = lineas.reduce((suma, l) => suma + l.cantidad, 0);
  return { lineas, unidades, agregar, cambiar, quitar, vaciar };
}

export type Carrito = ReturnType<typeof useCarrito>;
