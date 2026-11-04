// Nodo Code «T04 Validar aprobación» · workflow «DBS · Entrada Telegram»
// Entrada: fila del caso (tabla casos) y el item de «T02 Autorizar y enrutar».
// La coordinadora autorizada se lee de la tabla usuarios (rol = coordinadora) en el nodo «Buscar coordinadora».
const ctx = $('T02 Autorizar y enrutar').first().json;
const caso = $input.all().map(i => i.json).find(r => r && r.caso_id === ctx.caso_id) || null;
const coord = $('Buscar coordinadora').all().map(i => i.json).find(r => r.rol === 'coordinadora' && String(r.activo) !== 'false');
const ahora = new Date().toISOString();
const v = validarAprobacion(ctx.callback_data, ctx.telegram_user_id, caso, coord ? coord.telegram_user_id : null, ahora);
const out = {
  ok: v.ok,
  caso_id: ctx.caso_id,
  callback_id: ctx.callback_id,
  chat_id_coordinadora: ctx.chat_id,
  chat_id_solicitante: caso ? caso.chat_id : null,
  ts_decision: ahora,
  responsable: ctx.usuario,
};
if (v.ok) {
  out.decision = v.decision;
  out.version = v.version;
  out.nuevo_estado = v.decision === 'aprobada' ? 'cerrado_aprobado' : 'cerrado_rechazado';
  out.aviso_coordinadora = 'Registrado: ' + v.decision + ' ' + v.caso_id + ' v' + v.version;
  out.aviso_solicitante = v.decision === 'aprobada'
    ? 'Tu propuesta ' + v.caso_id + ' fue aprobada. RESULTADO SIMULADO: la propuesta se considera enviada y las horas del equipo reservadas; no hay compromiso real.'
    : 'Tu propuesta ' + v.caso_id + ' no fue aprobada por la coordinación de cuentas. Puedes enviar un nuevo brief con /nuevo.';
} else {
  out.decision = v.vencida ? 'vencida' : null;
  out.nuevo_estado = v.vencida ? 'cerrado_vencido' : null;
  out.aviso_coordinadora = 'No se registró la acción: ' + v.motivo;
}
return [{ json: out }];
