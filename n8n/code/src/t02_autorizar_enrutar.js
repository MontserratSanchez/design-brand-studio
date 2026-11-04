// Nodo Code «T02 Autorizar y enrutar» · workflow «DBS · Entrada Telegram»
// Entrada: salida de «Buscar usuario» (tabla usuarios; puede venir vacía) y el evento de «T01 Normalizar».
// Salida: un item con `ruta` para el Switch: nuevo | estado | aprobacion | ayuda | no_autorizado | bloqueado | invalido
const ev = $('T01 Normalizar').first().json;
const filas = $input.all().map(i => i.json).filter(r => r && r.telegram_user_id);
const usuario = filas.find(r => String(r.telegram_user_id) === ev.telegram_user_id && String(r.activo) !== 'false');
const out = Object.assign({}, ev, { ruta: 'invalido', mensaje: '', usuario: null, rol: null });

if (!usuario) {
  out.ruta = 'no_autorizado';
  out.mensaje = 'Este bot es un entorno de prueba con acceso restringido. Tu usuario no está autorizado.';
  return [{ json: out }];
}
out.usuario = usuario.seudonimo;   // nunca se propaga el ID de Telegram a los agentes
out.rol = usuario.rol;             // solicitante | coordinadora

if (ev.tipo === 'callback') {
  out.ruta = 'aprobacion';
  const m = /^(apr|rec):(DBS-[0-9]{8}-[A-Z0-9]{4}):v([0-9]+)$/.exec(ev.callback_data);
  out.caso_id = m ? m[2] : null;
  if (!m) { out.ruta = 'invalido'; out.mensaje = 'Botón inválido.'; }
  return [{ json: out }];
}

const inyeccion = detectarInyeccion(ev.texto);
if (inyeccion.length) {
  out.ruta = 'bloqueado';
  out.patrones = inyeccion;
  out.mensaje = 'Solicitud bloqueada: incluye instrucciones que intentan cambiar las reglas o pedir datos protegidos. Describe solo tu campaña.';
  return [{ json: out }];
}

switch (ev.comando) {
  case 'nuevo': {
    if (out.rol !== 'solicitante' && out.rol !== 'coordinadora') { out.ruta = 'no_autorizado'; out.mensaje = 'Tu rol no puede crear casos.'; break; }
    if (ev.args.length < 15) {
      out.ruta = 'invalido';
      out.mensaje = 'Escribe tu brief después de /nuevo. Ejemplo: /nuevo campaña de lanzamiento para retail, objetivo ventas, inicia 2027-03-15, 6 semanas, estrategia, concepto creativo, contenido para redes y pauta en Meta y Google con 10000 por semana.';
      break;
    }
    const ahora = new Date();
    out.ruta = 'nuevo';
    out.caso_id = generarCasoId(ahora.toISOString(), Math.random());
    out.canal = 'telegram';
    out.texto_solicitud = ev.args;
    out.ts_solicitud = ahora.toISOString();
    out.mensaje = 'Brief ' + out.caso_id + ' recibido. Te aviso aquí cuando la propuesta de campaña esté en revisión. Consulta con /estado ' + out.caso_id;
    break;
  }
  case 'estado': {
    const id = ev.args.trim().toUpperCase();
    if (!esCasoId(id)) { out.ruta = 'invalido'; out.mensaje = 'Usa: /estado DBS-AAAAMMDD-XXXX'; break; }
    out.ruta = 'estado';
    out.caso_id = id;
    break;
  }
  case 'start':
  case 'ayuda':
  default:
    out.ruta = 'ayuda';
    out.mensaje = 'Design & Brand Studio · ENTORNO DE PRUEBA (datos ficticios).\n/nuevo <brief de la campaña> crea un caso.\n/estado <folio> consulta un caso.\nServicios: S-EST01 estrategia, S-CRE01 concepto creativo, S-CON01 contenido, S-VID01 videos, S-PAU01 pauta, S-LND01 landing, S-EML01 email, S-REP01 reporte.\nCanales: meta, google, tiktok, linkedin, email.';
}
return [{ json: out }];
