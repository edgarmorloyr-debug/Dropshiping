import { useState } from 'react';
import { ESTADOS_VENEZUELA, METODOS_PAGO, TIENDA } from '../config';
import { almacen } from '../datos/almacen';
import { calcularTotales, ErrorPedido, formatear } from '../logica/precios';
import { validarEnvio, validarPago, type Errores } from '../logica/validar';
import type { Carrito } from '../carrito';
import type { DatosEnvio, PedidoCreado, Producto } from '../tipos';

const ENVIO_VACIO: DatosEnvio = {
  nombre: '', telefono: '', cedula: '', estado: '', ciudad: '', empresaEnvio: '', oficina: '',
};

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

export function Pagar({ productos, tasa, carrito, alTerminar }: {
  productos: Producto[];
  tasa: number | null;
  carrito: Carrito;
  alTerminar: (p: PedidoCreado) => void;
}) {
  const [envio, setEnvio] = useState<DatosEnvio>(ENVIO_VACIO);
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
    totales = calcularTotales(carrito.lineas, productos, tasa, TIENDA.maxPorProducto);
  } catch (e) {
    return (
      <section className="seccion">
        <div className="aviso-error">{e instanceof ErrorPedido ? e.message : 'Hubo un problema con tu carrito.'}</div>
        <a className="boton principal" href="#/carrito">Revisar el carrito</a>
      </section>
    );
  }

  const metodo = METODOS_PAGO.find((m) => m.id === metodoId);
  // Después del primer intento, los avisos se recalculan en vivo: desaparecen al corregir el dato.
  const pago = { metodoId, referencia, comprobante };
  const errores: Errores = intentado
    ? {
        ...validarEnvio(envio, ESTADOS_VENEZUELA, TIENDA.empresasEnvio),
        ...validarPago(pago, METODOS_PAGO.map((m) => m.id)),
      }
    : {};
  const hayErrores = Object.keys(errores).length > 0;
  const montoMetodo = metodo ? formatear(metodo.moneda === 'USD' ? totales.usd : totales.ves, metodo.moneda) : '';
  const cambiar = (campo: keyof DatosEnvio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEnvio({ ...envio, [campo]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setFalla('');
    setIntentado(true);
    const encontrados = {
      ...validarEnvio(envio, ESTADOS_VENEZUELA, TIENDA.empresasEnvio),
      ...validarPago(pago, METODOS_PAGO.map((m) => m.id)),
    };
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      alTerminar(await almacen.crearPedido(carrito.lineas, envio, pago));
    } catch (err) {
      setFalla(err instanceof ErrorPedido ? err.message : 'No pudimos enviar tu pedido. Revisa tu conexión e inténtalo otra vez.');
      setEnviando(false);
    }
  }

  return (
    <form className="seccion" onSubmit={enviar} noValidate>
      <a className="boton-icono" href="#/carrito" style={{ marginLeft: -12 }}>← Volver</a>
      <h1>Pagar</h1>
      <div className="total" style={{ paddingTop: 0 }}>
        <span>Total</span>
        <span>{formatear(totales.usd, 'USD')}</span>
      </div>
      <p className="suave">
        {formatear(totales.ves, 'VES')} · Tasa del día: {formatear(Math.round(tasa * 100), 'VES')} por $ · Envío incluido · Sin crear cuenta
      </p>

      <h2 style={{ marginTop: 24 }}>1. ¿A dónde te lo enviamos?</h2>
      <Campo etiqueta="Nombre y apellido" error={errores.nombre}>
        <input value={envio.nombre} onChange={cambiar('nombre')} autoComplete="name" />
      </Campo>
      <Campo etiqueta="Celular (WhatsApp)" error={errores.telefono} ayuda="Te avisamos por aquí cuando confirmemos tu pago.">
        <input value={envio.telefono} onChange={cambiar('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="0414-123-4567" />
      </Campo>
      <Campo etiqueta="Cédula" error={errores.cedula} ayuda="La empresa de envío la pide para entregarte el paquete.">
        <input value={envio.cedula} onChange={cambiar('cedula')} placeholder="V-12345678" autoCapitalize="characters" />
      </Campo>
      <Campo etiqueta="Estado" error={errores.estado}>
        <select value={envio.estado} onChange={cambiar('estado')}>
          <option value="">Elige tu estado</option>
          {ESTADOS_VENEZUELA.map((e) => <option key={e}>{e}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Ciudad" error={errores.ciudad}>
        <input value={envio.ciudad} onChange={cambiar('ciudad')} autoComplete="address-level2" />
      </Campo>
      <Campo etiqueta="Empresa de envío" error={errores.empresaEnvio}>
        <select value={envio.empresaEnvio} onChange={cambiar('empresaEnvio')}>
          <option value="">Elige la empresa</option>
          {TIENDA.empresasEnvio.map((e) => <option key={e}>{e}</option>)}
        </select>
      </Campo>
      <Campo etiqueta="Oficina donde retiras el paquete" error={errores.oficina} ayuda="Por ejemplo: MRW Av. Bolívar Norte, Valencia.">
        <input value={envio.oficina} onChange={cambiar('oficina')} />
      </Campo>

      <h2 style={{ marginTop: 24 }}>2. ¿Cómo vas a pagar?</h2>
      <div className="opciones" role="radiogroup" aria-label="Forma de pago">
        {METODOS_PAGO.map((m) => (
          <label key={m.id} className={`opcion ${m.id === metodoId ? 'elegida' : ''}`}>
            <input type="radio" name="metodo" value={m.id} checked={m.id === metodoId} onChange={() => setMetodoId(m.id)} />
            {m.nombre}
            <span className="moneda">{m.moneda === 'USD' ? 'en dólares' : 'en bolívares'}</span>
          </label>
        ))}
      </div>
      {errores.metodoId && <div className="error">{errores.metodoId}</div>}

      {metodo && (
        <div className="caja-pago" aria-live="polite">
          <p>Paga exactamente:</p>
          <p className="monto-exacto">{montoMetodo}</p>
          <p className="suave" style={{ marginBottom: 8 }}>a estos datos de {metodo.nombre}:</p>
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

      <h2 style={{ marginTop: 24 }}>3. Confirma tu pago</h2>
      <Campo etiqueta="Número de referencia" error={errores.referencia} ayuda="Aparece en el comprobante que te da tu banco o app.">
        <input value={referencia} onChange={(e) => setReferencia(e.target.value)} inputMode="text" />
      </Campo>
      <Campo etiqueta="Foto o captura del comprobante" error={errores.comprobante}>
        <input type="file" accept="image/*,application/pdf" onChange={(e) => setComprobante(e.target.files?.[0] ?? null)} />
      </Campo>

      {hayErrores && <div className="aviso-error" role="alert">Revisa los campos marcados en rojo.</div>}
      {falla && <div className="aviso-error" role="alert">{falla}</div>}
      <button className="boton principal" type="submit" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Enviar mi pedido'}
      </button>
      <p className="suave" style={{ marginTop: 8 }}>Revisamos tu pago y te avisamos por WhatsApp antes de enviar.</p>
    </form>
  );
}
