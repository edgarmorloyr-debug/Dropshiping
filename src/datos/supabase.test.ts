// Prueba supabase/cambios/001_tienda.sql en un PostgreSQL de prueba que imita a Supabase.
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { METODOS_PAGO, TIENDA } from '../config';
import { calcularTotales } from '../logica/precios';
import { metodosActivos } from '../logica/cobro';
import { CATALOGO_EJEMPLO, DATOS_EJEMPLO } from './demo';
import { SUPABASE_FALSO, como, leer } from './pruebas/supabaseFalso';

const DUENO = '00000000-0000-0000-0000-00000000000a';
const OTRO = '00000000-0000-0000-0000-000000000002';
const envio = {
  nombre: 'María Pérez', telefono: '0414-123-4567', cedula: 'v-12345678', estado: 'Carabobo',
  ciudad: 'Valencia', empresaEnvio: 'MRW', oficina: 'MRW Av. Bolívar Norte',
};

const db = new PGlite();
let siguiente = 0;

/** Sube un comprobante como visitante y devuelve su ruta. */
async function subir(ruta = `pedidos/comprobante-${++siguiente}.jpg`) {
  await como(db, 'anon', `insert into storage.objects (bucket_id, name) values ('comprobantes', $1)`, [ruta]);
  return ruta;
}

type Creado = { numero: number; total_usd: number; total_ves: number; tasa: string };
async function pedir(lineas: unknown, opciones: { metodo?: string; referencia?: string; comprobante?: string } = {}) {
  const comprobante = opciones.comprobante ?? (await subir());
  const [fila] = await como<Creado>(db, 'anon', 'select * from public.crear_pedido($1, $2, $3, $4, $5)', [
    JSON.stringify(lineas), JSON.stringify(envio), opciones.metodo ?? 'pago_movil', opciones.referencia ?? '123456', comprobante,
  ]);
  return fila;
}

beforeAll(async () => {
  await db.exec(SUPABASE_FALSO);
  await db.exec(leer('cambios/001_tienda.sql'));
  await db.query(`insert into auth.users values ($1, 'dueno@prueba.test')`, [DUENO]);
  await db.exec(leer('hacerme_admin.sql'));
  await db.query(`insert into auth.users values ($1, 'otro@prueba.test')`, [OTRO]);
  await db.exec(leer('cambios/002_datos_tienda.sql'));
  await guardarDatos(DATOS_EJEMPLO);
}, 30_000);

function guardarDatos(d: { nombre: string; whatsapp: string; cobro: unknown }, quien = DUENO) {
  return como(db, quien, 'select public.guardar_datos_tienda($1, $2, $3)', [d.nombre, d.whatsapp, JSON.stringify(d.cobro)]);
}
const metodosDeLaBase = async () =>
  (await como<{ metodos_pago: string[] }>(db, 'anon', 'select metodos_pago from public.ajustes'))[0].metodos_pago;

describe('001 · tienda', () => {
  it('se puede ejecutar dos veces sin romper nada', async () => {
    await expect(db.exec(leer('cambios/001_tienda.sql'))).resolves.toBeDefined();
    const [{ n }] = (await db.query<{ n: number }>('select count(*)::int as n from public.productos')).rows;
    expect(n).toBe(CATALOGO_EJEMPLO.length);
  });

  it('los productos y ajustes de la base coinciden con los de la tienda', async () => {
    const productos = await como<Record<string, unknown>>(db, 'anon', 'select * from public.productos order by orden');
    expect(productos.map((p) => ({
      id: p.id, nombre: p.nombre, frase: p.frase, beneficios: p.beneficios, precioUsd: p.precio_usd,
      icono: p.icono, color: p.color, destacado: p.destacado,
    }))).toEqual(CATALOGO_EJEMPLO.map((p) => ({ ...p, destacado: Boolean(p.destacado) })));

    const [ajustes] = await como<{ max_por_producto: number; metodos_pago: string[] }>(db, 'anon', 'select * from public.ajustes');
    expect(ajustes.max_por_producto).toBe(TIENDA.maxPorProducto);
    expect(ajustes.metodos_pago).toEqual(METODOS_PAGO.map((m) => m.id));
  });

  it('un visitante crea un pedido y el total lo calcula la base, igual que la tienda', async () => {
    const lineas = [{ productoId: 'organizador-especias', cantidad: 2 }, { productoId: 'lampara-sensor', cantidad: 1 }];
    const creado = await pedir(lineas);
    const esperado = calcularTotales(lineas, CATALOGO_EJEMPLO, 215.5, TIENDA.maxPorProducto);
    expect(creado.total_usd).toBe(esperado.usd);
    expect(Number(creado.total_ves)).toBe(esperado.ves);

    const [guardado] = await como<{ lineas: unknown; cedula: string; estado: string }>(
      db, DUENO, 'select lineas, cedula, estado from public.pedidos where numero = $1', [creado.numero]);
    expect(guardado.estado).toBe('por_revisar');
    expect(guardado.cedula).toBe('V-12345678');
    expect(guardado.lineas).toEqual([
      { productoId: 'organizador-especias', nombre: 'Organizador giratorio de especias', cantidad: 2, precioUsd: 1800 },
      { productoId: 'lampara-sensor', nombre: 'Lámpara LED con sensor de movimiento', cantidad: 1, precioUsd: 1200 },
    ]);
  });

  it('ignora cualquier precio que mande el teléfono', async () => {
    const creado = await pedir([{ productoId: 'picador-verduras', cantidad: 1, precioUsd: 1 }]);
    expect(creado.total_usd).toBe(1500);
  });

  it.each([
    ['carrito vacío', [], 'El carrito está vacío.'],
    ['producto inventado', [{ productoId: 'falso', cantidad: 1 }], 'ya no está disponible'],
    ['más del máximo', [{ productoId: 'picador-verduras', cantidad: 6 }], 'entre 1 y 5'],
    ['cantidad con decimales', [{ productoId: 'picador-verduras', cantidad: 1.5 }], 'entre 1 y 5'],
    ['cantidad en texto', [{ productoId: 'picador-verduras', cantidad: '2' }], 'entre 1 y 5'],
    ['producto repetido', [{ productoId: 'picador-verduras', cantidad: 1 }, { productoId: 'picador-verduras', cantidad: 1 }], 'dos veces'],
  ])('rechaza: %s', async (_caso, lineas, mensaje) => {
    await expect(pedir(lineas)).rejects.toThrow(mensaje);
  });

  it('rechaza forma de pago desconocida, referencia corta y comprobante que no se subió o ya se usó', async () => {
    const linea = [{ productoId: 'picador-verduras', cantidad: 1 }];
    await expect(pedir(linea, { metodo: 'efectivo' })).rejects.toThrow('forma de pago');
    await expect(pedir(linea, { referencia: '12' })).rejects.toThrow('referencia');
    await expect(pedir(linea, { comprobante: 'pedidos/nunca-subido.jpg' })).rejects.toThrow('comprobante');
    const usado = await subir();
    await pedir(linea, { comprobante: usado });
    await expect(pedir(linea, { comprobante: usado })).rejects.toThrow('comprobante');
  });

  it('no acepta productos desactivados', async () => {
    await db.exec(`update public.productos set activo = false where id = 'bolsas-vacio'`);
    try {
      expect(await como(db, 'anon', `select id from public.productos where id = 'bolsas-vacio'`)).toHaveLength(0);
      await expect(pedir([{ productoId: 'bolsas-vacio', cantidad: 1 }])).rejects.toThrow('ya no está disponible');
    } finally {
      await db.exec(`update public.productos set activo = true where id = 'bolsas-vacio'`);
    }
  });

  it('nadie más que el dueño ve los pedidos ni los comprobantes', async () => {
    await pedir([{ productoId: 'picador-verduras', cantidad: 1 }]);
    await expect(como(db, 'anon', 'select * from public.pedidos')).rejects.toThrow();
    expect(await como(db, OTRO, 'select * from public.pedidos')).toHaveLength(0);
    expect(await como(db, 'anon', 'select * from storage.objects')).toHaveLength(0);
    expect(await como(db, OTRO, 'select * from storage.objects')).toHaveLength(0);
    expect((await como(db, DUENO, 'select * from public.pedidos')).length).toBeGreaterThan(0);
    expect((await como(db, DUENO, 'select * from storage.objects')).length).toBeGreaterThan(0);
  });

  it('un visitante no puede subir archivos fuera de la carpeta de pedidos, ni tocar tablas', async () => {
    await expect(subir('otra/archivo.jpg')).rejects.toThrow();
    await expect(como(db, 'anon', `update public.productos set precio_usd = 1`)).rejects.toThrow();
    await expect(como(db, 'anon', `insert into public.administradores values ('${OTRO}')`)).rejects.toThrow();
  });

  it('el dueño cambia el estado solo por los pasos permitidos', async () => {
    const { numero } = await pedir([{ productoId: 'picador-verduras', cantidad: 1 }]);
    const cambiar = (quien: string, estado: string) =>
      como(db, quien, 'select public.cambiar_estado_pedido($1, $2)', [numero, estado]);
    const estado = async () =>
      (await como<{ estado: string }>(db, DUENO, 'select estado from public.pedidos where numero = $1', [numero]))[0].estado;

    await expect(cambiar(OTRO, 'pagado')).rejects.toThrow('Solo el dueño');
    await expect(cambiar(DUENO, 'enviado')).rejects.toThrow('no se puede');
    await cambiar(DUENO, 'rechazado');
    await cambiar(DUENO, 'por_revisar');
    await cambiar(DUENO, 'pagado');
    await expect(cambiar(DUENO, 'rechazado')).rejects.toThrow('no se puede');
    await cambiar(DUENO, 'enviado');
    expect(await estado()).toBe('enviado');
  });

  it('el dueño cambia la tasa y los pedidos nuevos la usan', async () => {
    await expect(como(db, OTRO, 'select public.guardar_tasa(300)')).rejects.toThrow('Solo el dueño');
    await expect(como(db, DUENO, 'select public.guardar_tasa(0)')).rejects.toThrow('tasa válida');
    await como(db, DUENO, 'select public.guardar_tasa(250.75)');
    try {
      const creado = await pedir([{ productoId: 'picador-verduras', cantidad: 1 }]);
      expect(Number(creado.total_ves)).toBe(Math.round(1500 * 250.75));
    } finally {
      await como(db, DUENO, 'select public.guardar_tasa(215.5)');
    }
  });
});

describe('002 · datos de la tienda', () => {
  it('se puede ejecutar dos veces sin romper nada ni borrar los datos guardados', async () => {
    await expect(db.exec(leer('cambios/002_datos_tienda.sql'))).resolves.toBeDefined();
    expect(await metodosDeLaBase()).toEqual(METODOS_PAGO.map((m) => m.id));
  });

  it('antes de que el dueño ponga sus datos, no hay formas de pago y no se aceptan pedidos', async () => {
    const otra = new PGlite();
    await otra.exec(SUPABASE_FALSO);
    await otra.exec(leer('cambios/001_tienda.sql'));
    await otra.exec(leer('cambios/002_datos_tienda.sql'));
    const [a] = (await otra.query<{ metodos_pago: string[] }>('select metodos_pago from public.ajustes')).rows;
    expect(a.metodos_pago).toEqual([]);
    await otra.query(`insert into storage.objects (bucket_id, name) values ('comprobantes', 'pedidos/x.jpg')`);
    await expect(otra.query('select * from public.crear_pedido($1, $2, $3, $4, $5)', [
      JSON.stringify([{ productoId: 'picador-verduras', cantidad: 1 }]), JSON.stringify(envio), 'pago_movil', '123456', 'pedidos/x.jpg',
    ])).rejects.toThrow('forma de pago');
    await otra.close();
  });

  it('solo quedan activas las formas de pago completas, con la misma regla que la tienda', async () => {
    const parcial = {
      nombre: 'Mi Hogar', whatsapp: '584141234567',
      cobro: {
        pago_movil: { Banco: 'Banco X (0102)', Teléfono: '0414-000-0000', Cédula: 'V-1' },
        zelle: { Correo: 'z@x.com', 'A nombre de': '' },
        paypal: { Correo: 'p@x.com' },
      },
    };
    try {
      await guardarDatos(parcial);
      expect(await metodosDeLaBase()).toEqual(metodosActivos(parcial).map((m) => m.id));
      expect(await metodosDeLaBase()).toEqual(['pago_movil', 'paypal']);
      const [publico] = await como<{ nombre_tienda: string; whatsapp: string }>(db, 'anon', 'select nombre_tienda, whatsapp from public.ajustes');
      expect(publico).toEqual({ nombre_tienda: 'Mi Hogar', whatsapp: '584141234567' });
      await expect(pedir([{ productoId: 'picador-verduras', cantidad: 1 }], { metodo: 'zelle' })).rejects.toThrow('forma de pago');
    } finally {
      await guardarDatos(DATOS_EJEMPLO);
    }
  });

  it('solo el dueño los cambia, y rechaza datos inválidos', async () => {
    await expect(guardarDatos(DATOS_EJEMPLO, OTRO)).rejects.toThrow('Solo el dueño');
    await expect(guardarDatos({ ...DATOS_EJEMPLO, whatsapp: '0414-123' })).rejects.toThrow('WhatsApp');
    await expect(guardarDatos({ ...DATOS_EJEMPLO, nombre: ' ' })).rejects.toThrow('nombre');
    await expect(guardarDatos({ ...DATOS_EJEMPLO, cobro: { efectivo: { Monto: '1' } } })).rejects.toThrow('desconocida');
    await expect(como(db, 'anon', `update public.ajustes set whatsapp = '1'`)).rejects.toThrow();
  });
});

describe('revisar.sql', () => {
  it('con todo cargado, todas las filas dicen OK', async () => {
    const filas = (await db.query<{ cambio: string; estado: string }>(leer('revisar.sql'))).rows;
    expect(filas.map((f) => f.cambio)).toEqual(['001 · tienda', '002 · datos de la tienda', 'formas de pago activas', 'administrador']);
    expect(filas.every((f) => f.estado === 'OK')).toBe(true);
  });
});

describe('hacerme_admin.sql', () => {
  it('solo da acceso si existe un único usuario', async () => {
    const otra = new PGlite();
    await otra.exec(SUPABASE_FALSO);
    await otra.exec(leer('cambios/001_tienda.sql'));
    await otra.query(`insert into auth.users values ($1, 'a@prueba.test'), ($2, 'b@prueba.test')`, [DUENO, OTRO]);
    await otra.exec(leer('hacerme_admin.sql'));
    expect((await otra.query('select * from public.administradores')).rows).toHaveLength(0);
    await otra.close();
  });
});
