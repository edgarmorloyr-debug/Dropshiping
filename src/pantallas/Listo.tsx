import { METODOS_PAGO, TIENDA } from '../config';
import { formatear } from '../logica/precios';
import type { PedidoCreado } from '../tipos';

export function Listo({ pedido }: { pedido: PedidoCreado }) {
  const metodo = METODOS_PAGO.find((m) => m.id === pedido.metodoId);
  const mensaje = encodeURIComponent(`Hola, acabo de hacer el pedido #${pedido.numero} y pagué por ${metodo?.nombre ?? ''}.`);

  return (
    <section className="seccion">
      <p className="exito" style={{ fontSize: 40 }} aria-hidden="true">✓</p>
      <h1>¡Recibimos tu pedido #{pedido.numero}!</h1>
      <p>Total: <b>{formatear(pedido.totales.usd, 'USD')}</b> <span className="suave">({formatear(pedido.totales.ves, 'VES')})</span></p>

      <h2 style={{ marginTop: 24 }}>¿Qué pasa ahora?</h2>
      <ol className="pasos">
        <li>Revisamos tu pago de {metodo?.nombre ?? 'tu pedido'}.</li>
        <li>Te escribimos por WhatsApp para confirmarlo.</li>
        <li>Enviamos tu paquete a la oficina que elegiste. Llega en {TIENDA.diasEntrega.desde} a {TIENDA.diasEntrega.hasta} días.</li>
      </ol>

      <a className="boton principal" href={`https://wa.me/${TIENDA.whatsapp}?text=${mensaje}`} target="_blank" rel="noreferrer">
        Avísanos por WhatsApp
      </a>
      <a className="boton" href="#/">Volver a la tienda</a>
    </section>
  );
}
