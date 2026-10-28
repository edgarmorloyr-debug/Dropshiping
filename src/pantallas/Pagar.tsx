import { useState } from 'react';
import { TIENDA } from '../config';
import { almacen } from '../datos/almacen';
import { Portada, useAhora } from '../componentes/comunes';
import { ofertaActiva, precioVigente } from '../logica/oferta';
import { calcularTotales, ErrorPedido, formatear } from '../logica/precios';
import { validarCliente, validarPago, type Errores } from '../logica/validar';
import type { Carrito } from '../carrito';
import type { DatosCliente, MetodoActivo, PedidoCreado, Producto } from '../tipos';

function Campo({ etiqueta, error, ayuda, children }: { etiqueta: string; error?: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className={`campo ${error ? 'con-error' : ''}`}>
      <span>{etiqueta}</span>
      {children}
      {ayuda && !error && <div className="ayuda">{ayuda}</div>}
      {error && <div className="error">{error}</div>}
    </label>
  );
}

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className="copiar"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          // Si el teléfono no deja copiar, el dato sigue visible para escribirlo a mano.
        }
      }}
    >
      {copiado ? '✓ Copiado' : 'Copiar'}
    </button>
  );
}

export function Pagar({ productos, tasa, metodos, carrito, alTerminar }: {
  productos: Producto[];
  tasa: number | null;
  /** Solo las formas de pago con todos sus datos llenos. */
  metodos: MetodoActivo[];
  carrito: Carrito;
  alTerminar: (p: PedidoCreado) => void;
}) {
  const ahora = useAhora(10_000);
  const [cliente, setCliente] = useState<DatosCliente>({ nombre: '', telefono: '', correo: '' });
  const [metodoId, setMetodoId] = useState('');
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [falla, setFalla] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (carrito.lineas.length === 0) {
    return (
      <section className="seccion">
        <h1>No hay nada que pagar</h1>
        <p className="suave">Tu carrito está vacío.</p>
        <a className="boton principal" href="#/">Ver productos</a>
      </section>
    );
  }
  if (tasa === null) return <p className="seccion suave">Cargando la tasa del día…</p>;

  // Solo para mostrar: el total que vale es el que calcula el almacén al guardar.
  let totales;
  try {
    totales = calcularTotales(carrito.lineas, productos, tasa, TIENDA.maxPorProducto, ahora);
  } catch (e) {
    return (
      <section className="seccion">
        <div className="aviso-error">{e instanceof ErrorPedido ? e.message : 'Hubo un problema con tu carrito.'}</div>
        <a className="boton principal" href="#/carrito">Revisar el carrito</a>
      </section>
    );
  }

  const enCarrito = carrito.lineas
    .map((l) => productos.find((p) => p.id === l.productoId))
    .filter((p): p is Producto => Boolean(p));
  const metodo = metodos.find((m) => m.id === metodoId);
  // Después del primer intento, los avisos se recalculan en vivo: desaparecen al corregir el dato.
  const pago = { metodoId, referencia, comprobante };
  const errores: Errores = intentado
    ? { ...validarCliente(cliente), ...validarPago(pago, metodos.map((m) => m.id)) }
    : {};
  const hayErrores = Object.keys(errores).length > 0;
  const montoMetodo = metodo ? formatear(metodo.moneda === 'USD' ? totales.usd : totales.ves, metodo.moneda) : '';
  const cambiar = (campo: keyof DatosCliente) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCliente({ ...cliente, [campo]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setFalla('');
    setIntentado(true);
    const encontrados = { ...validarCliente(cliente), ...validarPago(pago, metodos.map((m) => m.id)) };
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      alTerminar(await almacen.crearPedido(carrito.lineas, cliente, pago));
    } catch (err) {
      setFalla(err instanceof ErrorPedido ? err.message : 'No pudimos enviar tu pedido. Revisa tu conexión e inténtalo otra vez.');
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <section className="seccion">
        <a className="boton-icono" href="#/carrito" style={{ marginLeft: -12 }}>← Volver</a>
        <div className="tarjeta">
          {enCarrito.map((p) => (
            <div key={p.id} className="resumen">
              <Portada producto={p} tamano="mini" />
              <div>
                <b>{p.nombre}</b>
                <div className="suave">{p.incluye.join(' · ')}</div>
              </div>
            </div>
          ))}
          {enCarrito.map((p) => (
            <div key={p.id} className="fila-total">
              <span>{ofertaActiva(p, ahora) ? 'Precio de oferta' : 'Precio'}{enCarrito.length > 1 ? ` · ${p.nombre}` : ''}</span>
              <span>{formatear(precioVigente(p, ahora), 'USD')}</span>
            </div>
          ))}
          <div className="fila-total total">
            <span>Total</span>
            <span>{formatear(totales.usd, 'USD')}</span>
          </div>
          <p className="suave" style={{ textAlign: 'right' }}>{formatear(totales.ves, 'VES')} al cambio de hoy</p>
        </div>
      </section>

      <section className="seccion">
        <h2>¿A dónde te avisamos?</h2>
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input value={cliente.nombre} onChange={cambiar('nombre')} autoComplete="name" />
        </Campo>
        <Campo etiqueta="WhatsApp" error={errores.telefono} ayuda="Te avisamos por aquí cuando confirmemos tu pago.">
          <input value={cliente.telefono} onChange={cambiar('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="0414-123-4567" />
        </Campo>
        <Campo etiqueta="Correo (opcional)" error={errores.correo}>
          <input value={cliente.correo} onChange={cambiar('correo')} type="email" inputMode="email" autoComplete="email" placeholder="tucorreo@gmail.com" />
        </Campo>
      </section>

      <section className="seccion">
        <h2>¿Cómo pagas?</h2>
        {metodos.length === 0 && (
          <p className="aviso-error">Esta tienda todavía no está recibiendo pagos. Escríbenos por WhatsApp.</p>
        )}
        <div className="metodos" role="radiogroup" aria-label="Forma de pago">
          {metodos.map((m) => (
            <label key={m.id} className={`metodo ${m.id === metodoId ? 'elegido' : ''}`}>
              <input type="radio" name="metodo" value={m.id} checked={m.id === metodoId} onChange={() => setMetodoId(m.id)} />
              {m.nombre}
            </label>
          ))}
        </div>
        {errores.metodoId && <div className="error">{errores.metodoId}</div>}

        {metodo && (
          <div className="caja-pago" aria-live="polite">
            <div className="suave">Paga exactamente</div>
            <div className="monto-exacto">{montoMetodo}</div>
            {metodo.datos.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="dato">
                <div className="valor">
                  <span className="etiqueta-dato">{etiqueta}</span>
                  {valor}
                </div>
                <BotonCopiar texto={valor} />
              </div>
            ))}
          </div>
        )}

        <Campo etiqueta="Número de referencia" error={errores.referencia} ayuda="Aparece en el comprobante que te da tu banco o app.">
          <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. 004512" />
        </Campo>
        <div className={`campo ${errores.comprobante ? 'con-error' : ''}`}>
          <span>Captura del pago</span>
          <label className={`subir ${comprobante ? 'con-archivo' : ''}`}>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
            />
            {comprobante ? `✓ ${comprobante.name}` : '📎 Toca para subir la captura'}
          </label>
          {errores.comprobante && <div className="error">{errores.comprobante}</div>}
        </div>

        {hayErrores && <div className="aviso-error" role="alert">Revisa los campos marcados en rojo.</div>}
        {falla && <div className="aviso-error" role="alert">{falla}</div>}
        <button className="boton principal grande" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar mi pedido'}
        </button>
        <p className="seguro">🔒 Tus datos están protegidos · Sin crear cuenta</p>
      </section>
    </form>
  );
}
