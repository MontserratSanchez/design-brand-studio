// Nodo Code «L02 Procesar respuesta» · workflow «DBS · Llamar agente»
// Entrada: respuesta del nodo HTTP «Claude Messages API» (con "Continue On Fail" activo) y el item de «L01 Preparar llamada».
// Salida: {salida (contrato), fila_costo, fila_traza}. Nunca reporta costo 0 si la tarifa es desconocida.
const prep = $('L01 Preparar llamada').first().json;
const trig = $('Execute Workflow Trigger').first().json;
const r = $input.first().json;
const ahora = new Date().toISOString();
const duracion = Date.parse(ahora) - Date.parse(prep.ts_inicio);

const REQUERIDOS = {
  a1_recepcion: ['requerimiento', 'faltantes'],
  a2_catalogo: ['cobertura', 'observaciones'],
  a3_propuesta: ['texto_propuesta'],
  a4_revisor: ['veredicto', 'correcciones'],
};

let estado = 'ok';
const advertencias = [];
let resultado = {};
const usage = r.usage || {};
if (r.error || !Array.isArray(r.content)) {
  estado = 'error';
  advertencias.push('Fallo de la API del modelo: ' + (r.error && (r.error.message || r.error.type) || 'respuesta sin contenido'));
} else {
  const texto = r.content.filter(c => c.type === 'text').map(c => c.text).join('').trim();
  const limpio = texto.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    resultado = JSON.parse(limpio);
    const faltan = (REQUERIDOS[prep.agente] || []).filter(k => !(k in resultado));
    if (faltan.length) { estado = 'error'; advertencias.push('Salida sin campos obligatorios: ' + faltan.join(', ')); }
  } catch (e) {
    estado = 'error';
    advertencias.push('La salida del modelo no es JSON válido');
    resultado = { texto_crudo: limpio.slice(0, 500) };
  }
  if (r.stop_reason === 'max_tokens') advertencias.push('Respuesta truncada por max_tokens');
}

const tin = Number(usage.input_tokens) || 0;
const tout = Number(usage.output_tokens) || 0;
const tcr = Number(usage.cache_read_input_tokens) || 0;
const tcw = Number(usage.cache_creation_input_tokens) || 0;
const medido = Boolean(r.usage);
const pin = trig.tarifa_entrada_usd_mtok;
const pout = trig.tarifa_salida_usd_mtok;
const tarifaConocida = pin !== null && pin !== undefined && pin !== '' && pout !== null && pout !== undefined && pout !== '';
// Cᵢ = (Tentrada × Pentrada + Tsalida × Psalida) / 1 000 000 · la caché se registra aparte y no se suma aquí
const costo = medido && tarifaConocida ? Math.round(((tin * Number(pin) + tout * Number(pout)) / 1e6) * 1e8) / 1e8 : null;

const fila_costo = {
  fecha_hora: ahora,
  caso_id: prep.caso_id,
  llamada_id: prep.llamada_id,
  etapa: 'operacion',
  agente: prep.agente,
  proveedor: 'anthropic',
  modelo: r.model || (prep.body && prep.body.model) || null,
  tokens_entrada: medido ? tin : prep.tokens_estimados_entrada,
  tokens_salida: medido ? tout : null,
  tokens_cache_lectura: tcr,
  tokens_cache_escritura: tcw,
  unidad_cobro: 'USD por millón de tokens',
  tarifa_entrada: tarifaConocida ? Number(pin) : null,
  tarifa_salida: tarifaConocida ? Number(pout) : null,
  costo_usd: costo,
  moneda: 'USD',
  estado,
  reintento: Number(trig.reintento) || 0,
  origen: medido ? (tarifaConocida ? 'medido' : 'medido_sin_tarifa') : 'estimado_sin_respuesta',
};
const salida = {
  caso_id: prep.caso_id,
  agente: prep.agente,
  estado,
  resultado,
  fuentes: [],
  advertencias,
  duracion_ms: duracion,
  consumo_ref: prep.llamada_id,
};
const fila_traza = {
  ts: ahora,
  caso_id: prep.caso_id,
  tipo: 'llamada_agente',
  agente: prep.agente,
  iteracion: (trig.entrada && trig.entrada.iteracion) || 1,
  estado,
  detalle: JSON.stringify({ advertencias, claves_resultado: Object.keys(resultado) }).slice(0, 1000),
  llamada_id: prep.llamada_id,
};
// ctx viaja intacto de ida y vuelta para que el orquestador no dependa de referencias entre ejecuciones
return [{ json: { salida, fila_costo, fila_traza, tokens_usados: tin + tout, ctx: trig.ctx } }];
