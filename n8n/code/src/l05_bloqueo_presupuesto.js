// Nodo Code «L05 Bloqueo» · workflow «DBS · Llamar agente» (rama false de «¿Permitido?»)
// No se llama al modelo: se devuelve error controlado y se registra la causa como traza de guardrail.
const prep = $('L01 Preparar llamada').first().json;
const trig = $('Execute Workflow Trigger').first().json;
const ahora = new Date().toISOString();
const salida = {
  caso_id: prep.caso_id || null,
  agente: prep.agente,
  estado: 'error',
  resultado: {},
  fuentes: [],
  advertencias: ['Guardrail: ' + prep.motivo],
  duracion_ms: 0,
  consumo_ref: null,
};
const fila_traza = {
  ts: ahora,
  caso_id: prep.caso_id || 'SIN-CASO',
  tipo: 'guardrail_presupuesto',
  agente: prep.agente,
  iteracion: (trig.entrada && trig.entrada.iteracion) || 1,
  estado: 'bloqueado',
  detalle: prep.motivo,
  llamada_id: null,
};
return [{ json: { salida, fila_costo: null, fila_traza, tokens_usados: 0, ctx: trig.ctx } }];
