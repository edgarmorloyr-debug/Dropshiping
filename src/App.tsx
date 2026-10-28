import { useEffect, useState } from 'react';
import { almacen } from './datos/almacen';
import { useCarrito } from './carrito';
import { metodosActivos } from './logica/cobro';
import type { DatosTienda, PedidoCreado, Producto } from './tipos';
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

  const [datos, setDatos] = useState<DatosTienda | null>(null);
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    almacen.listarProductos().then(setProductos, () => setSinConexion(true));
  }, []);
  // La tasa y los datos de la tienda se vuelven a leer al cambiar de pantalla, por si el dueño los cambió en el panel.
  useEffect(() => {
    almacen.obtenerTasa().then(setTasa, () => undefined);
    almacen.obtenerDatosTienda().then(setDatos, () => setSinConexion(true));
  }, [ruta[0]]);
  useEffect(() => {
    if (datos) document.title = `${datos.nombre} · Hogar y cocina`;
  }, [datos]);

  const metodos = datos ? metodosActivos(datos) : [];
  const whatsapp = datos?.whatsapp ?? '';

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
  } else if (!productos || !datos) {
    pantalla = <p className="seccion suave">Cargando…</p>;
  } else if (ruta[0] === 'producto') {
    const producto = productos.find((p) => p.id === ruta[1]);
    pantalla = producto
      ? <PaginaProducto producto={producto} tasa={tasa} metodos={metodos} carrito={carrito} />
      : <Inicio productos={productos} tasa={tasa} metodos={metodos} whatsapp={whatsapp} />;
  } else if (ruta[0] === 'carrito') {
    pantalla = <PaginaCarrito productos={productos} tasa={tasa} carrito={carrito} />;
  } else if (ruta[0] === 'pagar') {
    pantalla = (
      <Pagar
        productos={productos}
        tasa={tasa}
        metodos={metodos}
        carrito={carrito}
        alTerminar={(p) => {
          setPedido(p);
          carrito.vaciar();
          window.location.hash = '/listo';
        }}
      />
    );
  } else if (ruta[0] === 'listo' && pedido) {
    pantalla = <Listo pedido={pedido} whatsapp={whatsapp} />;
  } else {
    pantalla = <Inicio productos={productos} tasa={tasa} metodos={metodos} whatsapp={whatsapp} />;
  }

  return (
    <>
      {almacen.modo === 'demo' && (
        <div className="demo" role="note">
          Modo demostración: productos, precios y datos de pago son de ejemplo.
        </div>
      )}
      <header className="encabezado">
        <a className="marca" href="#/">
          {datos && <span className="logo" aria-hidden="true">{datos.nombre.trim().charAt(0).toUpperCase()}</span>}
          {datos?.nombre ?? ''}
        </a>
        <a className="boton-icono" href="#/carrito" aria-label={`Carrito, ${carrito.unidades} productos`}>
          <span aria-hidden="true">🛒</span>
          <span className="globo">{carrito.unidades}</span>
        </a>
      </header>
      <main className="pagina">{pantalla}</main>
    </>
  );
}
