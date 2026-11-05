#!/usr/bin/env node
// Arma workflows IMPORTABLES de n8n a partir de n8n/export/*.json (sin secretos, sin datos fijados)
// sustituyendo cada marcador @@DIST:xxx@@ por el código de n8n/code/dist/xxx_*.js.
// Uso: node scripts/armar_import.js [--check]  → escribe n8n/export/importables/*.json
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const dir = path.join(raiz, 'n8n/export');
const dist = path.join(raiz, 'n8n/code/dist');
const archivos = fs.readdirSync(dist);
const check = process.argv.includes('--check');
const faltan = [];
const salida = path.join(dir, 'importables');
if (!check) fs.mkdirSync(salida, { recursive: true });
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const wf = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const n of wf.nodes) {
    const m = /^@@DIST:([a-z]\d{2})@@$/.exec((n.parameters && n.parameters.jsCode) || '');
    if (!m) continue;
    const a = archivos.find(x => x.startsWith(m[1] + '_'));
    if (!a) { faltan.push(f + ' → ' + n.name); continue; }
    n.parameters.jsCode = fs.readFileSync(path.join(dist, a), 'utf8');
  }
  const txt = JSON.stringify(wf, null, 1);
  if (/sk-ant-|xi-api-key|\b\d{9,10}:[A-Za-z0-9_-]{30,}/.test(txt)) faltan.push(f + ' → posible secreto');
  if (!check) fs.writeFileSync(path.join(salida, f), txt);
}
if (faltan.length) { console.error('Problemas: ' + faltan.join('; ')); process.exit(1); }
console.log(check ? 'Exportaciones de n8n consistentes con dist/' : 'Importables generados en n8n/export/importables/');
