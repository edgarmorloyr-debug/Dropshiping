import { describe, expect, it } from 'vitest';
import { puedeCambiar } from './estados';

describe('puedeCambiar', () => {
  it('sigue el camino revisar → pagado → enviado', () => {
    expect(puedeCambiar('por_revisar', 'pagado')).toBe(true);
    expect(puedeCambiar('pagado', 'enviado')).toBe(true);
  });
  it('un rechazo se puede deshacer, un pago confirmado no', () => {
    expect(puedeCambiar('por_revisar', 'rechazado')).toBe(true);
    expect(puedeCambiar('rechazado', 'por_revisar')).toBe(true);
    expect(puedeCambiar('pagado', 'rechazado')).toBe(false);
  });
  it('no se salta pasos ni cambia un pedido enviado', () => {
    expect(puedeCambiar('por_revisar', 'enviado')).toBe(false);
    expect(puedeCambiar('enviado', 'pagado')).toBe(false);
  });
});
