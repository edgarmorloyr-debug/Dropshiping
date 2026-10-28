import { useEffect, useState } from 'react';
import type { Producto } from '../tipos';
import { aBolivares, formatear, formatearCorto } from '../logica/precios';
import { ofertaActiva, porcentajeDescuento, precioVigente, tiempoRestante } from '../logica/oferta';

/** La hora actual, que se actualiza sola (cada segundo por defecto) para mover el cronómetro. */
export function useAhora(cadaMs = 1000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), cadaMs);
    return () => clearInterval(id);
  }, [cadaMs]);
  return ahora;
}

/** Portada con aspecto de libro, hecha con los colores del producto (hasta que el dueño suba una imagen). */
export function Portada({ producto, tamano = 'grande' }: { producto: Producto; tamano?: 'grande' | 'mini' }) {
  const [c1, c2] = producto.colores;
  const fondo = `linear-gradient(160deg, ${c1} 0%, ${c2} 100%)`;
  if (tamano === 'mini') {
    return <div className="mini-libro" style={{ background: fondo }} role="img" aria-label={`Portada de ${producto.nombre}`} />;
  }
  return (
    <div className="libro" role="img" aria-label={`Portada de ${producto.nombre}`}>
      <div className="libro-paginas" />
      <div className="libro-tapa" style={{ background: fondo }}>
        <small>{producto.etiqueta}</small>
        <b>{producto.nombre}</b>
        <em>{producto.incluye.join(' · ')}</em>
      </div>
    </div>
  );
}

const dos = (n: number) => String(n).padStart(2, '0');

/** «02 : 14 : 37». Si falta más de un día, muestra también los días. Si ya terminó, no muestra nada. */
export function Cronometro({ fin, ahora }: { fin: string; ahora: Date }) {
  const r = tiempoRestante(fin, ahora);
  if (!r) return null;
  const partes = [...(r.dias > 0 ? [`${r.dias}d`] : []), dos(r.horas), dos(r.minutos), dos(r.segundos)];
  return (
    <span className="reloj" role="timer" aria-label={`Termina en ${r.dias} días, ${r.horas} horas, ${r.minutos} minutos`}>
      {partes.map((p, i) => (
        <span key={i} className="reloj-caja">{p}</span>
      ))}
    </span>
  );
}

/** Precio grande: el de oferta con el normal tachado y el % de descuento, más su valor en bolívares. */
export function PrecioProducto({ producto, tasa, ahora }: { producto: Producto; tasa: number | null; ahora: Date }) {
  const vigente = precioVigente(producto, ahora);
  const enOferta = ofertaActiva(producto, ahora);
  return (
    <div>
      <div className="precio">
        {enOferta && <span className="precio-antes">{formatearCorto(producto.precioUsd)}</span>}
        <span className="precio-ahora">{formatearCorto(vigente)}</span>
        {enOferta && <span className="chip-descuento">−{porcentajeDescuento(producto)} %</span>}
      </div>
      {tasa !== null && <div className="precio-bs">{formatear(aBolivares(vigente, tasa), 'VES')} al cambio de hoy</div>}
    </div>
  );
}
