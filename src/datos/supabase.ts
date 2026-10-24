import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ErrorPedido } from '../logica/precios';
import type { Almacen } from './almacen';
import type { EstadoPedido, PedidoGuardado, Producto } from '../tipos';

const RECARGAR = 'No pudimos conectarnos. Revisa tu internet e inténtalo otra vez.';

/** Los errores que escribe la base de datos (código P0001) ya vienen en español para el cliente. */
function revisar(error: { code?: string; message: string } | null): void {
  if (!error) return;
  throw new ErrorPedido(error.code === 'P0001' ? error.message : RECARGAR);
}

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf',
};

type FilaPedido = {
  numero: number; creado: string; estado: EstadoPedido; lineas: PedidoGuardado['lineas'];
  nombre: string; telefono: string; cedula: string; estado_ve: string; ciudad: string;
  empresa_envio: string; oficina: string; metodo_id: string; referencia: string; comprobante: string;
  total_usd: number; total_ves: number; tasa: number;
};

export function crearAlmacenSupabase(url: string, clave: string): Almacen {
  const db: SupabaseClient = createClient(url, clave);

  return {
    modo: 'supabase',

    async listarProductos() {
      const { data, error } = await db.from('productos').select('*').eq('activo', true).order('orden');
      revisar(error);
      return (data ?? []).map((p): Producto => ({
        id: p.id, nombre: p.nombre, frase: p.frase, beneficios: p.beneficios, precioUsd: p.precio_usd,
        icono: p.icono, color: p.color, destacado: p.destacado,
      }));
    },

    async obtenerTasa() {
      const { data, error } = await db.from('ajustes').select('tasa').single();
      revisar(error);
      return Number(data!.tasa);
    },

    async crearPedido(lineas, envio, pago) {
      if (!pago.comprobante) throw new ErrorPedido('Adjunta la foto o captura del comprobante.');
      const extension = EXTENSIONES[pago.comprobante.type];
      if (!extension) throw new ErrorPedido('El comprobante debe ser una foto o un PDF.');

      const ruta = `pedidos/${crypto.randomUUID()}.${extension}`;
      const subida = await db.storage.from('comprobantes').upload(ruta, pago.comprobante, {
        contentType: pago.comprobante.type,
        upsert: false,
      });
      if (subida.error) {
        throw new ErrorPedido('No pudimos subir el comprobante. Prueba con una foto de menos de 5 MB.');
      }

      const { data, error } = await db.rpc('crear_pedido', {
        p_lineas: lineas.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
        p_envio: envio,
        p_metodo: pago.metodoId,
        p_referencia: pago.referencia,
        p_comprobante: ruta,
      });
      revisar(error);
      const fila = data[0] as { numero: number; total_usd: number; total_ves: number; tasa: number };
      return {
        numero: fila.numero,
        totales: { usd: fila.total_usd, ves: Number(fila.total_ves), tasa: Number(fila.tasa) },
        metodoId: pago.metodoId,
      };
    },

    panel: {
      necesitaClave: true,

      async sesionActiva() {
        const { data } = await db.auth.getSession();
        if (!data.session) return false;
        const { data: esAdmin } = await db.rpc('es_admin');
        return esAdmin === true;
      },

      async entrar(correo, clave) {
        const { error } = await db.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error) throw new ErrorPedido('Correo o contraseña incorrectos.');
        const { data: esAdmin } = await db.rpc('es_admin');
        if (esAdmin !== true) {
          await db.auth.signOut();
          throw new ErrorPedido('Esta cuenta no tiene acceso al panel.');
        }
      },

      async salir() {
        await db.auth.signOut();
      },

      async listarPedidos() {
        const { data, error } = await db.from('pedidos').select('*').order('numero', { ascending: false }).limit(300);
        revisar(error);
        return ((data ?? []) as FilaPedido[]).map((f): PedidoGuardado => ({
          numero: f.numero, creado: f.creado, estado: f.estado, lineas: f.lineas,
          envio: {
            nombre: f.nombre, telefono: f.telefono, cedula: f.cedula, estado: f.estado_ve,
            ciudad: f.ciudad, empresaEnvio: f.empresa_envio, oficina: f.oficina,
          },
          metodoId: f.metodo_id, referencia: f.referencia, comprobante: f.comprobante,
          totales: { usd: f.total_usd, ves: Number(f.total_ves), tasa: Number(f.tasa) },
        }));
      },

      async cambiarEstado(numero, estado) {
        const { error } = await db.rpc('cambiar_estado_pedido', { p_numero: numero, p_estado: estado });
        revisar(error);
      },

      async verComprobante(pedido) {
        if (!pedido.comprobante) return null;
        const { data, error } = await db.storage.from('comprobantes').createSignedUrl(pedido.comprobante, 600);
        if (error) throw new ErrorPedido(RECARGAR);
        return data.signedUrl;
      },

      async guardarTasa(tasa) {
        const { error } = await db.rpc('guardar_tasa', { p_tasa: tasa });
        revisar(error);
      },
    },
  };
}
