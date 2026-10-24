import type { Centavos, Producto } from '../tipos';
import { aBolivares, formatear } from '../logica/precios';

export function Imagen({ producto, tamano = 'grande' }: { producto: Producto; tamano?: 'grande' | 'chica' | 'mini' }) {
  return (
    <div
      className={`imagen ${tamano === 'grande' ? '' : tamano}`}
      style={{ background: producto.color }}
      role="img"
      aria-label={`Foto de ${producto.nombre}`}
    >
      <span aria-hidden="true">{producto.icono}</span>
    </div>
  );
}

/** Precio en dólares y, al lado, su equivalente en bolívares con la tasa del día. */
export function Precio({ usd, tasa }: { usd: Centavos; tasa: number | null }) {
  return (
    <div>
      <span className="precio">{formatear(usd, 'USD')}</span>{' '}
      {tasa !== null && <span className="precio-bs">· {formatear(aBolivares(usd, tasa), 'VES')}</span>}
    </div>
  );
}
