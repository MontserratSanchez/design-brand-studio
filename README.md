# Design & Brand Studio · Propuestas de campaña con agentes de IA

Proyecto final individual de AI Tools. **Consultora de marketing y datos ficticios; operación en modo SIMULADO.**

Una empresa cliente envía el brief de su campaña por Telegram o por voz y recibe un folio `caso_id`. Un orquestador y cuatro agentes especialistas convierten ese brief en una propuesta de campaña revisada (servicios, honorarios, capacidad del equipo). La coordinadora de cuentas la aprueba o la rechaza en Telegram, y el resultado sanitizado se publica en GitHub Pages. El caso de negocio completo está en [`docs/caso.md`](docs/caso.md).

```
Telegram ─┐                                                                      ┌─ aprobación en Telegram ─ registro y aviso
          ├─ n8n (entrada única, caso_id, dedup) ─ orquestador ─ A1 ─ A2 ─ A3 ⇄ A4 ┤
Voz ──────┘        (herramienta autenticada)                                     └─ export sanitizado ─ GitHub Actions ─ Pages
```

## Dónde corre cada componente

| Componente | Dónde | Archivos |
| --- | --- | --- |
| Bot, flujos, orquestador y agentes | n8n Cloud (HTTPS) | `n8n/construccion_workflows.md`, `n8n/code/dist/` |
| Modelo de los agentes | API de Anthropic, llamada desde n8n | `agentes/*.md` (instrucciones cargadas en tiempo de ejecución) |
| Registro privado | Data Tables de n8n | `n8n/data_tables.md` |
| Panel público | GitHub Pages | `web/` |
| Validación y publicación | GitHub Actions | `.github/workflows/validar-y-publicar.yml`, `scripts/validar.js` |
| Agente de voz | ElevenLabs (widget en Pages + herramienta de servidor hacia n8n) | `web/index.html`, W4 |

## Estructura

```
agentes/      contrato.schema.json + instrucciones del orquestador y de A1–A4
datos/        catálogo de servicios, industrias, capacidad del equipo (ficticios) y políticas
docs/         caso de negocio, concatenación, informe, diccionario de datos, ElevenLabs, guion de defensa
lib/          reglas deterministas compartidas (R1–R9, cálculo, revisión, aprobación, exportación, adaptador de skills, loop de seguridad)
loops/        loop de calidad de negocio y loop de seguridad y costo (criterios, límites, retorno, autoevaluación)
n8n/code/     src/ (lógica de cada nodo Code) y dist/ (lo que se pega en n8n)
skills/       cotizar-campana-dbs (A3) y revisar-propuesta-dbs (A4), cargados en tiempo de ejecución por W3
n8n/export/   los 5 workflows exportados desde n8n Cloud (sin secretos ni datos fijados; el código va como marcador @@DIST@@)
costos/       tarifas con fuente, registro por llamada, escenarios 100/1,000/10,000 casos
evidencias/   índice por rúbrica, trazas sanitizadas, bloqueo de Actions (las capturas solo van en el ZIP)
scripts/      build de nodos, armado de importables, validación previa al despliegue, revisión de secretos, escenarios de costo
tests/        pruebas de reglas, de skills y simulación de punta a punta; matriz P01–P14 (pruebas.csv)
web/          index.html y data/publico.json (exportación sanitizada)
```

## Paso a paso

### Paso 1 · Probar la lógica en tu computadora (5 min)

Requiere Node.js 18 o superior (GitHub Actions usa Node 22). Python 3 solo para `scripts/costos_escenarios.py`.

```bash
node scripts/build_code_nodes.js     # genera n8n/code/dist/
node tests/test_reglas.js            # 25 pruebas de reglas
node tests/test_skills.js            # 17 pruebas de skills y del loop de seguridad y costo
node tests/simular_flujo.js          # concatenación completa con un mismo caso_id
node scripts/validar.js              # los mismos controles que corre GitHub Actions
```

### Paso 2 · Crear las cuentas y credenciales

1. **n8n Cloud**: crea la cuenta en n8n.io. La prueba gratuita dura 14 días y tiene un límite de 1,000 ejecuciones ([docs n8n](https://docs.n8n.io/deploy/use-n8n-cloud/start-your-free-trial)).
   - Programa la defensa dentro de ese plazo o contrata un plan, porque al terminar la prueba el espacio se elimina.
   - Cada mensaje de Telegram y cada llamada a un sub-workflow cuentan como ejecución.
2. **Bot de Telegram**: en @BotFather usa `/newbot` y guarda el token. Créalo como bot exclusivo del proyecto.
3. **API de Anthropic**: crea una API key en la consola y configura un límite de gasto bajo.
4. **GitHub**: crea un repositorio **público** (Pages gratuito lo requiere en cuentas personales) y sube esta carpeta.
5. **ElevenLabs**: crea la cuenta; el agente se configura en el paso 7.

### Paso 3 · Data Tables en n8n

Sigue [`n8n/data_tables.md`](n8n/data_tables.md):
- Crea las 5 tablas de operación.
- Importa los 3 CSV de `datos/`.
- Agrega tus usuarios de prueba a `usuarios`.

### Paso 4 · Workflows en n8n

**Opción rápida (importar):**
1. `node scripts/build_code_nodes.js && node scripts/armar_import.js` → genera `n8n/export/importables/*.json` con el código de cada nodo Code.
2. En n8n: *Create workflow → ⋯ → Import from file*, en este orden: W3 → W2 → W1 → W4 → W5.
3. Crea las credenciales y asígnalas por **nombre** en cada nodo marcado: «DBS Telegram» (token del bot), «Anthropic API» (encabezado `x-api-key`), «DBS Voz secreto» (encabezado `x-dbs-voz`) y «GitHub DBS» (token con permiso de contenido solo sobre este repositorio).
4. Vuelve a elegir las Data Tables (los IDs cambian en cada cuenta) y los sub-workflows en los nodos *Execute Workflow*.
5. Publica (activa) W1, W4 y W5. W2 y W3 se llaman como sub-workflows.

**Opción manual:** sigue [`n8n/construccion_workflows.md`](n8n/construccion_workflows.md) en el mismo orden.

En **O01 Plan**, cambia `url_instrucciones` por:

```
https://raw.githubusercontent.com/<tu-usuario>/<tu-repo>/main/agentes/
```

Prueba mínima:
1. Envía al bot `/nuevo campaña de lanzamiento para retail, objetivo ventas, inicia 2027-03-15, 6 semanas, estrategia, concepto creativo, contenido para redes y pauta en Meta y Google con 10000 por semana`.
2. Debes recibir el folio y, después, el mensaje de aprobación con botones.
3. El total esperado de honorarios es **$161,147.20 MXN**: $151,000 de honorarios, menos 8 % de descuento, más IVA. La pauta de $60,000 va aparte. Puedes verificarlo con `node tests/test_reglas.js`.

### Paso 5 · GitHub Pages y Actions

1. En el repositorio ve a **Settings → Pages → Source: GitHub Actions**.
2. Haz un push a `main`. El workflow *Validar y publicar* corre `scripts/validar.js` y solo publica si todo pasa.
3. Para la evidencia de bloqueo, haz un commit con un error deliberado. Por ejemplo, pon un costo que deje un margen menor a 35 % en `datos/catalogo_servicios.csv`. Guarda el enlace a la ejecución fallida, revierte el cambio y guarda el enlace a la ejecución exitosa.

### Paso 6 · Exportación automática al panel

W5 escribe `web/data/publico.json` (exportación sanitizada) **después de cada propuesta y de cada decisión** (W2 y W1 lo llaman) y una vez al día a las 20:00. Ese commit dispara Actions, que vuelve a publicar el panel.
- Retraso esperado: 1 a 3 min del despliegue.
- La misma W5 tiene la rama **«Cada hora»**, que marca como `cerrado_vencido` las aprobaciones con más de 24 h (R9).
- Para demostrarlo en vivo, ejecuta W5 manualmente.

### Paso 7 · Agente de voz de ElevenLabs

1. Crea el agente con:
   - Idioma español.
   - Un saludo que diga que es una IA y pida consentimiento.
   - Límites: solo registrar briefs de prueba o consultar folios con datos ficticios; no prometer resultados de campaña; derivar a Telegram para todo lo demás.
2. Agrega una herramienta de servidor (webhook) `gestionar_caso`:
   - Método: POST a la Production URL de W4.
   - Encabezado `x-dbs-voz` con el secreto guardado como secreto de ElevenLabs.
   - Cuerpo con `accion` (`crear` o `consultar`), `caso_id` y `descripcion`.
   - Instrucción para el agente: nunca informar un estado sin llamar antes a la herramienta.
3. El widget requiere un agente público con autenticación desactivada. En **Security → Allowlist** limita el dominio a `<tu-usuario>.github.io` ([docs ElevenLabs](https://elevenlabs.io/docs/eleven-agents/customization/widget.md)).
4. Pega el ID público del agente en `AGENTE_VOZ_ID` de `web/index.html` y haz push. El HTML no lleva ninguna API key.

## Controles activos (resumen)

| Control | Dónde |
| --- | --- |
| Usuarios autorizados por tabla; otros se rechazan | T02 + tabla `usuarios` |
| Deduplicación de eventos de Telegram | W1 «¿Evento nuevo?» + tabla `eventos` |
| Bloqueo de inyección de instrucciones | `detectarInyeccion` en T02 y V01 |
| Validación determinista de campos y políticas | O02, O04, O06 (`lib/reglas.js`) |
| Loop de seguridad y costo antes de cada llamada: tokens, costo medido, tiempo y skill válido | L01 · `evaluarPaso` → L05 → O07 |
| Skills de negocio y de calidad cargados y registrados en la traza | Leer skill + L01 · `parsearSkill` |
| Reintentos acotados y error controlado | Nodo HTTP (2 intentos, 30 s) + L02 |
| Loop de calidad con máximo 3 iteraciones | O07 |
| Aprobación ligada a usuario, folio, versión y vencimiento de 24 h | T04 + W5 |
| Sin secretos en repositorio ni en Pages | `scripts/revisar_secretos.js` en Actions |

## Iniciar y detener

- **Iniciar:** activa W1, W4 y W5 en n8n. El bot responde en cuanto W1 está publicado.
- **Detener:** desactiva W1 (Telegram deja de recibir), W4 (la voz responde con error y el panel muestra la alternativa) y W5. Las tablas no se borran.
- **Compartir el bot:** solo por el canal privado del curso. Para que alguien pueda aprobar, agrega su ID de Telegram en la tabla `usuarios` con rol `coordinadora`; cualquier otro ID recibe «no autorizado».
- **Límites de la prueba de n8n Cloud:** 14 días y 1,000 ejecuciones. Cada caso completo usa unas 12 ejecuciones.

## Solución de problemas

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| El bot no contesta | W1 inactivo o webhook de Telegram de otro workflow | Activa W1; un bot solo admite un webhook, así que no actives otro Telegram Trigger con el mismo token |
| «can't parse entities» en Telegram | Texto con `_`, `*` o `[` en modo Markdown | Ya se escapan en «Pedir aprobación» y «Avisar solicitante»; si agregas mensajes, usa el mismo escape |
| El caso cierra en `error` | API de Anthropic sin saldo o modelo inexistente | Revisa la credencial y `modelo` en O01; el costo queda `estimado_sin_respuesta` |
| El caso cierra en `detenido_limite` | Límite de tokens, costo o tiempo | Revisa la traza `guardrail_loop_seguridad`; los límites están en O01 |
| Falla «skill_cargado» | `url_instrucciones` apunta a otro repositorio o el SKILL.md no tiene las 12 secciones | Corrige la URL o corre `node tests/test_skills.js` |
| Actions falla | Algún control de `validar.js` | Abre el log del job *validar*; Pages no se publica hasta que pase |
| El panel dice «datos desactualizados» | W5 no corrió en más de 36 h | Ejecuta W5 manualmente y revisa la credencial de GitHub |

## Limitaciones

- Datos y empresa ficticios; muestra de 13 folios de prueba, sin metas.
- La voz no da desglose de costo por conversación y su LLM no se midió.
- El caso H8F5 (voz, 04-nov) no tiene filas de costo; queda fuera de K3.
- Detalle en [`docs/informe.md`](docs/informe.md) §12.

## Uso de IA

El código, las instrucciones, las pruebas y la documentación se generaron con apoyo de Claude (Anthropic), en conversación y como agente con acceso al navegador (parte del trabajo se hizo de forma autónoma con autorización de la autora). El Assistant de n8n se usó al inicio para armar workflows. Quien entrega el proyecto revisa, ejecuta y puede modificar cada componente. Ninguna credencial pasó por la IA: las escribió la autora.
