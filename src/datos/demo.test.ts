import { describe, expect, it } from 'vitest';
import { CATALOGO_EJEMPLO, crearAlmacenDemo, TASA_EJEMPLO } from './demo';
import { ErrorPedido } from '../logica/precios';

const envio = {
  nombre: 'María Pérez', telefono: '0414-123-4567', cedula: 'V-12345678', estado: 'Carabobo',
  ciudad: 'Valencia', empresaEnvio: 'MRW', oficina: 'MRW Av. Bolívar Norte',
};
const pago = { metodoId: 'pago_movil', referencia: '123456', comprobante: null };

function guardadoFalso() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

describe('almacén de demostración', () => {
  it('calcula el total con sus propios precios y la tasa del día', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    const p = CATALOGO_EJEMPLO[0];
    const pedido = await almacen.crearPedido([{ productoId: p.id, cantidad: 2 }], envio, pago);
    expect(pedido.totales.usd).toBe(p.precioUsd * 2);
    expect(pedido.totales.ves).toBe(Math.round(p.precioUsd * 2 * TASA_EJEMPLO));
  });

  it('numera los pedidos uno tras otro', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    const linea = [{ productoId: CATALOGO_EJEMPLO[1].id, cantidad: 1 }];
    expect((await almacen.crearPedido(linea, envio, pago)).numero).toBe(1);
    expect((await almacen.crearPedido(linea, envio, pago)).numero).toBe(2);
  });

  it('funciona aunque el navegador no deje guardar', async () => {
    const almacen = crearAlmacenDemo(null);
    const linea = [{ productoId: CATALOGO_EJEMPLO[1].id, cantidad: 1 }];
    expect((await almacen.crearPedido(linea, envio, pago)).numero).toBe(1);
    expect((await almacen.crearPedido(linea, envio, pago)).numero).toBe(2);
  });

  it('rechaza productos inventados', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    await expect(almacen.crearPedido([{ productoId: 'falso', cantidad: 1 }], envio, pago))
      .rejects.toThrow(ErrorPedido);
  });
});
