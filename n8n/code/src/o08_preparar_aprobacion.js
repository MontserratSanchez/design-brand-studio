// Nodo Code «O08 Preparar aprobación» · rama «aprobacion» de «O07 Decidir»
// Deja el caso en pendiente_aprobacion y arma el mensaje con botones ligados a caso_id + versión.
const ctx = JSON.parse(JSON.stringify($input.first().json.ctx));
const ahora = new Date();
const expira = new Date(ahora.getTime() + REGLAS.aprobacion_horas * 3600 * 1000).toISOString();
const c = ctx.calculo;
const fmt = n => '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const resumen = [
  'APROBACIÓN REQUERIDA · ' + ctx.caso_id + ' v' + ctx.version,
  'Acción: enviar propuesta al cliente y reservar horas del equipo (SIMULADO)',
  ctx.requerimiento.tipo_campana + ' · ' + ctx.recuperacion.datos.industria.nombre + ' · inicia ' + ctx.requerimiento.fecha_inicio + ' · ' + c.semanas + ' semanas · ' + c.horas_equipo + ' h de equipo',
  'Servicios: ' + c.lineas.map(l => l.clave).join(', '),
  'Total honorarios con IVA: ' + fmt(c.desglose.total) + ' MXN · margen ' + (c.margen * 100).toFixed(1) + ' %' + (c.inversion_pauta_informativa ? ' · pauta aparte ' + fmt(c.inversion_pauta_informativa) : ''),
  'Expira: ' + expira.slice(0, 16).replace('T', ' ') + ' UTC',
].join('\n');
return [{ json: {
  ctx,
  actualizacion_caso: {
    caso_id: ctx.caso_id,
    estado: 'pendiente_aprobacion',
    version: ctx.version,
    total_mxn: c.desglose.total,
    margen: c.margen,
    propuesta_json: JSON.stringify({ calculo: c, texto: ctx.texto_propuesta }).slice(0, 8000),
    aprobacion_expira: expira,
    ts_propuesta_lista: ahora.toISOString(),
    consumo_tokens: ctx.consumo_tokens,
    tipo_campana: ctx.requerimiento.tipo_campana,
    duracion_semanas: c.semanas,
  },
  mensaje_coordinadora: { chat_id: ctx.config.chat_id_coordinadora, texto: resumen + '\n\n' + ctx.texto_propuesta.slice(0, 2500) },
  callback_aprobar: 'apr:' + ctx.caso_id + ':v' + ctx.version,
  callback_rechazar: 'rec:' + ctx.caso_id + ':v' + ctx.version,
  aviso_solicitante: { chat_id: ctx.chat_id, texto: 'Tu propuesta ' + ctx.caso_id + ' está lista y en revisión interna. Te aviso cuando haya decisión.' },
  traza: { ts: ahora.toISOString(), caso_id: ctx.caso_id, tipo: 'solicitud_aprobacion', agente: 'orquestador', iteracion: ctx.iteracion, estado: 'pendiente_aprobacion', detalle: 'v' + ctx.version + ' total ' + c.desglose.total, llamada_id: null },
} }];
