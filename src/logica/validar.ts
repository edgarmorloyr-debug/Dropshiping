import type { DatosCliente, DatosPago } from '../tipos';

export type Errores = Partial<Record<keyof DatosCliente | keyof DatosPago, string>>;

/** Teléfonos móviles venezolanos: 0412, 0414, 0416, 0422, 0424, 0426 (+ 7 dígitos), con o sin +58. */
export function telefonoValido(texto: string): boolean {
  const digitos = texto.replace(/[\s\-().]/g, '');
  return /^(?:\+?58|0)4(?:12|14|16|22|24|26)\d{7}$/.test(digitos);
}

/** «0414-123-4567» → «584141234567», como lo pide WhatsApp para abrir un chat. */
export function telefonoInternacional(texto: string): string {
  const digitos = texto.replace(/\D/g, '');
  return digitos.startsWith('0') ? `58${digitos.slice(1)}` : digitos;
}

/** Un correo con forma básica: algo@algo.algo, sin espacios. */
export function correoValido(texto: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto.trim());
}

export function validarCliente(c: DatosCliente): Errores {
  const e: Errores = {};
  if (c.nombre.trim().length < 2) e.nombre = 'Escribe tu nombre.';
  if (!telefonoValido(c.telefono)) e.telefono = 'Escribe un celular válido, por ejemplo 0414-123-4567.';
  if (c.correo.trim() && !correoValido(c.correo)) e.correo = 'Revisa tu correo, por ejemplo maria@gmail.com.';
  return e;
}

export function validarPago(p: DatosPago, metodos: readonly string[]): Errores {
  const e: Errores = {};
  if (!metodos.includes(p.metodoId)) e.metodoId = 'Elige cómo vas a pagar.';
  if (p.referencia.trim().length < 4) e.referencia = 'Escribe el número de referencia del pago.';
  if (!p.comprobante) e.comprobante = 'Adjunta la foto o captura del comprobante.';
  else if (!p.comprobante.type.startsWith('image/') && p.comprobante.type !== 'application/pdf') {
    e.comprobante = 'El comprobante debe ser una foto o un PDF.';
  }
  return e;
}
