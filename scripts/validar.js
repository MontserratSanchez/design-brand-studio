#!/usr/bin/env node
// Controles previos al despliegue (los ejecuta GitHub Actions; deben poder fallar ante un error real).
// 1) estructura de datos de referencia  2) dist/ sincronizado  3) pruebas de reglas y concatenación
// 3b) skills completos y loop de seguridad y costo  4) datos públicos sanitizados  5) archivos obligatorios  6) sin secretos en lo que se publica
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const raiz = path.join(__dirname, '..');
const errores = [];
const paso = (n, fn) => { try { fn(); console.log('✔ ' + n); } catch (e) { errores.push(n + ': ' + e.message); console.error('✘ ' + n + ': ' + e.message); } };
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
function csv(f) {
  const [c, ...filas] = leer(f).trim().split('\n');
  const cols = c.split(',');
  return { cols, filas: filas.map(l => { const v = l.split(','); if (v.length !== cols.length) throw new Error(f + ' fila con ' + v.length + ' columnas'); const o = {}; cols.forEach((k, i) => { o[k] = v[i]; }); return o; }) };
}

paso('Estructura de datos de referencia', () => {
  const cat = csv('datos/catalogo_servicios.csv');
  const claves = cat.filas.map(s => s.clave);
  for (const s of cat.filas) {
    if (!/^S-[A-Z]{3}\d{2}$/.test(s.clave)) throw new Error('clave inválida ' + s.clave);
    if (!['fijo', 'semanal'].includes(s.tipo_cobro)) throw new Error(s.clave + ' con tipo_cobro inválido');
    const precio = Number(s.precio_mxn), costo = Number(s.costo_mxn);
    if (!(precio > 0 && costo > 0 && Number(s.horas) > 0)) throw new Error(s.clave + ' sin precio, costo u horas');
    if ((precio - costo) / precio < 0.35) throw new Error(s.clave + ' tiene margen menor a 35 %');
    if (s.requiere && !s.requiere.split('|').every(r => claves.includes(r))) throw new Error(s.clave + ' depende de un servicio inexistente');
  }
  const ind = csv('datos/industrias.csv');
  ind.filas.forEach(r => { if (!['si', 'no'].includes(r.regulada)) throw new Error('industria ' + r.clave + ' sin marca de regulación'); });
  csv('datos/capacidad_equipo.csv').filas.forEach(r => {
    if (!/^\d{4}-\d{2}$/.test(r.mes)) throw new Error('mes inválido ' + r.mes);
    if (!(Number(r.horas_libres_semana) >= 0)) throw new Error('horas inválidas en ' + r.mes);
  });
});
paso('Nodos Code generados (dist/ = src/ + lib/)', () => execFileSync('node', [path.join(raiz, 'scripts/build_code_nodes.js'), '--check'], { stdio: 'pipe' }));
paso('Pruebas de reglas deterministas', () => execFileSync('node', [path.join(raiz, 'tests/test_reglas.js')], { stdio: 'pipe' }));
paso('Skills cargables y loop de seguridad y costo', () => execFileSync('node', [path.join(raiz, 'tests/test_skills.js')], { stdio: 'pipe' }));
paso('Exportaciones de n8n sin secretos y armables', () => execFileSync('node', [path.join(raiz, 'scripts/armar_import.js'), '--check'], { stdio: 'pipe' }));
paso('Prueba de concatenación (mismo caso_id de punta a punta)', () => execFileSync('node', [path.join(raiz, 'tests/simular_flujo.js')], { stdio: 'pipe' }));
paso('Datos públicos sanitizados', () => {
  const f = 'web/data/publico.json';
  if (!fs.existsSync(path.join(raiz, f))) throw new Error('falta ' + f);
  const d = JSON.parse(leer(f));
  if (!d.generado || isNaN(Date.parse(d.generado))) throw new Error('fecha de generación inválida');
  if (!String(d.rotulo || '').includes('FICTICIOS')) throw new Error('falta el rótulo de datos ficticios');
  const permitidas = ['caso_id', 'canal', 'estado', 'decision', 'tipo_campana', 'duracion_semanas', 'ts_solicitud', 'ts_propuesta_lista', 'version'];
  for (const c of d.casos || []) {
    const extra = Object.keys(c).filter(k => !permitidas.includes(k));
    if (extra.length) throw new Error('columna no permitida en datos públicos: ' + extra.join(', '));
    if (!/^DBS-\d{8}-[A-Z0-9]{4}$/.test(c.caso_id)) throw new Error('caso_id inválido ' + c.caso_id);
  }
  const prohibidas = ['margen', 'costo_total', 'costo_mxn', 'usuario', 'chat_id', 'texto_solicitud', 'propuesta_json', 'telegram_user_id', 'seudonimo', 'texto'];
  const revisar = (o, ruta) => { if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) { if (prohibidas.includes(kk)) throw new Error('campo privado en datos públicos: ' + ruta + '.' + kk); revisar(v, ruta + '.' + kk); } };
  for (const f of d.fichas || []) {
    if (!/^DBS-\d{8}-[A-Z0-9]{4}$/.test(f.caso_id)) throw new Error('ficha con caso_id inválido ' + f.caso_id);
    revisar(f, f.caso_id);
  }
  const k = d.kpi || {};
  if (k.k2_tasa_aprobacion !== null && (k.k2_tasa_aprobacion < 0 || k.k2_tasa_aprobacion > 1)) throw new Error('K2 fuera de 0-1');
});
paso('Archivos obligatorios', () => {
  ['README.md', '.env.example', 'web/index.html', 'agentes/contrato.schema.json', 'agentes/orquestador.md', 'agentes/a1_recepcion.md', 'agentes/a2_catalogo.md', 'agentes/a3_propuesta.md', 'agentes/a4_revisor.md', 'datos/politicas.md', 'skills/cotizar-campana-dbs/SKILL.md', 'skills/revisar-propuesta-dbs/SKILL.md', 'loops/calidad_negocio.md', 'loops/seguridad_costo.md']
    .forEach(f => { if (!fs.existsSync(path.join(raiz, f))) throw new Error('falta ' + f); });
});
paso('Sin secretos en el repositorio', () => execFileSync('node', [path.join(raiz, 'scripts/revisar_secretos.js')], { stdio: 'pipe' }));
paso('Sitio sin API keys en el HTML', () => {
  const h = leer('web/index.html');
  if (/xi-api-key|sk-ant-|sk_[a-f0-9]{20}/i.test(h)) throw new Error('el HTML contiene una credencial');
});

if (errores.length) { console.error('\n' + errores.length + ' control(es) fallaron. No se publica.'); process.exit(1); }
console.log('\nTodos los controles pasaron.');
