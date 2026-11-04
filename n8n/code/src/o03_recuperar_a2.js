// Nodo Code «O03 Recuperar A2» · después de «Leer catálogo», «Leer industrias» y «Leer capacidad»
// La herramienta de A2 es la consulta determinista a las tablas autorizadas; el modelo verifica cobertura.
const ctx = JSON.parse(JSON.stringify($('O02 Validar A1').first().json.ctx));
const filas = n => $(n).all().map(i => i.json);
const rec = recuperarDatos(ctx.requerimiento, filas('Leer catálogo'), filas('Leer industrias'), filas('Leer capacidad'));
ctx.recuperacion = rec;
return [{ json: armarLlamada(ctx, 'a2_catalogo', {
  objetivo: 'Verificar que los datos recuperados cubren todo lo pedido en el brief y señalar lo que no está en catálogo',
  datos: { texto_solicitud: ctx.texto_solicitud, requerimiento: ctx.requerimiento, recuperacion: rec },
}) }];
