// ===== orquestador.js · helpers del orquestador (se insertan en los nodos O0x) =====
function armarLlamada(ctx, agente, parte) {
  return {
    agente,
    url_instrucciones: ctx.config.url_instrucciones + agente + '.md',
    entrada: {
      caso_id: ctx.caso_id, canal: ctx.canal, usuario: ctx.usuario,
      objetivo: parte.objetivo, datos: parte.datos, modo: 'SIMULADO',
      limite_costo_usd: ctx.config.limite_costo_usd, iteracion: ctx.iteracion,
    },
    consumo_tokens_caso: ctx.consumo_tokens,
    limite_tokens_caso: ctx.config.limite_tokens_caso,
    modelo: ctx.config.modelo,
    max_tokens: ctx.config.max_tokens[agente],
    tarifa_entrada_usd_mtok: ctx.config.tarifa_entrada_usd_mtok,
    tarifa_salida_usd_mtok: ctx.config.tarifa_salida_usd_mtok,
    reintento: 0,
    ctx,
  };
}

// Toma la respuesta del sub-workflow «DBS · Llamar agente» y actualiza el ctx del caso
function absorberRespuesta(item, paso) {
  const ctx = JSON.parse(JSON.stringify(item.ctx));
  ctx.consumo_tokens += Number(item.tokens_usados) || 0;
  ctx.historial.push({ ts: new Date().toISOString(), paso, estado: item.salida.estado, llamada_id: item.salida.consumo_ref });
  return { ctx, salida: item.salida };
}

// Cierre sin propuesta: el caso NO se presenta como exitoso
function cerrar(ctx, estadoFinal, motivo, mensajeUsuario) {
  return {
    siguiente: 'cerrar',
    ctx,
    actualizacion_caso: { caso_id: ctx.caso_id, estado: estadoFinal, motivo: String(motivo).slice(0, 500), ts_cierre: new Date().toISOString(), consumo_tokens: ctx.consumo_tokens },
    aviso_solicitante: { chat_id: ctx.chat_id, texto: mensajeUsuario + '\nFolio: ' + ctx.caso_id },
    traza: { ts: new Date().toISOString(), caso_id: ctx.caso_id, tipo: 'cierre', agente: 'orquestador', iteracion: ctx.iteracion, estado: estadoFinal, detalle: String(motivo).slice(0, 1000), llamada_id: null },
  };
}
// ===== fin orquestador.js =====
