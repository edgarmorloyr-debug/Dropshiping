import { describe, expect, it } from 'vitest';
import { CATALOGO_EJEMPLO, crearAlmacenDemo, DATOS_EJEMPLO, TASA_EJEMPLO } from './demo';
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

  it('guarda el nombre y el precio del momento, para mostrarlos en el panel', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    await almacen.crearPedido([{ productoId: 'picador-verduras', cantidad: 3 }], envio, pago);
    const [pedido] = await almacen.panel.listarPedidos();
    expect(pedido.lineas).toEqual([{ productoId: 'picador-verduras', nombre: 'Picador de verduras manual', cantidad: 3, precioUsd: 1500 }]);
    expect(pedido.estado).toBe('por_revisar');
  });

  it('el panel cambia el estado solo por los pasos permitidos', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    const { numero } = await almacen.crearPedido([{ productoId: 'picador-verduras', cantidad: 1 }], envio, pago);
    await expect(almacen.panel.cambiarEstado(numero, 'enviado')).rejects.toThrow(ErrorPedido);
    await almacen.panel.cambiarEstado(numero, 'pagado');
    await almacen.panel.cambiarEstado(numero, 'enviado');
    expect((await almacen.panel.listarPedidos())[0].estado).toBe('enviado');
  });

  it('la tasa nueva se usa en los pedidos siguientes', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    await expect(almacen.panel.guardarTasa(0)).rejects.toThrow(ErrorPedido);
    await almacen.panel.guardarTasa(300);
    expect(await almacen.obtenerTasa()).toBe(300);
    const pedido = await almacen.crearPedido([{ productoId: 'picador-verduras', cantidad: 1 }], envio, pago);
    expect(pedido.totales.ves).toBe(1500 * 300);
  });

  it('los datos de la tienda se guardan y una forma de pago incompleta deja de aceptarse', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    expect(await almacen.obtenerDatosTienda()).toEqual(DATOS_EJEMPLO);
    await expect(almacen.panel.guardarDatosTienda({ ...DATOS_EJEMPLO, whatsapp: '0414' })).rejects.toThrow(ErrorPedido);
    await almacen.panel.guardarDatosTienda({ ...DATOS_EJEMPLO, nombre: ' Mi Hogar ', cobro: { paypal: { Correo: 'p@x.com' } } });
    expect((await almacen.obtenerDatosTienda()).nombre).toBe('Mi Hogar');
    await expect(almacen.crearPedido([{ productoId: 'picador-verduras', cantidad: 1 }], envio, pago)).rejects.toThrow('forma de pago');
    await expect(almacen.crearPedido([{ productoId: 'picador-verduras', cantidad: 1 }], envio, { ...pago, metodoId: 'paypal' }))
      .resolves.toMatchObject({ numero: 1 });
  });
});
