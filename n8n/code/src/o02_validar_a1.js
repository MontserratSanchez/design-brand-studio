// Nodo Code «O02 Validar A1» · después de «Llamar A1»
// El modelo propone el requerimiento; la validación final es determinista (R1, R2, listas cerradas).
const { ctx, salida } = absorberRespuesta($input.first().json, 'a1_recepcion');
if (salida.estado === 'error') {
  return [{ json: cerrar(ctx, 'error', 'A1: ' + salida.advertencias.join('; '), 'No pude procesar tu solicitud por un error técnico. Intenta de nuevo más tarde.') }];
}
const req = salida.resultado.requerimiento || {};
const v = validarRequerimiento(req, ctx.hoy);
const faltantesModelo = Array.isArray(salida.resultado.faltantes) ? salida.resultado.faltantes : [];
const faltantes = Array.from(new Set(v.faltantes.concat(faltantesModelo.filter(f => CAMPOS_OBLIGATORIOS.includes(f)))));
ctx.validacion_a1 = { estado: v.estado, faltantes, errores: v.errores };
if (v.errores.length) {
  return [{ json: cerrar(ctx, 'rechazado', v.errores.join('; '), 'Tu solicitud no cumple las políticas: ' + v.errores.join('; ') + '.') }];
}
if (faltantes.length) {
  return [{ json: cerrar(ctx, 'requiere_datos', 'Faltan: ' + faltantes.join(', '), 'Me faltan estos datos para cotizar: ' + faltantes.join(', ') + '. Envía una nueva solicitud con /nuevo incluyéndolos.') }];
}
ctx.requerimiento = v.requerimiento;
return [{ json: { siguiente: 'a2', ctx } }];
