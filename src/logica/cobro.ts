import { METODOS_PAGO } from '../config';
import type { DatosTienda, MetodoActivo, MetodoPago } from '../tipos';

/**
 * Las formas de pago que el cliente puede usar: solo las que tienen TODOS sus datos llenos.
 * Es la misma regla que aplica la base de datos al guardar (guardar_datos_tienda).
 */
export function metodosActivos(datos: DatosTienda, metodos: MetodoPago[] = METODOS_PAGO): MetodoActivo[] {
  return metodos.flatMap((m) => {
    const valores = datos.cobro[m.id];
    if (!valores) return [];
    const pares = m.campos.map((campo): [string, string] => [campo, (valores[campo] ?? '').trim()]);
    return pares.every(([, valor]) => valor) ? [{ ...m, datos: pares }] : [];
  });
}

/** WhatsApp con código de país y solo dígitos, como lo pide wa.me: 584141234567. */
export function whatsappValido(texto: string): boolean {
  return /^\d{10,15}$/.test(texto);
}
