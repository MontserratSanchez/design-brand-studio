// Nodo Code «T03 Formatear estado» · workflow «DBS · Entrada Telegram»
// Entrada: fila(s) de la tabla casos filtrada por caso_id (Always Output Data activo) y el item de «T02 Autorizar y enrutar».
// Regla: el solicitante solo ve sus propios casos; la coordinadora ve todos.
const ctx = $('T02 Autorizar y enrutar').first().json;
const caso = $input.all().map(i => i.json).find(r => r && r.caso_id === ctx.caso_id);
let mensaje;
if (!caso) mensaje = 'No encontré el caso ' + ctx.caso_id + '.';
else if (ctx.rol !== 'coordinadora' && caso.usuario !== ctx.usuario) mensaje = 'No encontré el caso ' + ctx.caso_id + '.'; // no revela existencia
else {
  const partes = ['Caso ' + caso.caso_id, 'Estado: ' + caso.estado, 'Versión: v' + (caso.version || 0)];
  if (caso.total_mxn) partes.push('Total propuesto: $' + Number(caso.total_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 }) + ' MXN (RESULTADO SIMULADO)');
  if (caso.decision) partes.push('Decisión: ' + caso.decision);
  if (caso.motivo) partes.push('Motivo: ' + caso.motivo);
  mensaje = partes.join('\n');
}
return [{ json: { chat_id: ctx.chat_id, mensaje } }];
