import { describe, expect, it } from 'vitest';
import { ofertaActiva, porcentajeDescuento, precioVigente, tiempoRestante } from './oferta';

const AHORA = new Date('2026-10-28T12:00:00Z');
const conOferta = { precioUsd: 1200, ofertaUsd: 900, ofertaFin: '2026-10-28T14:14:37Z' };

describe('precioVigente', () => {
  it('cobra el precio de oferta mientras no termine: $12 → $9', () => {
    expect(ofertaActiva(conOferta, AHORA)).toBe(true);
    expect(precioVigente(conOferta, AHORA)).toBe(900);
  });

  it('cuando el cronómetro llega a cero vuelve al precio normal', () => {
    const justoAlTerminar = new Date('2026-10-28T14:14:37Z');
    expect(precioVigente(conOferta, justoAlTerminar)).toBe(1200);
  });

  it('sin oferta, o con una «oferta» más cara, cobra el precio normal', () => {
    expect(precioVigente({ precioUsd: 1200, ofertaUsd: null, ofertaFin: null }, AHORA)).toBe(1200);
    expect(precioVigente({ ...conOferta, ofertaUsd: 1500 }, AHORA)).toBe(1200);
    expect(precioVigente({ ...conOferta, ofertaFin: 'no es una fecha' }, AHORA)).toBe(1200);
  });
});

describe('porcentajeDescuento', () => {
  it('$12 → $9 es −25 %', () => {
    expect(porcentajeDescuento(conOferta)).toBe(25);
  });
});

describe('tiempoRestante', () => {
  it('cuenta horas, minutos y segundos: 2 h 14 min 37 s', () => {
    expect(tiempoRestante(conOferta.ofertaFin, AHORA)).toEqual({ dias: 0, horas: 2, minutos: 14, segundos: 37 });
  });

  it('separa los días cuando falta más de uno', () => {
    expect(tiempoRestante('2026-10-31T12:00:01Z', AHORA)).toEqual({ dias: 3, horas: 0, minutos: 0, segundos: 1 });
  });

  it('si ya terminó, no hay cronómetro', () => {
    expect(tiempoRestante('2026-10-28T11:59:59Z', AHORA)).toBeNull();
  });
});
