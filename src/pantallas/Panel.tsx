import { useCallback, useEffect, useState } from 'react';
import { METODOS_PAGO } from '../config';
import { almacen } from '../datos/almacen';
import { NOMBRE_ESTADO, PASOS_PERMITIDOS } from '../logica/estados';
import { ErrorPedido, formatear } from '../logica/precios';
import { telefonoInternacional } from '../logica/validar';
import { metodosActivos, whatsappValido } from '../logica/cobro';
import type { DatosTienda, EstadoPedido, PedidoGuardado } from '../tipos';

const panel = almacen.panel;
const PESTANAS: EstadoPedido[] = ['por_revisar', 'pagado', 'enviado', 'rechazado'];
const BOTON: Record<EstadoPedido, string> = {
  pagado: 'Pago confirmado',
  rechazado: 'Rechazar',
  enviado: 'Marcar entregado',
  por_revisar: 'Volver a revisar',
};

const mensaje = (e: unknown) => (e instanceof ErrorPedido ? e.message : 'Algo falló. Revisa tu internet e inténtalo otra vez.');

function Entrar({ alEntrar }: { alEntrar: () => void }) {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [falla, setFalla] = useState('');
  const [enviando, setEnviando] = useState(false);

  return (
    <form
      className="seccion"
      onSubmit={async (e) => {
        e.preventDefault();
        setFalla('');
        setEnviando(true);
        try {
          await panel.entrar(correo, clave);
          alEntrar();
        } catch (err) {
          setFalla(mensaje(err));
          setEnviando(false);
        }
      }}
    >
      <h1>Panel de pedidos</h1>
      <p className="suave">Solo para el dueño de la tienda.</p>
      <label className="campo">
        <span>Correo</span>
        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" />
      </label>
      <label className="campo">
        <span>Contraseña</span>
        <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" />
      </label>
      {falla && <div className="aviso-error" role="alert">{falla}</div>}
      <button className="boton principal" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}

function TarjetaPedido({ pedido, alCambiar }: { pedido: PedidoGuardado; alCambiar: (a: EstadoPedido) => Promise<void> }) {
  const [ocupado, setOcupado] = useState(false);
  const [falla, setFalla] = useState('');
  const metodo = METODOS_PAGO.find((m) => m.id === pedido.metodoId);
  const monto = metodo?.moneda === 'VES' ? formatear(pedido.totales.ves, 'VES') : formatear(pedido.totales.usd, 'USD');
  const { cliente } = pedido;
  const nombreCorto = cliente.nombre.split(' ')[0];
  const textoWhatsapp: Record<EstadoPedido, string> = {
    por_revisar: `Hola ${nombreCorto}, recibimos tu pedido #${pedido.numero}. Estamos revisando tu pago.`,
    pagado: `Hola ${nombreCorto}, confirmamos tu pago del pedido #${pedido.numero}. Te avisamos cuando lo enviemos.`,
    enviado: `Hola ${nombreCorto}, tu pedido #${pedido.numero} ya está entregado. ¡Que lo disfrutes!`,
    rechazado: `Hola ${nombreCorto}, no pudimos confirmar el pago de tu pedido #${pedido.numero}. ¿Nos envías el comprobante otra vez?`,
  };

  async function cambiar(a: EstadoPedido) {
    if (a === 'rechazado' && !window.confirm(`¿Rechazar el pedido #${pedido.numero}?`)) return;
    setOcupado(true);
    setFalla('');
    try {
      await alCambiar(a);
    } catch (e) {
      setFalla(mensaje(e));
      setOcupado(false);
    }
  }

  async function abrirComprobante() {
    setFalla('');
    try {
      const url = await panel.verComprobante(pedido);
      if (url) window.open(url, '_blank', 'noopener');
      else setFalla('En la demostración no se guarda la foto del comprobante.');
    } catch (e) {
      setFalla(mensaje(e));
    }
  }

  return (
    <article className="pedido">
      <p><b>Pedido #{pedido.numero}</b> · {cliente.nombre}</p>
      <p className="suave">{new Date(pedido.creado).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })}</p>

      <div className="caja-pago">
        <p>{metodo?.nombre ?? pedido.metodoId} · <b className="monto-exacto">{monto}</b></p>
        <p>Referencia: <b>{pedido.referencia}</b></p>
        <button type="button" className="enlace-boton" style={{ paddingLeft: 0 }} onClick={abrirComprobante}>Ver comprobante</button>
      </div>

      <ul className="lista-beneficios">
        {pedido.lineas.map((l) => <li key={l.productoId}>{l.cantidad} × {l.nombre}</li>)}
      </ul>
      <p className="suave">
        WhatsApp {cliente.telefono}{cliente.correo && <> · {cliente.correo}</>}
      </p>

      {falla && <div className="aviso-error" role="alert">{falla}</div>}
      <div className="dos">
        {PASOS_PERMITIDOS[pedido.estado].map((a, i) => (
          <button key={a} className={`boton ${i === 0 ? 'principal' : ''}`} disabled={ocupado} onClick={() => cambiar(a)}>
            {BOTON[a]}
          </button>
        ))}
      </div>
      <a
        className="boton"
        href={`https://wa.me/${telefonoInternacional(cliente.telefono)}?text=${encodeURIComponent(textoWhatsapp[pedido.estado])}`}
        target="_blank"
        rel="noreferrer"
      >
        Escribir por WhatsApp
      </a>
    </article>
  );
}

function Tasa() {
  const [valor, setValor] = useState('');
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    almacen.obtenerTasa().then((t) => setValor(String(t).replace('.', ',')));
  }, []);

  return (
    <form
      className="seccion"
      onSubmit={async (e) => {
        e.preventDefault();
        const tasa = Number(valor.replace(/\./g, '').replace(',', '.'));
        try {
          await panel.guardarTasa(tasa);
          setAviso('✓ Tasa guardada. Los pedidos nuevos ya la usan.');
        } catch (err) {
          setAviso(mensaje(err));
        }
      }}
    >
      <label className="campo">
        <span>Tasa del día (Bs. por $)</span>
        <input value={valor} onChange={(e) => { setValor(e.target.value); setAviso(''); }} inputMode="decimal" />
      </label>
      <button className="boton" type="submit">Guardar tasa</button>
      {aviso && <p role="status" style={{ marginTop: 8 }}>{aviso}</p>}
    </form>
  );
}

function DatosDeTienda({ inicial, alGuardar }: { inicial: DatosTienda; alGuardar: (d: DatosTienda) => void }) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp);
  const [cobro, setCobro] = useState(inicial.cobro);
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  const whatsappFinal = telefonoInternacional(whatsapp);
  const activos = new Set(metodosActivos({ nombre, whatsapp: whatsappFinal, cobro }).map((m) => m.id));
  const cambiarCampo = (metodo: string, campo: string, valor: string) => {
    setCobro({ ...cobro, [metodo]: { ...cobro[metodo], [campo]: valor } });
    setAviso('');
  };

  return (
    <form
      className="seccion"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!whatsappValido(whatsappFinal)) {
          setAviso('Escribe tu WhatsApp, por ejemplo 0414-123-4567.');
          return;
        }
        // Se guardan todos los campos de cada forma de pago (vacíos incluidos), para que la base sepa cuáles están completas.
        const completo: DatosTienda['cobro'] = Object.fromEntries(METODOS_PAGO.map((m) => [
          m.id, Object.fromEntries(m.campos.map((c) => [c, (cobro[m.id]?.[c] ?? '').trim()])),
        ]));
        const datos = { nombre: nombre.trim(), whatsapp: whatsappFinal, cobro: completo };
        setGuardando(true);
        try {
          await panel.guardarDatosTienda(datos);
          alGuardar(datos);
          setAviso('✓ Datos guardados. Tus clientes ya los ven.');
        } catch (err) {
          setAviso(mensaje(err));
        }
        setGuardando(false);
      }}
    >
      <h2>Datos de tu tienda</h2>
      <p className="suave">Tus clientes ven estos datos al pagar. Una forma de pago solo aparece si llenas todos sus datos.</p>
      <label className="campo">
        <span>Nombre de la tienda</span>
        <input value={nombre} onChange={(e) => { setNombre(e.target.value); setAviso(''); }} maxLength={60} />
      </label>
      <label className="campo">
        <span>Tu WhatsApp</span>
        <input value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setAviso(''); }} type="tel" inputMode="tel" placeholder="0414-123-4567" />
      </label>

      {METODOS_PAGO.map((m) => (
        <fieldset key={m.id} className="grupo-cobro">
          <legend>
            {m.nombre}{' '}
            <span className={activos.has(m.id) ? 'exito' : 'suave'}>
              {activos.has(m.id) ? '· ✓ Visible para tus clientes' : '· Incompleto: no se muestra'}
            </span>
          </legend>
          {m.campos.map((c) => (
            <label key={c} className="campo">
              <span>{c}</span>
              <input value={cobro[m.id]?.[c] ?? ''} onChange={(e) => cambiarCampo(m.id, c, e.target.value)} maxLength={120} />
            </label>
          ))}
        </fieldset>
      ))}

      {aviso && <p role="status" style={{ marginTop: 12 }}>{aviso}</p>}
      <button className="boton" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar datos de la tienda'}</button>
    </form>
  );
}

export function Panel() {
  const [sesion, setSesion] = useState<boolean | null>(null);
  const [pedidos, setPedidos] = useState<PedidoGuardado[] | null>(null);
  const [pestana, setPestana] = useState<EstadoPedido>('por_revisar');
  const [falla, setFalla] = useState('');
  const [datos, setDatos] = useState<DatosTienda | null>(null);

  const cargar = useCallback(async () => {
    setFalla('');
    try {
      setPedidos(await panel.listarPedidos());
    } catch (e) {
      setFalla(mensaje(e));
    }
  }, []);

  useEffect(() => {
    panel.sesionActiva().then(setSesion);
  }, []);
  useEffect(() => {
    if (!sesion) return;
    cargar();
    almacen.obtenerDatosTienda().then(setDatos, (e) => setFalla(mensaje(e)));
  }, [sesion, cargar]);

  if (sesion === null) return <p className="seccion suave">Cargando…</p>;
  if (!sesion) return <Entrar alEntrar={() => setSesion(true)} />;

  const visibles = (pedidos ?? []).filter((p) => p.estado === pestana);

  return (
    <>
      <section className="seccion">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Pedidos</h1>
          <button className="enlace-boton" onClick={cargar}>Actualizar</button>
        </div>
        {!panel.necesitaClave && <p className="suave">En la demostración no hace falta contraseña.</p>}
        {datos && metodosActivos(datos).length === 0 && (
          <div className="aviso-error" role="alert">Tu tienda todavía no recibe pagos: llena tus datos de cobro en «Datos de tu tienda», más abajo.</div>
        )}
        <div className="etiquetas" role="tablist" style={{ marginTop: 12 }}>
          {PESTANAS.map((e) => (
            <button
              key={e}
              role="tab"
              aria-selected={e === pestana}
              className={`etiqueta pestana ${e === pestana ? 'elegida' : ''}`}
              onClick={() => setPestana(e)}
            >
              {NOMBRE_ESTADO[e]} ({(pedidos ?? []).filter((p) => p.estado === e).length})
            </button>
          ))}
        </div>
        {falla && <div className="aviso-error" role="alert">{falla}</div>}
        {pedidos === null && !falla && <p className="suave" style={{ marginTop: 12 }}>Cargando pedidos…</p>}
        {pedidos !== null && visibles.length === 0 && <p className="suave" style={{ marginTop: 12 }}>No hay pedidos aquí.</p>}
      </section>

      <section className="seccion" style={{ paddingTop: 0 }}>
        {visibles.map((p) => (
          <TarjetaPedido
            key={p.numero}
            pedido={p}
            alCambiar={async (a) => {
              await panel.cambiarEstado(p.numero, a);
              await cargar();
            }}
          />
        ))}
      </section>

      <Tasa />

      {datos && <DatosDeTienda inicial={datos} alGuardar={setDatos} />}

      {panel.necesitaClave && (
        <section className="seccion">
          <button className="enlace-boton" onClick={async () => { await panel.salir(); setSesion(false); }}>Cerrar sesión</button>
        </section>
      )}
    </>
  );
}
