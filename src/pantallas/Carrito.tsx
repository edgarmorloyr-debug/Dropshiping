import { Portada, useAhora } from '../componentes/comunes';
import { precioVigente } from '../logica/oferta';
import { aBolivares, formatear } from '../logica/precios';
import type { Carrito } from '../carrito';
import type { Producto } from '../tipos';

export function PaginaCarrito({ productos, tasa, carrito }: { productos: Producto[]; tasa: number | null; carrito: Carrito }) {
  const ahora = useAhora(30_000);
  const lineas = carrito.lineas
    .map((l) => ({ ...l, producto: productos.find((p) => p.id === l.productoId) }))
    .filter((l): l is typeof l & { producto: Producto } => Boolean(l.producto));

  if (lineas.length === 0) {
    return (
      <section className="seccion">
        <h1>Tu carrito está vacío</h1>
        <p className="suave">Mira lo que tenemos para ti.</p>
        <a className="boton principal" href="#/">Ver productos</a>
      </section>
    );
  }

  const totalUsd = lineas.reduce((s, l) => s + precioVigente(l.producto, ahora), 0);

  return (
    <section className="seccion">
      <h1>Tu carrito</h1>
      <div className="tarjeta">
        {lineas.map(({ producto }) => (
          <div key={producto.id} className="linea-carrito">
            <Portada producto={producto} tamano="mini" />
            <div className="linea-carrito-texto">
              <b>{producto.nombre}</b>
              <span className="suave">{formatear(precioVigente(producto, ahora), 'USD')}</span>
            </div>
            <button className="enlace-boton" onClick={() => carrito.quitar(producto.id)}>Quitar</button>
          </div>
        ))}
        <div className="fila-total total">
          <span>Total</span>
          <span>{formatear(totalUsd, 'USD')}</span>
        </div>
        {tasa !== null && <p className="suave" style={{ textAlign: 'right' }}>{formatear(aBolivares(totalUsd, tasa), 'VES')} al cambio de hoy</p>}
      </div>
      <a className="boton principal grande" href="#/pagar">Ir a pagar</a>
    </section>
  );
}
