import { TIENDA } from '../config';
import { Imagen } from '../componentes/comunes';
import { aBolivares, formatear } from '../logica/precios';
import type { Carrito } from '../carrito';
import type { Producto } from '../tipos';
import { SelectorCantidad } from './Producto';

export function PaginaCarrito({ productos, tasa, carrito }: { productos: Producto[]; tasa: number | null; carrito: Carrito }) {
  const lineas = carrito.lineas
    .map((l) => ({ ...l, producto: productos.find((p) => p.id === l.productoId) }))
    .filter((l): l is typeof l & { producto: Producto } => Boolean(l.producto));

  if (lineas.length === 0) {
    return (
      <section className="seccion">
        <h1>Tu carrito está vacío</h1>
        <p className="suave">Mira lo que tenemos para tu hogar.</p>
        <a className="boton principal" href="#/">Ver productos</a>
      </section>
    );
  }

  const totalUsd = lineas.reduce((s, l) => s + l.producto.precioUsd * l.cantidad, 0);

  return (
    <section className="seccion">
      <h1>Tu carrito</h1>
      {lineas.map(({ producto, cantidad }) => (
        <div key={producto.id} className="linea">
          <Imagen producto={producto} tamano="mini" />
          <div className="info">
            <p style={{ fontWeight: 700 }}>{producto.nombre}</p>
            <p className="suave">{formatear(producto.precioUsd, 'USD')} c/u</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <SelectorCantidad valor={cantidad} alCambiar={(n) => carrito.cambiar(producto.id, n)} nombre={producto.nombre} />
              <button className="enlace-boton" onClick={() => carrito.quitar(producto.id)}>Quitar</button>
            </div>
          </div>
        </div>
      ))}
      <div className="total">
        <span>Total</span>
        <span>{formatear(totalUsd, 'USD')}</span>
      </div>
      {tasa !== null && <p className="suave" style={{ textAlign: 'right' }}>{formatear(aBolivares(totalUsd, tasa), 'VES')}</p>}
      <p className="suave">Envío incluido · Máximo {TIENDA.maxPorProducto} unidades por producto.</p>
      <a className="boton principal" href="#/pagar">Ir a pagar</a>
    </section>
  );
}
