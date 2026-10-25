import { describe, expect, it } from 'vitest';
import { metodosActivos, whatsappValido } from './cobro';

const datos = (cobro: Record<string, Record<string, string>>) => ({ nombre: 'Tienda', whatsapp: '584141234567', cobro });

describe('metodosActivos', () => {
  it('sin datos de cobro no hay ninguna forma de pago', () => {
    expect(metodosActivos(datos({}))).toEqual([]);
  });

  it('muestra solo las formas de pago con todos sus datos llenos, en el orden de la tienda', () => {
    const activos = metodosActivos(datos({
      paypal: { Correo: 'pagos@tienda.com' },
      pago_movil: { Banco: 'Banco X (0102)', Teléfono: '0414-000-0000', Cédula: 'V-1' },
      zelle: { Correo: 'z@tienda.com', 'A nombre de': '  ' },
    }));
    expect(activos.map((m) => m.id)).toEqual(['pago_movil', 'paypal']);
    expect(activos[0].datos).toEqual([['Banco', 'Banco X (0102)'], ['Teléfono', '0414-000-0000'], ['Cédula', 'V-1']]);
  });

  it('si falta un campo, la forma de pago no aparece', () => {
    expect(metodosActivos(datos({ pago_movil: { Banco: 'Banco X', Teléfono: '0414' } }))).toEqual([]);
  });
});

describe('whatsappValido', () => {
  it('pide solo dígitos con código de país', () => {
    expect(whatsappValido('584141234567')).toBe(true);
    expect(whatsappValido('0414-123-4567')).toBe(false);
    expect(whatsappValido('')).toBe(false);
  });
});
