// Nodo Code «O01 Plan» · workflow «DBS · Procesar caso (orquestador)»
// Disparo: {caso_id, canal, usuario, texto_solicitud, chat_id?, ts_solicitud} desde Telegram o voz.
// Salida: item listo para «Llamar A1» (sub-workflow «DBS · Llamar agente») con ctx del caso.
const CONFIG = {
  modelo: 'claude-haiku-5-5',          // cámbialo aquí; queda registrado en costos
  tarifa_entrada_usd_mtok: null,       // registra la tarifa vigente con fuente y fecha en costos/tarifas.csv
  tarifa_salida_usd_mtok: null,        // null = costo desconocido (no se reporta 0)
  limite_tokens_caso: 40000,           // medido 2026-11-05: el razonamiento interno del modelo cuenta como salida (P11, caso DBS-20261105-HUPJ)
  limite_costo_usd: 0.05,              // supuesto inicial por caso
  max_tokens: { a1_recepcion: 1200, a2_catalogo: 900, a3_propuesta: 3000, a4_revisor: 2000 },
  url_instrucciones: 'https://raw.githubusercontent.com/MontserratSanchez/design-brand-studio/main/agentes/',
  limite_iteraciones_loop: 3,
  limite_segundos_caso: 300,           // loop de seguridad y costo: tiempo máximo del caso antes de nuevas llamadas
  inyectar_falla_v1: false,            // SOLO para la prueba P11: true altera la V1 de A3 para demostrar V1 → V2
};
// Entrada de este nodo: filas de «Buscar coordinadora» (tabla usuarios, rol = coordinadora)
const e = $('Execute Workflow Trigger').first().json;
const coord = $input.all().map(i => i.json).find(r => r && r.rol === 'coordinadora' && String(r.activo) !== 'false');
if (!coord) throw new Error('O01: no hay coordinadora activa en la tabla usuarios');
CONFIG.chat_id_coordinadora = String(coord.chat_id);
if (!esCasoId(e.caso_id)) throw new Error('O01: caso_id inválido');
const ahora = new Date().toISOString();
const ctx = {
  caso_id: e.caso_id,
  canal: e.canal,
  usuario: e.usuario,
  chat_id: e.chat_id || null,
  texto_solicitud: limpiarTexto(e.texto_solicitud),
  ts_solicitud: e.ts_solicitud || ahora,
  hoy: ahora.slice(0, 10),
  iteracion: 1,
  consumo_tokens: 0,
  config: CONFIG,
  plan: ['a1_recepcion', 'a2_catalogo', 'a3_propuesta', 'a4_revisor', 'aprobacion_humana'],
  historial: [{ ts: ahora, paso: 'plan', estado: 'ok' }],
};
return [{ json: armarLlamada(ctx, 'a1_recepcion', {
  objetivo: 'Convertir el brief del cliente en un requerimiento estructurado o pedir los datos faltantes',
  datos: {
    texto_solicitud: ctx.texto_solicitud,
    fecha_de_hoy: ctx.hoy,
    servicios_claves: ['S-EST01', 'S-CRE01', 'S-CON01', 'S-VID01', 'S-PAU01', 'S-LND01', 'S-EML01', 'S-REP01'],
    industrias_claves: ['retail', 'tecnologia', 'alimentos', 'educacion', 'turismo', 'moda', 'salud', 'financiera', 'bebidas_alcoholicas', 'apuestas'],
    canales_validos: ENUMS.canales,
  },
}) }];
