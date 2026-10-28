import { useEffect, useRef, useState } from 'react';
import { PREGUNTAS } from '../config';
import { Cronometro, PrecioProducto, Portada, useAhora } from '../componentes/comunes';
import { ofertaActiva, porcentajeDescuento, precioVigente } from '../logica/oferta';
import { formatearCorto } from '../logica/precios';
import type { Carrito } from '../carrito';
import type { MetodoActivo, Producto } from '../tipos';

export function PaginaProducto({ producto, tasa, metodos, carrito }: {
  producto: Producto;
  tasa: number | null;
  metodos: MetodoActivo[];
  carrito: Carrito;
}) {
  const ahora = useAhora();
  const enOferta = ofertaActiva(producto, ahora);
  const comprar = () => {
    carrito.agregar(producto.id, 1);
    window.location.hash = '/pagar';
  };
  const formasDePago = metodos.slice(0, 3).map((m) => m.nombre.replace(' (USDT)', ''));

  // La barra fija aparece solo cuando el botón grande ya no se ve: un solo botón naranja a la vista.
  const botonGrande = useRef<HTMLButtonElement>(null);
  const [verBarra, setVerBarra] = useState(false);
  useEffect(() => {
    const boton = botonGrande.current;
    if (!boton || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(([e]) => setVerBarra(!e.isIntersecting));
    observador.observe(boton);
    return () => observador.disconnect();
  }, []);

  return (
    <div className="producto">
      {enOferta && producto.ofertaFin && (
        <div className="aviso-oferta" role="note">
          🔥 Oferta −{porcentajeDescuento(producto)} % termina en <Cronometro fin={producto.ofertaFin} ahora={ahora} />
        </div>
      )}

      <section className="hero">
        <Portada producto={producto} />
        <h1>{producto.titular || producto.nombre}</h1>
        {producto.frase && <p className="subtitulo">{producto.frase}</p>}
        <PrecioProducto producto={producto} tasa={tasa} ahora={ahora} />
      </section>

      <section className="seccion">
        <button ref={botonGrande} className="boton principal grande" onClick={comprar}>Lo quiero ahora →</button>
        <div className="confianza">
          <div><span aria-hidden="true">⚡</span><b>Al instante</b>al confirmar tu pago</div>
          {producto.garantiaDias > 0 && (
            <div><span aria-hidden="true">🛡️</span><b>Garantía</b>{producto.garantiaDias} días</div>
          )}
          {formasDePago.length > 0 && (
            <div><span aria-hidden="true">💳</span><b>{formasDePago[0]}</b>{formasDePago.slice(1).join(' · ') || 'y más'}</div>
          )}
        </div>
      </section>

      {producto.beneficios.length > 0 && (
        <section className="seccion">
          <div className="tarjeta">
            <h2>Lo que vas a lograr</h2>
            <ul className="checks">
              {producto.beneficios.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        </section>
      )}

      {producto.contenido.length > 0 && (
        <section className="seccion">
          <div className="tarjeta">
            <h2>Contenido</h2>
            {producto.contenido.map((c, i) => (
              <div key={c.titulo} className="modulo">
                <span>{i + 1}. {c.titulo}</span>
                <span className="suave">{c.detalle}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {producto.garantiaDias > 0 && (
        <section className="seccion">
          <div className="garantia">
            <div className="sello" aria-hidden="true">{producto.garantiaDias}<small>DÍAS DE<br />GARANTÍA</small></div>
            <div>
              <b>Compra sin riesgo</b>
              <p className="suave">Si en {producto.garantiaDias} días no te sirve, escríbenos y te devolvemos tu dinero completo.</p>
            </div>
          </div>
        </section>
      )}

      <section className="seccion">
        <div className="tarjeta">
          <h2>Preguntas frecuentes</h2>
          {PREGUNTAS.map((p) => (
            <details key={p.pregunta} className="pregunta">
              <summary>{p.pregunta}</summary>
              <p>{p.respuesta}</p>
            </details>
          ))}
        </div>
      </section>

      <div className={`barra-compra ${verBarra ? '' : 'oculta'}`} aria-hidden={!verBarra}>
        <div className="barra-precio">
          {formatearCorto(precioVigente(producto, ahora))}
          {enOferta && <small>antes {formatearCorto(producto.precioUsd)}</small>}
        </div>
        <button className="boton principal" onClick={comprar} tabIndex={verBarra ? 0 : -1}>Comprar ahora</button>
      </div>
    </div>
  );
}
