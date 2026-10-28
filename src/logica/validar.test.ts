import { describe, expect, it } from 'vitest';
import { correoValido, telefonoInternacional, telefonoValido, validarCliente, validarPago } from './validar';

describe('telefonoValido', () => {
  it('acepta celulares venezolanos escritos de varias formas', () => {
    for (const t of ['0414-123-4567', '04121234567', '+58 424 123 4567', '58 416 1234567', '0426 123.45.67']) {
      expect(telefonoValido(t), t).toBe(true);
    }
  });
  it('rechaza números fijos, cortos o de otra operadora inexistente', () => {
    for (const t of ['0212-123-4567', '0414-123-456', '0430-123-4567', 'hola']) {
      expect(telefonoValido(t), t).toBe(false);
    }
  });
});

describe('telefonoInternacional', () => {
  it('cambia el 0 inicial por el 58 de Venezuela', () => {
    expect(telefonoInternacional('0414-123-4567')).toBe('584141234567');
    expect(telefonoInternacional('+58 424 123 4567')).toBe('584241234567');
  });
});

describe('correoValido', () => {
  it('acepta correos normales y rechaza los incompletos', () => {
    expect(correoValido('maria@gmail.com')).toBe(true);
    for (const c of ['maria', 'maria@', 'maria@gmail', 'ma ria@gmail.com']) expect(correoValido(c), c).toBe(false);
  });
});

describe('validarCliente', () => {
  it('pide nombre y celular; el correo es opcional pero, si lo escribe, debe estar bien', () => {
    expect(validarCliente({ nombre: 'María', telefono: '0414-123-4567', correo: '' })).toEqual({});
    expect(Object.keys(validarCliente({ nombre: '', telefono: '0212', correo: 'maria@' })).sort())
      .toEqual(['correo', 'nombre', 'telefono']);
  });
});

describe('validarPago', () => {
  const foto = new File(['x'], 'pago.jpg', { type: 'image/jpeg' });
  it('exige método, referencia y comprobante', () => {
    expect(validarPago({ metodoId: 'zelle', referencia: 'ABC123', comprobante: foto }, ['zelle'])).toEqual({});
    const e = validarPago({ metodoId: '', referencia: '', comprobante: null }, ['zelle']);
    expect(Object.keys(e).sort()).toEqual(['comprobante', 'metodoId', 'referencia']);
  });
  it('solo acepta fotos o PDF como comprobante', () => {
    const texto = new File(['x'], 'pago.txt', { type: 'text/plain' });
    expect(validarPago({ metodoId: 'zelle', referencia: 'ABC123', comprobante: texto }, ['zelle']).comprobante)
      .toBeDefined();
  });
});
