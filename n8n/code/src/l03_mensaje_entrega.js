// Nodo Code «L03 Preparar entrega» · después de guardar la traza en W3.
// Describe exclusivamente la llamada que acaba de responder; no ejecuta otro modelo.
const respuesta = $('L02 Procesar respuesta').first().json;
const s = respuesta.salida;
const ctx = respuesta.ctx || {};
const agentes = {
  a1_recepcion: ['📝 A1 · Recepción y validación', 'A1 → Orquestador → A2', ['requerimiento', 'faltantes']],
  a2_catalogo: ['📚 A2 · Catálogo y capacidad', 'A2 → Orquestador → A3', ['cobertura', 'observaciones', 'solicitudes_fuera_de_catalogo']],
  a3_propuesta: ['✍️ A3 · Propuesta de campaña', 'A3 → Orquestador → A4', ['texto_propuesta', 'supuestos']],
  a4_revisor: ['🔎 A4 · Revisor de calidad', 'A4 → Orquestador → revisión humana o corrección', ['veredicto', 'correcciones']],
};
const ficha = agentes[s.agente];
const chat = ctx.config && ctx.config.chat_id_coordinadora;
let mensaje_entrega = null;
if (ficha && chat) {
  const resultado = {};
  if (s.estado === 'ok') {
    for (const campo of ficha[2]) {
      if (s.resultado && s.resultado[campo] !== undefined) resultado[campo] = s.resultado[campo];
    }
  }
  const detalle = s.estado === 'ok'
    ? JSON.stringify(resultado, null, 2)
    : 'La llamada no produjo una salida válida. El orquestador resolverá el error; no se anuncia una entrega exitosa.';
  const texto = [
    ficha[0] + ' · ' + s.caso_id,
    'Iteración: ' + (ctx.iteracion || 1) + ' · Estado de la llamada: ' + s.estado,
    '📦 Ruta de entrega: ' + ficha[1],
    detalle.length > 2400 ? detalle.slice(0, 2400) + '\n[Resumen recortado; detalle completo en el registro privado]' : detalle,
    s.agente === 'a4_revisor'
      ? 'El veredicto de A4 es de calidad. La decisión final corresponde a la coordinadora.'
      : 'Salida del agente pendiente de los controles del orquestador.',
    'DATOS FICTICIOS · RESULTADO SIMULADO',
  ].join('\n\n');
  mensaje_entrega = { chat_id: String(chat), texto };
}
return [{ json: { ...respuesta, mensaje_entrega } }];
