import { describe, expect, it } from 'vitest';
import { cedulaValida, telefonoValido, validarEnvio, validarPago } from './validar';

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

describe('cedulaValida', () => {
  it('acepta V o E con o sin guion y puntos', () => {
    for (const c of ['V-12345678', 'v12.345.678', 'E-8123456']) expect(cedulaValida(c), c).toBe(true);
  });
  it('rechaza sin letra o muy corta', () => {
    for (const c of ['12345678', 'V-123', 'J-12345678']) expect(cedulaValida(c), c).toBe(false);
  });
});

const envioBueno = {
  nombre: 'María Pérez', telefono: '0414-123-4567', cedula: 'V-12345678', estado: 'Carabobo',
  ciudad: 'Valencia', empresaEnvio: 'MRW', oficina: 'MRW Av. Bolívar Norte',
};

describe('validarEnvio', () => {
  it('no marca errores si todo está bien', () => {
    expect(validarEnvio(envioBueno, ['Carabobo'], ['MRW'])).toEqual({});
  });
  it('marca cada campo que falta', () => {
    const e = validarEnvio(
      { nombre: 'María', telefono: '', cedula: '', estado: '', ciudad: '', empresaEnvio: '', oficina: '' },
      ['Carabobo'], ['MRW'],
    );
    expect(Object.keys(e).sort()).toEqual(
      ['cedula', 'ciudad', 'empresaEnvio', 'estado', 'nombre', 'oficina', 'telefono'],
    );
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
