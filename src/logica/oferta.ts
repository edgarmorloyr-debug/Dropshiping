import type { Centavos, Producto } from '../tipos';

type ConPrecio = Pick<Producto, 'precioUsd' | 'ofertaUsd' | 'ofertaFin'>;

/**
 * La oferta vale solo si tiene precio, si es más barata que el precio normal y si su fecha
 * de fin todavía no llegó. Es la misma regla que aplica la base de datos (crear_pedido_digital).
 */
export function ofertaActiva(p: ConPrecio, ahora: Date): boolean {
  if (p.ofertaUsd === null || !p.ofertaFin) return false;
  const fin = new Date(p.ofertaFin).getTime();
  return Number.isFinite(fin) && ahora.getTime() < fin && p.ofertaUsd > 0 && p.ofertaUsd < p.precioUsd;
}

/** El precio que se cobra en este momento. */
export function precioVigente(p: ConPrecio, ahora: Date): Centavos {
  return ofertaActiva(p, ahora) ? p.ofertaUsd! : p.precioUsd;
}

/** «−25 %», redondeado al entero. */
export function porcentajeDescuento(p: ConPrecio): number {
  if (p.ofertaUsd === null || p.ofertaUsd >= p.precioUsd) return 0;
  return Math.round((1 - p.ofertaUsd / p.precioUsd) * 100);
}

export interface Restante {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

/** Cuánto falta para que termine la oferta. Si ya terminó, null. */
export function tiempoRestante(fin: string, ahora: Date): Restante | null {
  const ms = new Date(fin).getTime() - ahora.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    dias: Math.floor(total / 86400),
    horas: Math.floor((total % 86400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}
