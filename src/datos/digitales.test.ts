// Prueba supabase/cambios/003_digitales.sql (sobre 001 y 002) en un PostgreSQL de prueba que imita a Supabase.
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { TIENDA } from '../config';
import { calcularTotales } from '../logica/precios';
import { CATALOGO_EJEMPLO, DATOS_EJEMPLO } from './demo';
import { SUPABASE_FALSO, como, leer } from './pruebas/supabaseFalso';

const DUENO = '00000000-0000-0000-0000-00000000000a';
const cliente = { nombre: 'María Pérez', telefono: '0414-123-4567', correo: 'maria@gmail.com' };

const db = new PGlite();
let siguiente = 0;

async function subir() {
  const ruta = `pedidos/digital-${++siguiente}.jpg`;
  await como(db, 'anon', `insert into storage.objects (bucket_id, name) values ('comprobantes', $1)`, [ruta]);
  return ruta;
}

type Creado = { numero: number; total_usd: number; total_ves: number; tasa: string; token: string };
async function pedir(lineas: unknown, datos: Record<string, unknown> = cliente) {
  const [fila] = await como<Creado>(db, 'anon', 'select * from public.crear_pedido_digital($1, $2, $3, $4, $5)', [
    JSON.stringify(lineas), JSON.stringify(datos), 'pago_movil', '123456', await subir(),
  ]);
  return fila;
}
const una = (productoId: string) => [{ productoId, cantidad: 1 }];

beforeAll(async () => {
  await db.exec(SUPABASE_FALSO);
  await db.exec(leer('cambios/001_tienda.sql'));
  await db.query(`insert into auth.users values ($1, 'dueno@prueba.test')`, [DUENO]);
  await db.exec(leer('hacerme_admin.sql'));
  await db.exec(leer('cambios/002_datos_tienda.sql'));
  await como(db, DUENO, 'select public.guardar_datos_tienda($1, $2, $3)', [
    DATOS_EJEMPLO.nombre, DATOS_EJEMPLO.whatsapp, JSON.stringify(DATOS_EJEMPLO.cobro),
  ]);
  await db.exec(leer('cambios/003_digitales.sql'));
}, 30_000);

describe('003 · productos digitales', () => {
  it('se puede ejecutar dos veces sin romper nada', async () => {
    await expect(db.exec(leer('cambios/003_digitales.sql'))).resolves.toBeDefined();
  });

  it('la tienda ve los mismos productos digitales que la demostración, y ya no los de hogar', async () => {
    const filas = await como<Record<string, unknown>>(db, 'anon', 'select * from public.productos where activo order by orden');
    const comoTienda = filas.map((p) => ({
      id: p.id, nombre: p.nombre, titular: p.titular, frase: p.frase, etiqueta: p.etiqueta,
      beneficios: p.beneficios, incluye: p.incluye, contenido: p.contenido,
      precioUsd: p.precio_usd, ofertaUsd: p.oferta_usd, garantiaDias: p.garantia_dias, colores: p.colores, destacado: p.destacado,
    }));
    expect(comoTienda).toEqual(CATALOGO_EJEMPLO.map(({ ofertaFin: _fin, ...p }) => ({ ...p, destacado: Boolean(p.destacado) })));
    // Los de hogar siguen guardados (no se borran), pero ocultos: un visitante no los ve, el dueño sí.
    const ocultos = 'select count(*)::int as n from public.productos where not activo';
    expect((await como<{ n: number }>(db, 'anon', ocultos))[0].n).toBe(0);
    expect((await como<{ n: number }>(db, DUENO, ocultos))[0].n).toBe(4);
  });

  it('un producto digital se compra una vez: el máximo coincide con la tienda', async () => {
    const [a] = await como<{ max_por_producto: number }>(db, 'anon', 'select max_por_producto from public.ajustes');
    expect(a.max_por_producto).toBe(TIENDA.maxPorProducto);
    await expect(pedir([{ productoId: 'plantillas-menu', cantidad: 2 }])).rejects.toThrow('una sola vez');
    await expect(pedir([...una('plantillas-menu'), ...una('plantillas-menu')])).rejects.toThrow('dos veces');
  });

  it('cobra la oferta mientras dura, con la misma cuenta que la tienda', async () => {
    const lineas = [...una('guia-instagram'), ...una('plantillas-menu')];
    const creado = await pedir(lineas);
    const esperado = calcularTotales(lineas, CATALOGO_EJEMPLO, 215.5, TIENDA.maxPorProducto);
    expect(creado.total_usd).toBe(900 + 800);
    expect(creado.total_usd).toBe(esperado.usd);
    expect(Number(creado.total_ves)).toBe(esperado.ves);
  });

  it('cuando el cronómetro llega a cero cobra el precio normal, aunque el teléfono diga otra cosa', async () => {
    await db.exec(`update public.productos set oferta_fin = now() - interval '1 second' where id = 'guia-instagram'`);
    try {
      const creado = await pedir([{ productoId: 'guia-instagram', cantidad: 1, precioUsd: 900 }]);
      expect(creado.total_usd).toBe(1200);
    } finally {
      await db.exec(`update public.productos set oferta_fin = now() + interval '3 days' where id = 'guia-instagram'`);
    }
  });

  it('guarda nombre, WhatsApp y correo (opcional) sin pedir dirección, con un código secreto distinto por pedido', async () => {
    const a = await pedir(una('finanzas-bolivares'));
    const b = await pedir(una('finanzas-bolivares'), { ...cliente, correo: '' });
    expect(a.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.token).not.toBe(b.token);
    const [guardado] = await como<{ nombre: string; correo: string | null; ciudad: string | null }>(
      db, DUENO, 'select nombre, correo, ciudad from public.pedidos where numero = $1', [b.numero]);
    expect(guardado).toEqual({ nombre: 'María Pérez', correo: null, ciudad: null });
  });

  it('rechaza datos del cliente incompletos o un correo mal escrito', async () => {
    await expect(pedir(una('plantillas-menu'), { ...cliente, telefono: '' })).rejects.toThrow('WhatsApp');
    await expect(pedir(una('plantillas-menu'), { ...cliente, correo: 'maria@' })).rejects.toThrow('correo');
  });

  it('un visitante ya no puede usar la función vieja de pedidos con envío', async () => {
    await expect(como(db, 'anon', 'select * from public.crear_pedido($1, $2, $3, $4, $5)', [
      JSON.stringify(una('plantillas-menu')), '{}', 'pago_movil', '123456', await subir(),
    ])).rejects.toThrow();
  });
});
