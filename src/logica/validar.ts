import type { DatosEnvio, DatosPago } from '../tipos';

export type Errores = Partial<Record<keyof DatosEnvio | keyof DatosPago, string>>;

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

/** Cédula venezolana: V o E, seguida de 6 a 9 dígitos (los puntos son opcionales). */
export function cedulaValida(texto: string): boolean {
  return /^[VE]-?\d{6,9}$/i.test(texto.replace(/[\s.]/g, ''));
}

export function validarEnvio(d: DatosEnvio, estados: readonly string[], empresas: readonly string[]): Errores {
  const e: Errores = {};
  if (d.nombre.trim().split(/\s+/).length < 2) e.nombre = 'Escribe tu nombre y apellido.';
  if (!telefonoValido(d.telefono)) e.telefono = 'Escribe un celular válido, por ejemplo 0414-123-4567.';
  if (!cedulaValida(d.cedula)) e.cedula = 'Escribe tu cédula, por ejemplo V-12345678.';
  if (!estados.includes(d.estado)) e.estado = 'Elige tu estado.';
  if (d.ciudad.trim().length < 2) e.ciudad = 'Escribe tu ciudad.';
  if (!empresas.includes(d.empresaEnvio)) e.empresaEnvio = 'Elige la empresa de envío.';
  if (d.oficina.trim().length < 3) e.oficina = 'Escribe la oficina donde retiras el paquete.';
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
