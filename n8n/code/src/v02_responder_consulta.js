// Nodo Code «V02 Responder consulta» · workflow «DBS · Voz»
// Solo devuelve campos no sensibles: el canal de voz es público y únicamente maneja datos ficticios.
const ctx = $('V01 Validar voz').first().json;
const caso = $input.all().map(i => i.json).find(r => r && r.caso_id === ctx.caso_id);
if (!caso) return [{ json: { encontrado: false, caso_id: ctx.caso_id, mensaje: 'No encontré ese folio en el registro de prueba.' } }];
const partes = ['El caso ' + caso.caso_id + ' está en estado ' + String(caso.estado).replace(/_/g, ' ') + '.'];
if (caso.total_mxn) partes.push('La propuesta versión ' + caso.version + ' suma ' + Number(caso.total_mxn).toLocaleString('es-MX', { minimumFractionDigits: 2 }) + ' pesos con IVA. Es un resultado simulado.');
if (caso.decision) partes.push('Decisión registrada: ' + caso.decision + '.');
return [{ json: { encontrado: true, caso_id: caso.caso_id, estado: caso.estado, version: caso.version || 0, mensaje: partes.join(' ') } }];
