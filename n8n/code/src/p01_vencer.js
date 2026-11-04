// Nodo Code «P01 Detectar vencidos» · workflow «DBS · Tareas programadas» (cada hora)
// Entrada: filas de casos con estado = pendiente_aprobacion. Salida: solo las vencidas (R9).
const ahora = new Date().toISOString();
const vencidos = $input.all().map(i => i.json)
  .filter(c => c && c.estado === 'pendiente_aprobacion' && c.aprobacion_expira && Date.parse(ahora) > Date.parse(c.aprobacion_expira))
  .map(c => ({ json: {
    caso_id: c.caso_id,
    estado: 'cerrado_vencido',
    decision: 'vencida',
    ts_decision: ahora,
    chat_id: c.chat_id || null,
    aviso: 'La propuesta ' + c.caso_id + ' venció sin aprobación. No se envió nada (RESULTADO SIMULADO).',
    traza: { ts: ahora, caso_id: c.caso_id, tipo: 'vencimiento', agente: 'tarea_programada', iteracion: 0, estado: 'cerrado_vencido', detalle: 'expiró ' + c.aprobacion_expira, llamada_id: null },
  } }));
return vencidos;
