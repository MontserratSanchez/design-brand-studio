#!/usr/bin/env node
// Pruebas de los skills (adaptador de carga) y del loop de seguridad y costo · Design & Brand Studio.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const raiz = path.join(__dirname, '..');
const R = new Function(fs.readFileSync(path.join(raiz, 'lib/reglas.js'), 'utf8') +
  '\nreturn {parsearSkill, evaluarPaso, SKILLS_POR_AGENTE, SECCIONES_SKILL, prometeResultados};')();
const leer = f => fs.readFileSync(path.join(raiz, f), 'utf8');
let n = 0;
const t = (nombre, fn) => { fn(); n++; console.log('ok', nombre); };

for (const [agente, skill] of Object.entries(R.SKILLS_POR_AGENTE)) {
  t('Skill ' + skill + ' completo y autorizado para ' + agente, () => {
    const s = R.parsearSkill(leer('skills/' + skill + '/SKILL.md'), agente);
    assert.strictEqual(s.ok, true, s.motivo);
    assert.match(s.version, /^\d+\.\d+\.\d+$/);
    assert.ok(/\*\*Válido/.test(s.cuerpo) && /\*\*Debe (rechazarse|devolverse)/.test(s.cuerpo), 'ejemplo válido y ejemplo a rechazar');
    assert.ok(s.cuerpo.length < 6000, 'skill acotado para no inflar tokens');
  });
}
t('A1 y A2 no requieren skill', () => assert.strictEqual(R.parsearSkill('', 'a1_recepcion').requerido, false));
t('Skill ausente (404) bloquea', () => assert.strictEqual(R.parsearSkill('404: Not Found', 'a3_propuesta').ok, false));
t('Skill de otro agente bloquea', () => {
  const s = R.parsearSkill(leer('skills/revisar-propuesta-dbs/SKILL.md'), 'a3_propuesta');
  assert.strictEqual(s.ok, false);
  assert.match(s.motivo, /skill incorrecto/);
});
t('Skill sin una sección obligatoria bloquea', () => {
  const roto = leer('skills/cotizar-campana-dbs/SKILL.md').replace('## Límites', '## Otra cosa');
  const s = R.parsearSkill(roto, 'a3_propuesta');
  assert.strictEqual(s.ok, false);
  assert.match(s.motivo, /Límites/);
});
t('La huella cambia si cambia el archivo', () => {
  const a = R.parsearSkill(leer('skills/cotizar-campana-dbs/SKILL.md'), 'a3_propuesta').huella;
  const b = R.parsearSkill(leer('skills/cotizar-campana-dbs/SKILL.md') + ' ', 'a3_propuesta').huella;
  assert.notStrictEqual(a, b);
});

const base = { agente: 'a3_propuesta', caso_id: 'DBS-20261104-ABCD', instrucciones: 'x'.repeat(300), skill: { requerido: true, ok: true, nombre: 'cotizar-campana-dbs', version: '1.0.0', huella: '00000000' },
  consumo_tokens: 5000, tokens_estimados_entrada: 2000, max_tokens: 1400, limite_tokens: 25000, tarifa_entrada: 1, tarifa_salida: 5, limite_costo_usd: 0.05,
  ts_solicitud: '2026-11-04T10:00:00Z', ahora: '2026-11-04T10:01:00Z', limite_segundos: 300 };
const con = c => Object.assign({}, base, c);
t('Loop seguridad: paso dentro de límites se permite', () => assert.strictEqual(R.evaluarPaso(base).permitido, true));
t('Loop seguridad: tokens agotados detienen', () => assert.match(R.evaluarPaso(con({ consumo_tokens: 23000 })).motivo, /^presupuesto_tokens/));
t('Loop seguridad: costo medido + reserva sobre el límite detiene', () => assert.match(R.evaluarPaso(con({ consumo_usd: 0.045 })).motivo, /^presupuesto_costo/));
t('Loop seguridad: costo medido bajo + reserva cabe', () => assert.strictEqual(R.evaluarPaso(con({ consumo_usd: 0.01 })).permitido, true));
t('Loop seguridad: sin tarifa no inventa costo, aplica tokens', () => {
  const e = R.evaluarPaso(con({ tarifa_entrada: null, tarifa_salida: null }));
  assert.strictEqual(e.permitido, true);
  assert.match(e.controles.find(c => c.control === 'presupuesto_costo').detalle, /tarifa no registrada/);
});
t('Loop seguridad: tiempo agotado detiene', () => assert.match(R.evaluarPaso(con({ ahora: '2026-11-04T10:06:00Z' })).motivo, /^tiempo_caso/));
t('Loop seguridad: agente fuera de lista detiene', () => assert.match(R.evaluarPaso(con({ agente: 'a9_libre' })).motivo, /^agente_permitido/));
t('Loop seguridad: skill inválido detiene', () => assert.match(R.evaluarPaso(con({ skill: { requerido: true, ok: false, motivo: 'skill sin versión válida' } })).motivo, /^skill_cargado/));

t('Ejemplo "debe devolverse" del skill revisor sí se detecta como promesa', () => assert.strictEqual(R.prometeResultados('Total $151,000.00. Garantizamos duplicar sus ventas.'), true));
t('Ejemplo "válido" del skill revisor no es promesa', () => assert.strictEqual(R.prometeResultados('No se garantizan resultados específicos.'), false));
console.log(n + ' pruebas OK');
