// Nodo Code «P02 Exportar sanitizado» · workflow «DBS · Tareas programadas» (diario)
// Entrada: «Leer casos» y «Leer costos». Salida: contenido de web/data/publico.json para el nodo GitHub.
const casos = $('Leer casos').all().map(i => i.json).filter(c => c && esCasoId(c.caso_id)); // ignora filas vacías o de prueba mal formadas
const costos = $('Leer costos').all().map(i => i.json).filter(k => k && k.caso_id);
const pub = exportarSanitizado(casos, costos, new Date().toISOString());
return [{ json: { ruta: 'web/data/publico.json', contenido: JSON.stringify(pub, null, 2), mensaje_commit: 'datos: exportación sanitizada ' + pub.generado.slice(0, 16) } }];
