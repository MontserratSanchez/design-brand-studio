#!/usr/bin/env node
// Busca credenciales o datos personales antes de publicar o hacer commit.
// Uso: node scripts/revisar_secretos.js [ruta ...]  (por defecto: todo el repositorio menos .git y node_modules)
// Sale con código 1 si encuentra algo.
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');
const rutas = process.argv.slice(2).length ? process.argv.slice(2) : [raiz];
const PATRONES = [
  ['API key de Anthropic', /sk-ant-[A-Za-z0-9_-]{10,}/],
  ['API key genérica', /\bsk-[A-Za-z0-9]{20,}/],
  ['Token de bot de Telegram', /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/],
  ['Token de GitHub', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['Clave de ElevenLabs', /\bsk_[a-f0-9]{40,}\b/],
  ['Encabezado con secreto', /"(x-api-key|x-dbs-voz|authorization)"\s*:\s*"(?!\{\{)[^"]{8,}"/i],
  ['Correo electrónico', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
];
const IGNORAR = new Set(['.git', 'node_modules', 'revisar_secretos.js']);
const PERMITIDOS = [/noreply@anthropic\.com/, /@example\.com/];
const hallazgos = [];
function revisar(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) { for (const f of fs.readdirSync(p)) if (!IGNORAR.has(f)) revisar(path.join(p, f)); return; }
  if (IGNORAR.has(path.basename(p)) || st.size > 5e6 || /\.(png|jpg|jpeg|gif|pdf|zip|ico|woff2?)$/i.test(p)) return;
  const lineas = fs.readFileSync(p, 'utf8').split('\n');
  lineas.forEach((l, i) => {
    for (const [nombre, re] of PATRONES) {
      const m = l.match(re);
      if (m && !PERMITIDOS.some(ok => ok.test(m[0]))) hallazgos.push(path.relative(raiz, p) + ':' + (i + 1) + ' · ' + nombre);
    }
  });
}
rutas.forEach(r => fs.existsSync(r) && revisar(path.resolve(r)));
if (hallazgos.length) { console.error('POSIBLES SECRETOS O DATOS PERSONALES:\n' + hallazgos.join('\n')); process.exit(1); }
console.log('Sin secretos ni correos detectados.');
