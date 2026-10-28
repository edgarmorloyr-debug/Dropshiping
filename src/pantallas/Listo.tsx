import { METODOS_PAGO } from '../config';
import { formatear } from '../logica/precios';
import type { PedidoCreado } from '../tipos';

export function Listo({ pedido, whatsapp }: { pedido: PedidoCreado; whatsapp: string }) {
  const metodo = METODOS_PAGO.find((m) => m.id === pedido.metodoId);
  const mensaje = encodeURIComponent(`Hola, acabo de hacer el pedido #${pedido.numero} y pagué por ${metodo?.nombre ?? ''}.`);

  return (
    <>
      <section className="hero exito-hero">
        <div className="circulo-exito" aria-hidden="true">✓</div>
        <h1>¡Recibimos tu pedido #{pedido.numero}!</h1>
        <p className="subtitulo">
          Total: <b>{formatear(pedido.totales.usd, 'USD')}</b> ({formatear(pedido.totales.ves, 'VES')})
        </p>
      </section>
      <section className="seccion">
        <div className="tarjeta">
          <h2>¿Qué pasa ahora?</h2>
          <ol className="pasos">
            <li>Revisamos tu pago de {metodo?.nombre ?? 'tu pedido'}.</li>
            <li>Te escribimos por WhatsApp para confirmarlo.</li>
            <li>Recibes tu descarga al instante, apenas lo confirmemos.</li>
          </ol>
        </div>
        {whatsapp && (
          <a className="boton principal grande" href={`https://wa.me/${whatsapp}?text=${mensaje}`} target="_blank" rel="noreferrer">
            Avísanos por WhatsApp
          </a>
        )}
        <a className={`boton ${whatsapp ? '' : 'principal grande'}`} href="#/">Volver a la tienda</a>
      </section>
    </>
  );
}
