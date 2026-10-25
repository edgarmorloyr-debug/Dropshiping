import { TIENDA } from '../config';
import { Imagen, Precio } from '../componentes/comunes';
import type { MetodoActivo, Producto } from '../tipos';

export function Inicio({ productos, tasa, metodos, whatsapp }: {
  productos: Producto[];
  tasa: number | null;
  metodos: MetodoActivo[];
  whatsapp: string;
}) {
  const estrella = productos.find((p) => p.destacado) ?? productos[0];
  const otros = productos.filter((p) => p !== estrella);
  const { desde, hasta } = TIENDA.diasEntrega;

  return (
    <>
      {estrella && (
        <section className="seccion">
          <Imagen producto={estrella} />
          <h1 style={{ marginTop: 16 }}>{estrella.frase}</h1>
          <p>{estrella.nombre}</p>
          <Precio usd={estrella.precioUsd} tasa={tasa} />
          <p className="suave">Envío incluido · Llega en {desde} a {hasta} días</p>
          <a className="boton principal" href={`#/producto/${estrella.id}`}>Ver producto</a>
        </section>
      )}

      {otros.length > 0 && (
        <section className="seccion">
          <h2>Más para tu hogar</h2>
          <div className="rejilla">
            {otros.map((p) => (
              <a key={p.id} className="tarjeta" href={`#/producto/${p.id}`}>
                <Imagen producto={p} tamano="chica" />
                <h3>{p.nombre}</h3>
                <Precio usd={p.precioUsd} tasa={null} />
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
        <p className="suave" style={{ marginTop: 12 }}>
          📦 Envíos a toda Venezuela por {TIENDA.empresasEnvio.join(', ')}.
        </p>
        <p className="suave">✅ Confirmamos tu pago antes de enviar y te avisamos por WhatsApp.</p>
        {whatsapp && (
          <a className="boton" href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
            ¿Dudas? Escríbenos por WhatsApp
          </a>
        )}
      </section>
    </>
  );
}
