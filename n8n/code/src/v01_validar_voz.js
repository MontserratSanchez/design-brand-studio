// Nodo Code «V01 Validar voz» · workflow «DBS · Voz (herramienta de ElevenLabs)»
// El Webhook ya exige el encabezado secreto (credencial Header Auth). Aquí se valida el cuerpo.
// Cuerpo esperado: {"accion":"consultar","caso_id":"DBS-..."} o {"accion":"crear","descripcion":"..."}
const b = ($input.first().json.body) || {};
const out = { ruta: 'invalido', mensaje: '', canal: 'voz', usuario: 'U-VOZ001' }; // seudónimo fijo del canal público
const accion = String(b.accion || '').toLowerCase();
const descripcion = limpiarTexto(b.descripcion || '');
const iny = detectarInyeccion(descripcion + ' ' + (b.caso_id || ''));
if (iny.length) {
  out.ruta = 'bloqueado';
  out.mensaje = 'No puedo procesar esa instrucción. Solo puedo crear o consultar briefs de campaña de prueba.';
  out.patrones = iny;
} else if (accion === 'consultar') {
  const id = String(b.caso_id || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!esCasoId(id)) out.mensaje = 'El folio debe tener el formato DBS, ocho dígitos de fecha y cuatro caracteres.';
  else { out.ruta = 'consultar'; out.caso_id = id; }
} else if (accion === 'crear') {
  if (descripcion.length < 15) out.mensaje = 'Necesito el brief de la campaña: tipo, objetivo, industria, fecha de inicio, semanas, servicios y canales.';
  else {
    const ahora = new Date().toISOString();
    out.ruta = 'crear';
    out.caso_id = generarCasoId(ahora, Math.random());
    out.texto_solicitud = descripcion;
    out.ts_solicitud = ahora;
    out.chat_id = null;
    out.mensaje = 'Creé el caso ' + out.caso_id + '. Resultado simulado con datos ficticios. Puedes consultarlo en unos minutos con ese folio.';
  }
} else {
  out.mensaje = 'Acción no permitida. Usa crear o consultar.';
}
return [{ json: out }];
