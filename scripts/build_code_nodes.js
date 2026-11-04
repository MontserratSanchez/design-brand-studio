#!/usr/bin/env node
// Genera n8n/code/dist/*.js: cada archivo es el contenido exacto que se pega en un nodo Code de n8n.
// Inserta lib/reglas.js (todos) y lib/orquestador.js (nodos o0*) porque n8n Cloud no permite require locales.
// Uso: node scripts/build_code_nodes.js [--check]   (--check falla si dist/ no coincide con src/ + lib/)
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const src = path.join(raiz, 'n8n/code/src');
const dist = path.join(raiz, 'n8n/code/dist');
const reglas = fs.readFileSync(path.join(raiz, 'lib/reglas.js'), 'utf8');
const orq = fs.readFileSync(path.join(raiz, 'lib/orquestador.js'), 'utf8');
const check = process.argv.includes('--check');
let difiere = [];
fs.mkdirSync(dist, { recursive: true });
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.js')).sort()) {
  const cuerpo = fs.readFileSync(path.join(src, f), 'utf8');
  const partes = ['// GENERADO por scripts/build_code_nodes.js a partir de n8n/code/src/' + f + ' — no editar a mano', reglas];
  if (f.startsWith('o0')) partes.push(orq);
  partes.push(cuerpo);
  const salida = partes.join('\n');
  const destino = path.join(dist, f);
  if (check) {
    if (!fs.existsSync(destino) || fs.readFileSync(destino, 'utf8') !== salida) difiere.push(f);
  } else {
    fs.writeFileSync(destino, salida);
  }
}
if (check && difiere.length) { console.error('dist/ desactualizado: ' + difiere.join(', ') + '. Ejecuta node scripts/build_code_nodes.js'); process.exit(1); }
console.log(check ? 'dist/ coincide con src/' : 'dist/ generado');
