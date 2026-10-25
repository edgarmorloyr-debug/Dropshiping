import { useEffect, useState } from 'react';
import { TIENDA } from './config';
import { almacen } from './datos/almacen';
import { useCarrito } from './carrito';
import type { PedidoCreado, Producto } from './tipos';
import { Inicio } from './pantallas/Inicio';
import { PaginaProducto } from './pantallas/Producto';
import { PaginaCarrito } from './pantallas/Carrito';
import { Pagar } from './pantallas/Pagar';
import { Listo } from './pantallas/Listo';
import { Panel } from './pantallas/Panel';

/** Lee la dirección después de «#», por ejemplo «#/producto/picador» → ['producto', 'picador']. */
function useRuta(): string[] {
  const leer = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [ruta, setRuta] = useState(leer);
  useEffect(() => {
    const alCambiar = () => {
      setRuta(leer());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);
  return ruta;
}

export function App() {
  const ruta = useRuta();
  const carrito = useCarrito();
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [tasa, setTasa] = useState<number | null>(null);
  const [pedido, setPedido] = useState<PedidoCreado | null>(null);

  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    almacen.listarProductos().then(setProductos, () => setSinConexion(true));
  }, []);
  // La tasa se vuelve a leer al cambiar de pantalla, por si el dueño la actualizó en el panel.
  useEffect(() => {
    almacen.obtenerTasa().then(setTasa, () => undefined);
  }, [ruta[0]]);

  let pantalla: React.ReactNode;
  if (ruta[0] === 'panel') {
    pantalla = <Panel />;
  } else if (sinConexion) {
    pantalla = (
      <section className="seccion">
        <h1>No pudimos cargar la tienda</h1>
        <p className="suave">Revisa tu conexión a internet e inténtalo otra vez.</p>
        <button className="boton principal" onClick={() => window.location.reload()}>Volver a intentar</button>
      </section>
    );
  } else if (!productos) {
    pantalla = <p className="seccion suave">Cargando…</p>;
  } else if (ruta[0] === 'producto') {
    const producto = productos.find((p) => p.id === ruta[1]);
    pantalla = producto
      ? <PaginaProducto producto={producto} tasa={tasa} carrito={carrito} />
      : <Inicio productos={productos} tasa={tasa} />;
  } else if (ruta[0] === 'carrito') {
    pantalla = <PaginaCarrito productos={productos} tasa={tasa} carrito={carrito} />;
  } else if (ruta[0] === 'pagar') {
    pantalla = (
      <Pagar
        productos={productos}
        tasa={tasa}
        carrito={carrito}
        alTerminar={(p) => {
          setPedido(p);
          carrito.vaciar();
          window.location.hash = '/listo';
        }}
      />
    );
  } else if (ruta[0] === 'listo' && pedido) {
    pantalla = <Listo pedido={pedido} />;
  } else {
    pantalla = <Inicio productos={productos} tasa={tasa} />;
  }

  return (
    <>
      {almacen.modo === 'demo' && (
        <div className="demo" role="note">
          Modo demostración: productos, precios y datos de pago son de ejemplo.
        </div>
      )}
      <header className="encabezado">
        <a className="marca" href="#/">{TIENDA.nombre}</a>
        <a className="boton-icono" href="#/carrito" aria-label={`Carrito, ${carrito.unidades} productos`}>
          <span aria-hidden="true">🛒</span>
          <span className="globo">{carrito.unidades}</span>
        </a>
      </header>
      <main className="pagina">{pantalla}</main>
    </>
  );
}
