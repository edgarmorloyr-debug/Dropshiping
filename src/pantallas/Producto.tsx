import { useState } from 'react';
import { TIENDA } from '../config';
import { Imagen, Precio } from '../componentes/comunes';
import type { Carrito } from '../carrito';
import type { Producto } from '../tipos';

export function SelectorCantidad({ valor, alCambiar, nombre }: { valor: number; alCambiar: (n: number) => void; nombre: string }) {
  return (
    <div className="cantidad" role="group" aria-label={`Cantidad de ${nombre}`}>
      <button type="button" onClick={() => alCambiar(valor - 1)} disabled={valor <= 1} aria-label="Quitar uno">−</button>
      <output aria-live="polite">{valor}</output>
      <button type="button" onClick={() => alCambiar(valor + 1)} disabled={valor >= TIENDA.maxPorProducto} aria-label="Agregar uno">+</button>
    </div>
  );
}

export function PaginaProducto({ producto, tasa, carrito }: { producto: Producto; tasa: number | null; carrito: Carrito }) {
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);
  const { desde, hasta } = TIENDA.diasEntrega;

  return (
    <>
      <section className="seccion">
        <a className="boton-icono" href="#/" style={{ marginLeft: -12 }}>← Volver</a>
        <Imagen producto={producto} />
        <h1 style={{ marginTop: 16 }}>{producto.nombre}</h1>
        <p>{producto.frase}</p>
        <Precio usd={producto.precioUsd} tasa={tasa} />
        <p className="suave">Envío incluido · Llega en {desde} a {hasta} días</p>

        <div style={{ marginTop: 12 }}>
          <SelectorCantidad valor={cantidad} alCambiar={setCantidad} nombre={producto.nombre} />
        </div>

        <button
          className="boton principal"
          onClick={() => {
            carrito.agregar(producto.id, cantidad);
            window.location.hash = '/pagar';
          }}
        >
          Comprar ahora
        </button>
        <button
          className="boton"
          onClick={() => {
            carrito.agregar(producto.id, cantidad);
            setAgregado(true);
          }}
        >
          Agregar al carrito
        </button>
        {agregado && (
          <p className="exito" role="status" style={{ marginTop: 8 }}>
            ✓ Agregado. <a href="#/carrito">Ver carrito</a>
          </p>
        )}
      </section>

      <section className="seccion">
        <h2>Por qué te va a gustar</h2>
        <ul className="lista-beneficios">
          {producto.beneficios.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <h2 style={{ marginTop: 16 }}>Compra con confianza</h2>
        <p className="suave">✅ Revisamos tu pago antes de enviar y te avisamos por WhatsApp.</p>
        <p className="suave">📦 Envío por {TIENDA.empresasEnvio.join(', ')} a la oficina que elijas.</p>
      </section>
    </>
  );
}
