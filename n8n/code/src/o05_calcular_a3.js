// Nodo Code «O05 Calcular A3» · entra desde «O04 Integrar A2» o desde la rama «reintentar» de «O07 Decidir»
// El cálculo de honorarios es determinista; el modelo A3 solo redacta usando estas cifras.
const ctx = JSON.parse(JSON.stringify($input.first().json.ctx));
ctx.calculo = calcularPropuesta(ctx.requerimiento, ctx.recuperacion.datos);
return [{ json: armarLlamada(ctx, 'a3_propuesta', {
  objetivo: 'Redactar la propuesta de campaña para la empresa cliente usando exactamente las cifras del cálculo',
  datos: {
    requerimiento: ctx.requerimiento,
    industria: ctx.recuperacion.datos.industria,
    servicios_agregados_por_dependencia: ctx.recuperacion.datos.agregados,
    calculo: ctx.calculo,
    correcciones_previas: ctx.correcciones || [],
  },
}) }];
