import { describe, expect, it } from 'vitest';
import { CATALOGO_EJEMPLO, crearAlmacenDemo, DATOS_EJEMPLO, TASA_EJEMPLO } from './demo';
import { ErrorPedido } from '../logica/precios';
import { precioVigente } from '../logica/oferta';

const cliente = { nombre: 'María Pérez', telefono: '0414-123-4567', correo: ' maria@gmail.com ' };
const pago = { metodoId: 'pago_movil', referencia: '123456', comprobante: null };
const guia = CATALOGO_EJEMPLO.find((p) => p.id === 'guia-instagram')!;
const menu = CATALOGO_EJEMPLO.find((p) => p.id === 'plantillas-menu')!;

function guardadoFalso() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

describe('almacén de demostración', () => {
  it('la guía de ejemplo arranca en oferta: $12 → $9', () => {
    expect(guia.precioUsd).toBe(1200);
    expect(precioVigente(guia, new Date())).toBe(900);
  });

  it('cobra el precio vigente (con oferta) y lo convierte con la tasa del día', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    const pedido = await almacen.crearPedido([{ productoId: guia.id, cantidad: 1 }, { productoId: menu.id, cantidad: 1 }], cliente, pago);
    expect(pedido.totales.usd).toBe(900 + 800);
    expect(pedido.totales.ves).toBe(Math.round(1700 * TASA_EJEMPLO));
  });

  it('numera los pedidos uno tras otro', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    const linea = [{ productoId: menu.id, cantidad: 1 }];
    expect((await almacen.crearPedido(linea, cliente, pago)).numero).toBe(1);
    expect((await almacen.crearPedido(linea, cliente, pago)).numero).toBe(2);
  });

  it('funciona aunque el navegador no deje guardar', async () => {
    const almacen = crearAlmacenDemo(null);
    const linea = [{ productoId: menu.id, cantidad: 1 }];
    expect((await almacen.crearPedido(linea, cliente, pago)).numero).toBe(1);
    expect((await almacen.crearPedido(linea, cliente, pago)).numero).toBe(2);
  });

  it('rechaza productos inventados y más de 1 unidad de un producto digital', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    await expect(almacen.crearPedido([{ productoId: 'falso', cantidad: 1 }], cliente, pago)).rejects.toThrow(ErrorPedido);
    await expect(almacen.crearPedido([{ productoId: menu.id, cantidad: 2 }], cliente, pago)).rejects.toThrow(ErrorPedido);
  });

  it('guarda el nombre, el precio del momento y los datos del cliente, para mostrarlos en el panel', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    await almacen.crearPedido([{ productoId: guia.id, cantidad: 1 }], cliente, pago);
    const [pedido] = await almacen.panel.listarPedidos();
    expect(pedido.lineas).toEqual([{ productoId: guia.id, nombre: guia.nombre, cantidad: 1, precioUsd: 900 }]);
    expect(pedido.cliente).toEqual({ nombre: 'María Pérez', telefono: '0414-123-4567', correo: 'maria@gmail.com' });
    expect(pedido.estado).toBe('por_revisar');
  });

  it('el panel cambia el estado solo por los pasos permitidos', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    const { numero } = await almacen.crearPedido([{ productoId: menu.id, cantidad: 1 }], cliente, pago);
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
    const pedido = await almacen.crearPedido([{ productoId: menu.id, cantidad: 1 }], cliente, pago);
    expect(pedido.totales.ves).toBe(800 * 300);
  });

  it('los datos de la tienda se guardan y una forma de pago incompleta deja de aceptarse', async () => {
    const almacen = crearAlmacenDemo(guardadoFalso());
    expect(await almacen.obtenerDatosTienda()).toEqual(DATOS_EJEMPLO);
    await expect(almacen.panel.guardarDatosTienda({ ...DATOS_EJEMPLO, whatsapp: '0414' })).rejects.toThrow(ErrorPedido);
    await almacen.panel.guardarDatosTienda({ ...DATOS_EJEMPLO, nombre: ' Mi Hogar ', cobro: { paypal: { Correo: 'p@x.com' } } });
    expect((await almacen.obtenerDatosTienda()).nombre).toBe('Mi Hogar');
    const linea = [{ productoId: menu.id, cantidad: 1 }];
    await expect(almacen.crearPedido(linea, cliente, pago)).rejects.toThrow('forma de pago');
    await expect(almacen.crearPedido(linea, cliente, { ...pago, metodoId: 'paypal' })).resolves.toMatchObject({ numero: 1 });
  });
});
