// Nodo Code «O06 Preparar A4» · después de «Llamar A3»
// Primero revisión determinista; si A3 falló, se salta la llamada a A4 (siguiente = decidir).
const { ctx, salida } = absorberRespuesta($input.first().json, 'a3_propuesta');
const texto = salida.estado === 'ok' ? String(salida.resultado.texto_propuesta || '') : '';
ctx.texto_propuesta = texto;
ctx.revision_det = revisarPropuesta(ctx.requerimiento, ctx.recuperacion.datos, ctx.calculo, texto);
delete ctx.revision_det.esperado;
if (salida.estado !== 'ok') {
  ctx.revision_det.correcciones.unshift('A3 no entregó una salida válida: ' + salida.advertencias.join('; '));
  ctx.revision_det.estado = 'devuelto';
  return [{ json: { siguiente: 'decidir', ctx } }];
}
const llamada = armarLlamada(ctx, 'a4_revisor', {
  objetivo: 'Revisar la propuesta contra políticas, fuentes y coherencia antes de liberarla',
  datos: {
    texto_propuesta: texto,
    calculo: ctx.calculo,
    revision_determinista: ctx.revision_det,
    servicios: ctx.recuperacion.datos.servicios.map(s => ({ clave: s.clave, nombre: s.nombre })),
  },
});
llamada.siguiente = 'a4';
return [{ json: llamada }];
