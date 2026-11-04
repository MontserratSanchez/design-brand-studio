// Nodo Code «O07 Decidir» · entra desde «Llamar A4» o desde «¿Llamar A4?» (rama false)
// Loop de calidad: máximo 3 iteraciones. El revisor (determinista + modelo) puede impedir la liberación.
const item = $input.first().json;
let ctx, veredictoModelo = 'no_ejecutado', correccionesModelo = [];
if (item.salida && item.salida.agente === 'a4_revisor') {
  const abs = absorberRespuesta(item, 'a4_revisor');
  ctx = abs.ctx;
  if (abs.salida.estado === 'ok') {
    veredictoModelo = abs.salida.resultado.veredicto;
    correccionesModelo = Array.isArray(abs.salida.resultado.correcciones) ? abs.salida.resultado.correcciones : [];
  } else {
    veredictoModelo = 'devuelto';
    correccionesModelo = ['A4 no entregó una salida válida'];
  }
} else {
  ctx = JSON.parse(JSON.stringify(item.ctx));
}
const correcciones = ctx.revision_det.correcciones.concat(correccionesModelo);
const aprobado = ctx.revision_det.estado === 'aprobado' && veredictoModelo === 'aprobado';
ctx.historial.push({ ts: new Date().toISOString(), paso: 'decision_loop', estado: aprobado ? 'aprobado' : 'devuelto', iteracion: ctx.iteracion });

if (aprobado) {
  ctx.version = ctx.iteracion;
  return [{ json: { siguiente: 'aprobacion', ctx } }];
}
// Reglas que una nueva redacción no puede arreglar: se detiene sin gastar más llamadas
const estructurales = correcciones.filter(c => /^R[367]:/.test(c));
if (estructurales.length) {
  return [{ json: cerrar(ctx, 'revision_humana', estructurales.join('; '), 'Tu solicitud necesita revisión humana antes de cotizar.') }];
}
if (ctx.iteracion >= ctx.config.limite_iteraciones_loop || ctx.iteracion >= 3) {
  return [{ json: cerrar(ctx, 'detenido_limite', 'Se agotaron 3 iteraciones. Últimas correcciones: ' + correcciones.join('; '), 'No pude generar una propuesta válida. Una persona revisará tu caso.') }];
}
ctx.iteracion += 1;
ctx.correcciones = correcciones;
return [{ json: { siguiente: 'reintentar', ctx } }];
