import { describe, expect, it } from 'vitest';
import { aBolivares, calcularTotales, ErrorPedido, formatear } from './precios';
import type { Producto } from '../tipos';

const catalogo: Producto[] = [
  { id: 'a', nombre: 'A', frase: '', beneficios: [], precioUsd: 1500, icono: '', color: '' },
  { id: 'b', nombre: 'B', frase: '', beneficios: [], precioUsd: 2250, icono: '', color: '' },
];

describe('calcularTotales', () => {
  it('suma precio × cantidad de cada producto: 2 × $15 + 1 × $22,50 = $52,50', () => {
    const t = calcularTotales(
      [{ productoId: 'a', cantidad: 2 }, { productoId: 'b', cantidad: 1 }],
      catalogo, 100, 5,
    );
    expect(t.usd).toBe(5250);
    expect(t.ves).toBe(525000);
    expect(t.tasa).toBe(100);
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
});
