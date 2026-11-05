// GENERADO por scripts/build_code_nodes.js a partir de n8n/code/src/l05_bloqueo_presupuesto.js — no editar a mano
// ===== reglas.js · Design & Brand Studio (FICTICIO) · v1.0 =====
// Funciones deterministas compartidas. Se insertan al inicio de cada nodo Code
// de n8n con scripts/build_code_nodes.js (n8n Cloud no permite require de archivos locales).
// Sin dependencias externas. Toda cifra viene de datos/ o de las tablas privadas.

const REGLAS = {
  version: '1.0',
  anticipacion_min_dias: 10,          // R1
  semanas_min: 2,                     // R2
  semanas_max: 12,                    // R2
  servicios_min: 1,                   // R2
  servicios_max: 8,                   // R2
  pauta_min_semanal: 5000,            // R2
  umbral_descuento_mxn: 150000,       // R5
  descuento: 0.08,                    // R5
  iva: 0.16,                          // R5
  margen_min: 0.35,                   // R6
  vigencia_dias: 10,                  // R9
  aprobacion_horas: 24,               // R9
  max_iteraciones: 3,
  max_texto: 1500,
};

const ENUMS = {
  tipo_campana: ['lanzamiento', 'posicionamiento', 'temporada', 'generacion_leads'],
  objetivo: ['awareness', 'leads', 'ventas', 'trafico'],
  canales: ['meta', 'google', 'tiktok', 'linkedin', 'email'],
};

const CAMPOS_OBLIGATORIOS = ['tipo_campana', 'objetivo', 'industria', 'fecha_inicio', 'duracion_semanas', 'servicios', 'canales'];

const PATRONES_INYECCION = [
  /ignora(r)?\s+(todas?\s+)?(las\s+)?(instrucciones|reglas)/i,
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /(revela|muestra|dame|imprime).{0,30}(token|api.?key|clave|contrase|secret|prompt)/i,
  /system\s*prompt/i,
  /desactiva.{0,20}(control|regla|pol[ií]tica|guardrail)/i,
  /modo\s+(desarrollador|admin|dios)/i,
  /aprueba\s+(autom[aá]ticamente|sin\s+revis)/i,
];

function r2(n) { return Math.round(n * 100) / 100; }

function diasEntre(desdeISO, hastaISO) {
  const a = Date.parse(desdeISO.slice(0, 10) + 'T00:00:00Z');
  const b = Date.parse(hastaISO.slice(0, 10) + 'T00:00:00Z');
  return Math.round((b - a) / 864e5);
}

function generarCasoId(fechaISO, aleatorio) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let sufijo = '';
  let x = aleatorio;
  for (let i = 0; i < 4; i++) { sufijo += abc.charAt(Math.floor(x * abc.length) % abc.length); x = (x * 7919) % 1; }
  return 'DBS-' + fechaISO.slice(0, 10).replace(/-/g, '') + '-' + sufijo;
}

function esCasoId(s) { return typeof s === 'string' && /^DBS-[0-9]{8}-[A-Z0-9]{4}$/.test(s); }

function detectarInyeccion(texto) {
  const t = String(texto || '');
  return PATRONES_INYECCION.filter(p => p.test(t)).map(p => p.source);
}

function limpiarTexto(texto) {
  return String(texto || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, REGLAS.max_texto);
}

function aLista(v) {
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(/[|,]/).map(x => x.trim()).filter(Boolean);
  return [];
}

// A1 · validación determinista del brief que propone el modelo (R1, R2, listas cerradas)
function validarRequerimiento(req, hoyISO) {
  const faltantes = [];
  const errores = [];
  const r = Object.assign({}, req || {});
  r.servicios = Array.from(new Set(aLista(r.servicios).map(s => s.toUpperCase())));
  r.canales = Array.from(new Set(aLista(r.canales).map(s => s.toLowerCase())));
  for (const c of CAMPOS_OBLIGATORIOS) {
    const v = r[c];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) faltantes.push(c);
  }
  if (r.tipo_campana && !ENUMS.tipo_campana.includes(r.tipo_campana)) errores.push('tipo_campana fuera de lista');
  if (r.objetivo && !ENUMS.objetivo.includes(r.objetivo)) errores.push('objetivo fuera de lista');
  const canalesMalos = r.canales.filter(c => !ENUMS.canales.includes(c));
  if (canalesMalos.length) errores.push('canal no permitido: ' + canalesMalos.join(', '));
  if (r.fecha_inicio) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.fecha_inicio) || isNaN(Date.parse(r.fecha_inicio))) errores.push('fecha_inicio con formato inválido');
    else if (diasEntre(hoyISO, r.fecha_inicio) < REGLAS.anticipacion_min_dias) errores.push('R1: la campaña requiere al menos ' + REGLAS.anticipacion_min_dias + ' días de anticipación');
  }
  if (r.duracion_semanas !== undefined && r.duracion_semanas !== null && r.duracion_semanas !== '') {
    const n = Number(r.duracion_semanas);
    if (!Number.isInteger(n)) errores.push('duracion_semanas debe ser entero');
    else if (n < REGLAS.semanas_min || n > REGLAS.semanas_max) errores.push('R2: duración fuera de ' + REGLAS.semanas_min + '-' + REGLAS.semanas_max + ' semanas');
    r.duracion_semanas = n;
  }
  if (r.servicios.length > REGLAS.servicios_max) errores.push('R2: máximo ' + REGLAS.servicios_max + ' servicios');
  const pauta = r.presupuesto_pauta_semanal;
  if (pauta !== undefined && pauta !== null && pauta !== '') {
    r.presupuesto_pauta_semanal = Number(pauta);
    if (!(r.presupuesto_pauta_semanal > 0)) errores.push('presupuesto_pauta_semanal debe ser positivo');
  } else {
    r.presupuesto_pauta_semanal = null;
  }
  if (r.servicios.includes('S-PAU01')) {
    if (r.presupuesto_pauta_semanal === null) faltantes.push('presupuesto_pauta_semanal');
    else if (r.presupuesto_pauta_semanal < REGLAS.pauta_min_semanal) errores.push('R2: la pauta requiere al menos ' + REGLAS.pauta_min_semanal + ' MXN por semana');
  }
  if (r.presupuesto_cliente !== undefined && r.presupuesto_cliente !== null && r.presupuesto_cliente !== '') {
    const p = Number(r.presupuesto_cliente);
    if (!(p > 0)) errores.push('presupuesto_cliente debe ser positivo');
    r.presupuesto_cliente = p;
  } else {
    r.presupuesto_cliente = null;
  }
  const estado = errores.length ? 'rechazado' : (faltantes.length ? 'requiere_datos' : 'ok');
  return { estado, faltantes, errores, requerimiento: r };
}

// Expande dependencias del catálogo (R4: S-PAU01 agrega S-REP01)
function expandirServicios(claves, catalogo) {
  const out = [];
  const agregar = k => {
    if (out.includes(k)) return;
    out.push(k);
    const s = catalogo.find(x => x.clave === k);
    if (s && s.requiere) aLista(s.requiere).forEach(agregar);
  };
  claves.forEach(agregar);
  return out;
}

// Suma de honorarios, costo y horas para una duración dada
function sumarServicios(servicios, semanas) {
  let honorarios = 0, costo = 0, horas = 0;
  const lineas = servicios.map(s => {
    const mult = s.tipo_cobro === 'semanal' ? semanas : 1;
    const linea = { clave: s.clave, nombre: s.nombre, tipo_cobro: s.tipo_cobro, unidades: mult, precio_unitario: s.precio, importe: r2(s.precio * mult) };
    honorarios += s.precio * mult;
    costo += s.costo * mult;
    horas += s.horas * mult;
    return linea;
  });
  return { lineas, honorarios: r2(honorarios), costo: r2(costo), horas };
}

// A2 · recuperación y verificación contra fuentes autorizadas (R3, R7)
function recuperarDatos(req, catalogo, industrias, capacidad) {
  const fuentes = [];
  const advertencias = [];
  const claves = expandirServicios(req.servicios, catalogo);
  const agregados = claves.filter(k => !req.servicios.includes(k));
  const inexistentes = claves.filter(k => !catalogo.find(s => s.clave === k && String(s.activo) === 'si'));
  if (inexistentes.length) return { estado: 'insuficiente', advertencias: ['Servicios fuera del catálogo: ' + inexistentes.join(', ')], fuentes };
  const ind = industrias.find(i => i.clave === req.industria);
  if (!ind) return { estado: 'insuficiente', advertencias: ['Industria fuera de la lista autorizada: ' + req.industria], fuentes };
  const servicios = claves.map(k => {
    const s = catalogo.find(x => x.clave === k);
    fuentes.push('catalogo_servicios:' + k);
    return { clave: k, nombre: s.nombre, tipo_cobro: s.tipo_cobro, precio: Number(s.precio_mxn), costo: Number(s.costo_mxn), horas: Number(s.horas), canales: aLista(s.canales) };
  });
  fuentes.push('industrias:' + ind.clave);
  if (agregados.length) advertencias.push('R4: se agregó ' + agregados.join(', ') + ' por dependencia del catálogo');
  // R7 industria regulada y canales compatibles
  const regulada = String(ind.regulada) === 'si';
  if (regulada) advertencias.push('R7: industria regulada (' + ind.nombre + '); requiere revisión humana de mensajes y permisos');
  const sinCanal = servicios.filter(s => s.canales.length && !s.canales.some(c => req.canales.includes(c))).map(s => s.clave);
  if (sinCanal.length) advertencias.push('R7: sin canal compatible para ' + sinCanal.join(', '));
  // R3 capacidad
  const mes = req.fecha_inicio.slice(0, 7);
  const cap = capacidad.find(c => String(c.mes) === mes);
  fuentes.push('capacidad_equipo:' + mes);
  const suma = sumarServicios(servicios, req.duracion_semanas);
  const carga = Math.round((suma.horas / req.duracion_semanas) * 10) / 10;
  let cupo_ok = false;
  if (!cap) advertencias.push('R3: no hay dato de capacidad para ' + mes);
  else {
    cupo_ok = carga <= Number(cap.horas_libres_semana);
    if (!cupo_ok) advertencias.push('R3: carga de ' + carga + ' h/semana supera las ' + cap.horas_libres_semana + ' h libres en ' + mes);
  }
  const estado = (!cupo_ok || regulada || sinCanal.length) ? 'insuficiente' : 'ok';
  return {
    estado, fuentes, advertencias,
    datos: {
      servicios, agregados,
      industria: { clave: ind.clave, nombre: ind.nombre, regulada },
      capacidad: { ok: cupo_ok, mes, horas_libres_semana: cap ? Number(cap.horas_libres_semana) : null, carga_semanal: carga, horas_totales: suma.horas },
      sin_canal: sinCanal,
    },
  };
}

// Honorarios con descuento e IVA para una duración (R5)
function totalesPara(servicios, semanas) {
  const s = sumarServicios(servicios, semanas);
  let descuento = 0;
  let nota = 'No aplica descuento (honorarios de ' + s.honorarios + ' MXN)';
  if (s.honorarios > REGLAS.umbral_descuento_mxn) {
    const cand = r2(s.honorarios * REGLAS.descuento);
    if ((s.honorarios - cand - s.costo) / (s.honorarios - cand) >= REGLAS.margen_min) { descuento = cand; nota = 'Descuento de 8 % aplicado por honorarios mayores a 150,000 MXN'; }
    else nota = 'Descuento no aplicado: dejaría el margen bajo 35 %';
  }
  const base = r2(s.honorarios - descuento);
  const iva = r2(base * REGLAS.iva);
  return { suma: s, descuento, nota, base, iva, total: r2(base + iva), margen: Math.round(((base - s.costo) / base) * 10000) / 10000 };
}

// A3 · cálculo determinista (R4, R5, R8)
function calcularPropuesta(req, datos) {
  const semanas = req.duracion_semanas;
  const t = totalesPara(datos.servicios, semanas);
  const pauta = req.presupuesto_pauta_semanal && req.servicios.includes('S-PAU01') ? r2(req.presupuesto_pauta_semanal * semanas) : 0;
  let presupuesto = null;
  if (req.presupuesto_cliente) {
    const diferencia = r2(t.total - req.presupuesto_cliente);
    let semanas_sugeridas = null;
    if (diferencia > 0) {
      for (let w = semanas - 1; w >= REGLAS.semanas_min; w--) {
        const alt = totalesPara(datos.servicios, w);
        if (alt.total <= req.presupuesto_cliente && alt.margen >= REGLAS.margen_min) { semanas_sugeridas = { semanas: w, total: alt.total }; break; }
      }
    }
    presupuesto = { presupuesto_cliente: req.presupuesto_cliente, diferencia, cabe: diferencia <= 0, duracion_sugerida: semanas_sugeridas };
  }
  return {
    reglas_version: REGLAS.version,
    moneda: 'MXN',
    semanas,
    lineas: t.suma.lineas,
    horas_equipo: t.suma.horas,
    desglose: { honorarios: t.suma.honorarios, descuento: t.descuento, base_iva: t.base, iva: t.iva, total: t.total },
    inversion_pauta_informativa: pauta,
    costo_total: t.suma.costo,
    margen: t.margen,
    nota_descuento: t.nota,
    presupuesto,
    vigencia_dias: REGLAS.vigencia_dias,
    rotulo: 'RESULTADO SIMULADO',
  };
}

// Detecta promesas de resultados, ignorando las frases que NIEGAN la garantía
// ("no se garantizan resultados", "no garantizamos ventas", "sin garantía de alcance").
function prometeResultados(texto) {
  const sinNegaciones = String(texto || '')
    .replace(/\b(no|ni|sin)\s+(se\s+|le\s+|les\s+|podemos\s+)?(garantiz\w*|asegur\w*|promet\w*)[^.;!?]*/gi, ' ')
    .replace(/\bsin\s+garant[ií]a[^.;!?]*/gi, ' ');
  return /\b(garantiz\w*|aseguramos|aseguran|te\s+aseguro|prometemos|resultados\s+garantizados|[ée]xito\s+(asegurado|garantizado))\b/i.test(sinNegaciones);
}

// A4 · revisión determinista: recalcula y compara (el modelo revisa redacción, promesas y política)
function revisarPropuesta(req, datos, propuesta, textoPropuesta) {
  const correcciones = [];
  const esperado = calcularPropuesta(req, datos);
  for (const k of Object.keys(esperado.desglose)) {
    if (Math.abs(Number(propuesta.desglose[k]) - esperado.desglose[k]) > 0.01) correcciones.push('Cálculo: ' + k + ' esperado ' + esperado.desglose[k] + ', recibido ' + propuesta.desglose[k]);
  }
  if (esperado.margen < REGLAS.margen_min) correcciones.push('R6: margen ' + (esperado.margen * 100).toFixed(1) + ' % menor a 35 %');
  if (!datos.capacidad.ok) correcciones.push('R3: el equipo no tiene capacidad en ' + datos.capacidad.mes);
  if (datos.industria.regulada) correcciones.push('R7: industria regulada requiere revisión humana');
  if (datos.sin_canal && datos.sin_canal.length) correcciones.push('R7: sin canal compatible para ' + datos.sin_canal.join(', '));
  const texto = String(textoPropuesta || '');
  if (texto) {
    if (!texto.includes('RESULTADO SIMULADO')) correcciones.push('Texto: falta el rótulo RESULTADO SIMULADO');
    const totalTxt = esperado.desglose.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (!texto.includes(totalTxt) && !texto.includes(esperado.desglose.total.toFixed(2))) correcciones.push('Texto: el total ' + totalTxt + ' no aparece o no coincide con el cálculo');
    if (prometeResultados(texto)) correcciones.push('Texto: promete resultados garantizados');
  } else {
    correcciones.push('Texto: la propuesta redactada está vacía');
  }
  return { estado: correcciones.length ? 'devuelto' : 'aprobado', correcciones, esperado };
}

// Aprobación humana: valida el callback de Telegram contra el caso persistido
function validarAprobacion(callbackData, deUsuarioId, caso, coordinadoraId, ahoraISO) {
  const m = /^(apr|rec):(DBS-[0-9]{8}-[A-Z0-9]{4}):v([0-9]+)$/.exec(String(callbackData || ''));
  if (!m) return { ok: false, motivo: 'formato de botón inválido' };
  const [, accion, casoId, ver] = m;
  if (String(deUsuarioId) !== String(coordinadoraId)) return { ok: false, motivo: 'usuario no autorizado para aprobar' };
  if (!caso || caso.caso_id !== casoId) return { ok: false, motivo: 'caso no encontrado' };
  if (caso.estado !== 'pendiente_aprobacion') return { ok: false, motivo: 'el caso no está pendiente (estado: ' + caso.estado + ')' };
  if (Number(caso.version) !== Number(ver)) return { ok: false, motivo: 'versión obsoleta: vigente v' + caso.version };
  if (Date.parse(ahoraISO) > Date.parse(caso.aprobacion_expira)) return { ok: false, motivo: 'aprobación vencida', vencida: true };
  return { ok: true, decision: accion === 'apr' ? 'aprobada' : 'rechazada', caso_id: casoId, version: Number(ver) };
}

// Ficha pública de UNA propuesta (vista ?caso=FOLIO del panel). Solo datos ficticios de la campaña:
// nunca margen, costo interno, usuario, chat_id ni el texto libre de la solicitud.
function fichaPublica(caso, costosCaso) {
  let pj = {};
  try { pj = JSON.parse(caso.propuesta_json || '{}'); } catch (e) { return null; }
  const c = pj.calculo;
  if (!c || !c.desglose || !Array.isArray(c.lineas)) return null;
  const f = pj.ficha || {};
  const semanas = Number(c.semanas) || Number(caso.duracion_semanas) || null;
  const horas = Number(c.horas_equipo) || null;
  const cap = f.capacidad || {};
  const filas = Array.isArray(costosCaso) ? costosCaso : [];
  const conCosto = filas.length > 0 && filas.every(k => k.costo_usd !== null && k.costo_usd !== undefined && k.costo_usd !== '');
  const minutos = caso.ts_propuesta_lista && caso.ts_solicitud ? Math.round(((Date.parse(caso.ts_propuesta_lista) - Date.parse(caso.ts_solicitud)) / 60000) * 10) / 10 : null;
  return {
    caso_id: caso.caso_id,
    estado: caso.estado || null,
    decision: caso.decision || null,
    version: Number(caso.version) || null,
    tipo_campana: caso.tipo_campana || null,
    objetivo: f.objetivo || null,
    industria: f.industria || null,
    fecha_inicio: f.fecha_inicio || null,
    canales: Array.isArray(f.canales) ? f.canales : null,
    semanas,
    vigencia_dias: Number(c.vigencia_dias) || null,
    minutos_a_propuesta: minutos,
    servicios: c.lineas.map(l => ({ clave: l.clave, nombre: l.nombre, tipo_cobro: l.tipo_cobro, unidades: l.unidades, importe: l.importe, agregado: Array.isArray(f.agregados) ? f.agregados.includes(l.clave) : null })),
    kpi: {
      total_mxn: c.desglose.total,
      honorarios_mxn: c.desglose.honorarios,
      descuento_mxn: c.desglose.descuento,
      iva_mxn: c.desglose.iva,
      pauta_mxn: Number(c.inversion_pauta_informativa) || 0,
      horas_equipo: horas,
      horas_semana: horas && semanas ? Math.round((horas / semanas) * 10) / 10 : null,
      capacidad_semana: cap.horas_libres_semana === undefined || cap.horas_libres_semana === null ? null : Number(cap.horas_libres_semana),
      mes_capacidad: cap.mes || null,
      costo_ia_usd: conCosto ? Math.round(filas.reduce((s, k) => s + Number(k.costo_usd), 0) * 1e7) / 1e7 : null,
      llamadas_ia: filas.length,
      tokens_ia: filas.reduce((s, k) => s + (Number(k.tokens_entrada) || 0) + (Number(k.tokens_salida) || 0), 0),
    },
  };
}

// Exportación sanitizada para Pages: solo agregados y columnas no personales
function exportarSanitizado(casos, costos, ahoraISO) {
  const cols = ['caso_id', 'canal', 'estado', 'decision', 'tipo_campana', 'duracion_semanas', 'ts_solicitud', 'ts_propuesta_lista', 'version'];
  const filas = casos.map(c => {
    const o = {};
    for (const k of cols) o[k] = c[k] === undefined || c[k] === '' ? null : c[k];
    return o;
  });
  const listos = casos.filter(c => c.ts_propuesta_lista && c.ts_solicitud).map(c => (Date.parse(c.ts_propuesta_lista) - Date.parse(c.ts_solicitud)) / 60000).sort((a, b) => a - b);
  const mediana = listos.length ? (listos.length % 2 ? listos[(listos.length - 1) / 2] : (listos[listos.length / 2 - 1] + listos[listos.length / 2]) / 2) : null;
  const decididos = casos.filter(c => ['aprobada', 'rechazada', 'vencida'].includes(c.decision));
  const aprob = decididos.filter(c => c.decision === 'aprobada').length;
  const completados = new Set(casos.filter(c => c.decision === 'aprobada' || c.decision === 'rechazada').map(c => c.caso_id));
  // K3 solo promedia casos completados que SÍ tienen llamadas registradas; un caso sin registro no se cuenta como costo 0
  const conRegistro = new Set(costos.filter(k => completados.has(k.caso_id)).map(k => k.caso_id));
  const sinRegistro = [...completados].filter(id => !conRegistro.has(id)).length;
  const costoCompletados = costos.filter(k => conRegistro.has(k.caso_id));
  const sinTarifa = costoCompletados.some(k => k.costo_usd === null || k.costo_usd === undefined || k.costo_usd === '');
  const sumaCompletados = costoCompletados.reduce((s, k) => s + (Number(k.costo_usd) || 0), 0);
  // Casos cerrados sin completar (detenidos, rechazados por reglas, error): su costo se reporta aparte, no se oculta
  const fallidos = new Set(casos.filter(c => ['detenido_limite', 'error', 'revision_humana', 'rechazado', 'requiere_datos', 'sin_capacidad'].includes(c.estado)).map(c => c.caso_id));
  const costoFallidos = costos.filter(k => fallidos.has(k.caso_id) && k.costo_usd !== null && k.costo_usd !== undefined && k.costo_usd !== '');
  const notas = [];
  if (sinTarifa) notas.push('Hay llamadas sin tarifa registrada; K3 no se calcula para no reportar cero');
  if (sinRegistro) notas.push(sinRegistro + ' caso(s) completado(s) sin llamadas registradas quedan fuera del promedio');
  return {
    generado: ahoraISO,
    rotulo: 'DATOS FICTICIOS · RESULTADO SIMULADO',
    kpi: {
      k1_mediana_min: mediana === null ? null : Math.round(mediana * 10) / 10,
      k1_n: listos.length,
      k2_tasa_aprobacion: decididos.length ? Math.round((aprob / decididos.length) * 1000) / 1000 : null,
      k2_n: decididos.length,
      k3_usd_por_caso: conRegistro.size && !sinTarifa ? Math.round((sumaCompletados / conRegistro.size) * 1e6) / 1e6 : null,
      k3_n: conRegistro.size,
      k3_casos_sin_registro: sinRegistro,
      k3_fallidos_usd: Math.round(costoFallidos.reduce((s, k) => s + Number(k.costo_usd), 0) * 1e6) / 1e6,
      k3_fallidos_n: new Set(costoFallidos.map(k => k.caso_id)).size,
      k3_nota: notas.length ? notas.join('. ') : null,
    },
    casos: filas,
    fichas: casos.map(c => fichaPublica(c, costos.filter(k => k.caso_id === c.caso_id))).filter(Boolean),
  };
}

// ===== Skills: adaptador de carga (n8n no tiene carga nativa de skills) =====
// El nodo «Leer skill» descarga skills/<nombre>/SKILL.md y L01 lo valida y lo antepone a las instrucciones.
const SKILLS_POR_AGENTE = { a3_propuesta: 'cotizar-campana-dbs', a4_revisor: 'revisar-propuesta-dbs' };
const SECCIONES_SKILL = ['Activador', 'Objetivo', 'Entradas', 'Fuentes permitidas', 'Pasos', 'Herramientas permitidas', 'Límites', 'Salidas', 'Errores', 'Criterios de aceptación', 'Ejemplos', 'Historial de versiones'];

// Huella corta (djb2) para dejar en la traza qué versión exacta del archivo se aplicó
function huellaTexto(texto) {
  let h = 5381;
  const s = String(texto || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function parsearSkill(texto, agente) {
  const esperado = SKILLS_POR_AGENTE[agente] || null;
  if (!esperado) return { requerido: false, ok: true };
  const t = String(texto || '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(t);
  const r = { requerido: true, ok: false, esperado, nombre: null, version: null, huella: huellaTexto(t), cuerpo: '', motivo: null };
  if (!m) { r.motivo = 'skill sin encabezado (frontmatter)'; return r; }
  const meta = {};
  m[1].split('\n').forEach(l => { const p = l.indexOf(':'); if (p > 0) meta[l.slice(0, p).trim()] = l.slice(p + 1).trim(); });
  r.nombre = meta.name || null;
  r.version = meta.version || null;
  r.cuerpo = m[2].trim();
  const faltan = SECCIONES_SKILL.filter(s => !new RegExp('^## ' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'm').test(r.cuerpo));
  if (r.nombre !== esperado) r.motivo = 'skill incorrecto: se esperaba ' + esperado + ' y llegó ' + r.nombre;
  else if (meta.agente !== agente) r.motivo = 'el skill no está autorizado para ' + agente;
  else if (!/^\d+\.\d+\.\d+$/.test(r.version || '')) r.motivo = 'skill sin versión válida';
  else if (faltan.length) r.motivo = 'skill incompleto, faltan secciones: ' + faltan.join(', ');
  else r.ok = true;
  return r;
}

// ===== Loop de seguridad y costo: evaluar permisos y presupuesto ANTES de cada llamada =====
const AGENTES_PERMITIDOS = ['a1_recepcion', 'a2_catalogo', 'a3_propuesta', 'a4_revisor'];
function evaluarPaso(p) {
  const controles = [];
  const c = (control, ok, detalle) => controles.push({ control, ok, detalle });
  c('agente_permitido', AGENTES_PERMITIDOS.includes(p.agente), p.agente);
  c('caso_id_valido', esCasoId(p.caso_id), p.caso_id || 'vacío');
  c('instrucciones_cargadas', String(p.instrucciones || '').length >= 200, (String(p.instrucciones || '').length) + ' caracteres');
  if (p.skill && p.skill.requerido) c('skill_cargado', p.skill.ok, p.skill.ok ? p.skill.nombre + '@' + p.skill.version + '#' + p.skill.huella : p.skill.motivo);
  const consumo = Number(p.consumo_tokens) || 0;
  const reserva = (Number(p.tokens_estimados_entrada) || 0) + (Number(p.max_tokens) || 0);
  const limite = Number(p.limite_tokens) || 25000;
  c('presupuesto_tokens', consumo + reserva <= limite, consumo + ' usados + ' + reserva + ' reservados de ' + limite);
  const pin = Number(p.tarifa_entrada), pout = Number(p.tarifa_salida);
  if (p.tarifa_entrada != null && p.tarifa_entrada !== '' && p.tarifa_salida != null && p.tarifa_salida !== '' && Number(p.limite_costo_usd) > 0) {
    // costo real acumulado del caso (medido en L02) + costo estimado de esta llamada con max_tokens reservados
    const acumulado = Number(p.consumo_usd) || 0;
    const estimado = ((Number(p.tokens_estimados_entrada) || 0) * pin + (Number(p.max_tokens) || 0) * pout) / 1e6;
    const total = Math.round((acumulado + estimado) * 1e6) / 1e6;
    c('presupuesto_costo', total <= Number(p.limite_costo_usd), acumulado.toFixed(6) + ' USD medidos + ' + estimado.toFixed(6) + ' reservados de ' + p.limite_costo_usd);
  } else {
    controles.push({ control: 'presupuesto_costo', ok: true, detalle: 'tarifa no registrada: solo aplica el límite de tokens' });
  }
  if (p.ts_solicitud) {
    const seg = Math.round((Date.parse(p.ahora) - Date.parse(p.ts_solicitud)) / 1000);
    const lim = Number(p.limite_segundos) || 300;
    c('tiempo_caso', !(seg > lim), seg + ' s de ' + lim + ' s');
  }
  const fallo = controles.find(x => !x.ok);
  return { permitido: !fallo, motivo: fallo ? fallo.control + ': ' + fallo.detalle : null, controles };
}
// ===== fin reglas.js =====

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
