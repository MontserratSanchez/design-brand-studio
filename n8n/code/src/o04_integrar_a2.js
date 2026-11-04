// Nodo Code «O04 Integrar A2» · después de «Llamar A2»
const { ctx, salida } = absorberRespuesta($input.first().json, 'a2_catalogo');
const rec = ctx.recuperacion;
if (salida.estado === 'error') {
  return [{ json: cerrar(ctx, 'error', 'A2: ' + salida.advertencias.join('; '), 'No pude verificar el catálogo por un error técnico. Intenta más tarde.') }];
}
if (rec.estado !== 'ok') {
  const sinCapacidad = rec.datos && rec.datos.capacidad && !rec.datos.capacidad.ok && !rec.datos.industria.regulada && !rec.datos.sin_canal.length;
  return [{ json: cerrar(ctx, sinCapacidad ? 'sin_capacidad' : 'revision_humana', rec.advertencias.join('; '),
    sinCapacidad ? 'El equipo no tiene capacidad para iniciar en esa fecha. Envía otra fecha de inicio con /nuevo.' : 'Tu brief necesita revisión humana: ' + rec.advertencias.join('; ')) }];
}
const fuera = Array.isArray(salida.resultado.solicitudes_fuera_de_catalogo) ? salida.resultado.solicitudes_fuera_de_catalogo : [];
if (salida.resultado.cobertura !== 'completa' || fuera.length) {
  return [{ json: cerrar(ctx, 'revision_humana', 'A2 cobertura ' + salida.resultado.cobertura + '; fuera de catálogo: ' + fuera.join(', '),
    'Tu brief incluye elementos que no están en el catálogo autorizado (' + (fuera.join(', ') || 'ver observaciones') + '). Una persona del equipo revisará tu caso.') }];
}
ctx.observaciones_a2 = salida.resultado.observaciones || [];
return [{ json: { siguiente: 'a3', ctx } }];
