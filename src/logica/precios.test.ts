import { describe, expect, it } from 'vitest';
import { aBolivares, calcularTotales, ErrorPedido, formatear, formatearCorto } from './precios';
import type { Producto } from '../tipos';

const AHORA = new Date('2026-10-28T12:00:00Z');
const producto = (id: string, precioUsd: number, oferta: Partial<Producto> = {}): Producto => ({
  id, nombre: id, titular: '', frase: '', etiqueta: '', beneficios: [], incluye: [], contenido: [],
  precioUsd, ofertaUsd: null, ofertaFin: null, garantiaDias: 7, colores: ['#000', '#fff'], ...oferta,
});
const catalogo = [
  producto('a', 1500),
  producto('b', 2250),
  producto('c', 1200, { ofertaUsd: 900, ofertaFin: '2026-10-28T14:00:00Z' }),
];

describe('calcularTotales', () => {
  it('suma precio × cantidad de cada producto: 2 × $15 + 1 × $22,50 = $52,50', () => {
    const t = calcularTotales(
      [{ productoId: 'a', cantidad: 2 }, { productoId: 'b', cantidad: 1 }],
      catalogo, 100, 5, AHORA,
    );
    expect(t.usd).toBe(5250);
    expect(t.ves).toBe(525000);
    expect(t.tasa).toBe(100);
  });

  it('usa el precio de oferta mientras dura, y el normal cuando terminó', () => {
    const linea = [{ productoId: 'c', cantidad: 1 }];
    expect(calcularTotales(linea, catalogo, 100, 1, AHORA).usd).toBe(900);
    expect(calcularTotales(linea, catalogo, 100, 1, new Date('2026-10-28T14:00:01Z')).usd).toBe(1200);
  });

  it('rechaza un carrito vacío', () => {
    expect(() => calcularTotales([], catalogo, 100, 5)).toThrow(ErrorPedido);
  });

  it('rechaza un producto que no está en el catálogo', () => {
    expect(() => calcularTotales([{ productoId: 'x', cantidad: 1 }], catalogo, 100, 5)).toThrow(ErrorPedido);
  });

  it('rechaza cantidades fuera de 1 al máximo, o con decimales', () => {
    for (const cantidad of [0, -1, 6, 1.5]) {
      expect(() => calcularTotales([{ productoId: 'a', cantidad }], catalogo, 100, 5)).toThrow(ErrorPedido);
    }
  });

  it('rechaza si no hay tasa del día', () => {
    expect(() => calcularTotales([{ productoId: 'a', cantidad: 1 }], catalogo, 0, 5)).toThrow(ErrorPedido);
  });
});

describe('aBolivares', () => {
  it('redondea al céntimo: $15,00 a 215,55 Bs./$ = Bs. 3.233,25', () => {
    expect(aBolivares(1500, 215.55)).toBe(323325);
  });
  it('redondea medio céntimo hacia arriba: $0,01 a 0,5 = 1 céntimo', () => {
    expect(aBolivares(1, 0.5)).toBe(1);
  });
});

describe('formatear', () => {
  it('usa coma para decimales y punto para miles', () => {
    expect(formatear(323325, 'VES')).toBe('Bs. 3.233,25');
    expect(formatear(1500, 'USD')).toBe('$ 15,00');
  });
  it('el formato corto quita los ,00', () => {
    expect(formatearCorto(900)).toBe('$ 9');
    expect(formatearCorto(810)).toBe('$ 8,10');
  });
});
