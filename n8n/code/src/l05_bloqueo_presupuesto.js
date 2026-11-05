// Nodo Code «L05 Bloqueo» · workflow «DBS · Llamar agente» (rama false de «¿Permitido?»)
// Loop de seguridad y costo → DETENER: no se llama al modelo; error controlado y causa registrada en la traza.
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
  tipo: 'guardrail_loop_seguridad',
  agente: prep.agente,
  iteracion: (trig.entrada && trig.entrada.iteracion) || 1,
  estado: 'bloqueado',
  detalle: JSON.stringify({ motivo: prep.motivo, skill: prep.skill || 'no_aplica', controles: prep.controles || [] }).slice(0, 1000),
  llamada_id: null,
};
return [{ json: { salida, fila_costo: null, fila_traza, tokens_usados: 0, ctx: trig.ctx } }];
