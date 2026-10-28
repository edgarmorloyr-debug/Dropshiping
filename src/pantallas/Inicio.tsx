import { Cronometro, PrecioProducto, Portada, useAhora } from '../componentes/comunes';
import { ofertaActiva, porcentajeDescuento, precioVigente } from '../logica/oferta';
import { formatearCorto } from '../logica/precios';
import type { MetodoActivo, Producto } from '../tipos';

export function Inicio({ productos, tasa, metodos, whatsapp }: {
  productos: Producto[];
  tasa: number | null;
  metodos: MetodoActivo[];
  whatsapp: string;
}) {
  const ahora = useAhora();
  const estrella = productos.find((p) => p.destacado) ?? productos[0];
  const otros = productos.filter((p) => p !== estrella);

  if (!estrella) {
    return (
      <section className="seccion">
        <h1>Muy pronto</h1>
        <p className="suave">Estamos preparando nuestros productos.</p>
      </section>
    );
  }

  return (
    <>
      {ofertaActiva(estrella, ahora) && estrella.ofertaFin && (
        <div className="aviso-oferta" role="note">
          🔥 Oferta −{porcentajeDescuento(estrella)} % termina en <Cronometro fin={estrella.ofertaFin} ahora={ahora} />
        </div>
      )}
      <section className="hero">
        <Portada producto={estrella} />
        <h1>{estrella.titular || estrella.nombre}</h1>
        {estrella.frase && <p className="subtitulo">{estrella.frase}</p>}
        <PrecioProducto producto={estrella} tasa={tasa} ahora={ahora} />
      </section>
      <section className="seccion">
        <a className="boton principal grande" href={`#/producto/${estrella.id}`}>Ver qué incluye →</a>
        <div className="confianza">
          <div><span aria-hidden="true">⚡</span><b>Al instante</b>al confirmar tu pago</div>
          <div><span aria-hidden="true">🛡️</span><b>Garantía</b>{estrella.garantiaDias} días</div>
          <div><span aria-hidden="true">📱</span><b>Sin cuenta</b>compras en 2 minutos</div>
        </div>
      </section>

      {otros.length > 0 && (
        <section className="seccion">
          <h2>Más productos</h2>
          <div className="lista-productos">
            {otros.map((p) => (
              <a key={p.id} className="tarjeta-producto" href={`#/producto/${p.id}`}>
                <Portada producto={p} tamano="mini" />
                <div className="tarjeta-producto-texto">
                  <span className="etiqueta-tipo">{p.etiqueta}</span>
                  <b>{p.nombre}</b>
                  <span className="suave">{p.incluye.join(' · ')}</span>
                </div>
                <span className="tarjeta-producto-precio">{formatearCorto(precioVigente(p, ahora))}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="seccion">
        {metodos.length > 0 && (
          <>
            <h2>Pagas como prefieras</h2>
            <div className="etiquetas">
              {metodos.map((m) => <span key={m.id} className="etiqueta">{m.nombre}</span>)}
            </div>
          </>
        )}
        {whatsapp && (
          <a className="boton" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            ¿Dudas? Escríbenos por WhatsApp
          </a>
        )}
      </section>
    </>
  );
}
