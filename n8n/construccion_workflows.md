# Construcción de los workflows en n8n Cloud

Son cinco workflows. Los nombres de los nodos importan, porque el código los referencia con `$('Nombre')`: escríbelos **exactamente** como aparecen en **negritas**.

En cada nodo Code:
- Pega el contenido del archivo `n8n/code/dist/<archivo>.js`, no el de `src/`. Los de `dist/` ya incluyen las reglas compartidas.
- Deja el modo en **Run Once for All Items** y el lenguaje en JavaScript.

| # | Workflow | Disparo | Para qué |
| --- | --- | --- | --- |
| W1 | DBS · Entrada Telegram | Telegram Trigger | Entrada única del bot: `/nuevo`, `/estado` y botones de aprobación |
| W2 | DBS · Procesar caso (orquestador) | Sub-workflow | Orquestador + A1 → A2 → A3 → A4, loop de calidad y solicitud de aprobación |
| W3 | DBS · Llamar agente | Sub-workflow | Una sola llamada a Claude: presupuesto, reintentos, costo y traza |
| W4 | DBS · Voz | Webhook autenticado | Herramienta de servidor del agente de ElevenLabs: crear o consultar caso |
| W5 | DBS · Tareas programadas | Schedule Trigger | Vencer aprobaciones (cada hora) y exportar datos sanitizados a GitHub (diario) |

Constrúyelos en orden: **W3 → W2 → W1 → W4 → W5**. Cada uno llama al anterior.

## Credenciales (Settings → Credentials)

| Credencial | Tipo | Valor |
| --- | --- | --- |
| `DBS Telegram bot` | Telegram API | Token de @BotFather |
| `DBS Anthropic` | Header Auth | Name: `x-api-key` · Value: tu API key de Anthropic |
| `DBS Voz secreto` | Header Auth | Name: `x-dbs-voz` · Value: una cadena aleatoria larga, la misma que pondrás en ElevenLabs |
| `DBS GitHub` | GitHub API | Token de acceso con permiso de contenido solo sobre el repositorio del proyecto |

---

## W3 · DBS · Llamar agente

1. **Execute Workflow Trigger**: nodo "When Executed by Another Workflow". En *Input data mode* elige **Accept all data**. Renómbralo exactamente `Execute Workflow Trigger`.
2. **Leer instrucciones**: HTTP Request.
   - Method: GET. URL: `{{ $json.url_instrucciones }}`.
   - Options → Response → Response Format: **Text**. La salida queda en el campo `data`.
   - **Leer skill** (adaptador de skills, va justo después de «Leer instrucciones»): HTTP Request.
     - Method: GET. Response Format: **Text**.
     - URL: `{{ $('Execute Workflow Trigger').first().json.url_instrucciones.replace('agentes/a3_propuesta.md', 'skills/cotizar-campana-dbs/SKILL.md').replace('agentes/a4_revisor.md', 'skills/revisar-propuesta-dbs/SKILL.md') }}`
     - A1 y A2 no tienen skill: la URL queda igual y se relee su archivo (L01 lo ignora).
3. **L01 Preparar llamada**: Code (`l01_preparar_llamada.js`). Lee los dos textos con `$('Leer instrucciones')` y `$('Leer skill')`, valida el skill y evalúa los controles del loop de seguridad y costo.
4. **¿Permitido?**: IF con la condición `{{ $json.permitido }}` is true.
5. Rama **true** → **Claude Messages API** (HTTP Request):
   - Method: POST. URL: `https://api.anthropic.com/v1/messages`.
   - Authentication: Generic → Header Auth → `DBS Anthropic`.
   - Headers: `anthropic-version: 2023-06-01` y `content-type: application/json`.
   - Body: JSON → `{{ JSON.stringify($json.body) }}`.
   - Options → Timeout: 30000.
   - Settings: **Retry On Fail** ON (Max Tries 2, Wait 2000 ms) y **On Error: Continue**.
6. **L02 Procesar respuesta**: Code (`l02_procesar_respuesta.js`).
7. **Guardar costo**: Data Table → Row → Insert en la tabla `costos`. Mapea cada columna con `{{ $json.fila_costo.<columna> }}`.
8. **Guardar traza**: Data Table → Row → Insert en la tabla `trazas`. Mapea con `{{ $('L02 Procesar respuesta').first().json.fila_traza.<columna> }}`.
9. Después de **Guardar traza**, añade **L03 Preparar entrega**: Code (`l03_mensaje_entrega.js`). Luego **¿Hay entrega?**: IF con `{{ Boolean($json.mensaje_entrega) }}` is true.
   - true → **Informar entrega**: Telegram Send Message con la misma credencial del bot, chat `{{ $json.mensaje_entrega.chat_id }}` y texto `{{ $json.mensaje_entrega.texto }}`. Usa **Parse Mode: HTML** y escapa el texto con `{{ $json.mensaje_entrega.texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }}`. Settings → **On Error: Continue**; sin reintentos automáticos, para no duplicar avisos. Después → **L04 Devolver**.
   - false → **L04 Devolver** directamente.
   - **L04 Devolver** conserva exactamente `return [{ json: $('L02 Procesar respuesta').first().json }];`. La respuesta de Telegram nunca sustituye la respuesta del agente.
   - Los avisos se envían a la coordinadora autorizada por el contexto de W2, una vez por llamada real. Incluyen folio, iteración, salida y ruta prevista. No anuncian etapas no ejecutadas ni sustituyen los controles del orquestador o la aprobación humana.
10. Rama **false** de ¿Permitido?:
    - **L05 Bloqueo**: Code (`l05_bloqueo_presupuesto.js`).
    - Después, **Guardar traza bloqueo** (Insert en `trazas` con `{{ $json.fila_traza.<columna> }}`).
    - Al final, **L06 Devolver bloqueo**: `return [{ json: $('L05 Bloqueo').first().json }];`

El último nodo que se ejecuta es lo que recibe W2.

## W2 · DBS · Procesar caso (orquestador)

Cadena principal:

1. **Execute Workflow Trigger**: When Executed by Another Workflow, con Accept all data.
2. **Buscar coordinadora**: Data Table → Row → Get, tabla `usuarios`, condición `rol` = `coordinadora`.
3. **O01 Plan**: Code (`o01_plan.js`). Cambia `url_instrucciones` por la ruta raw de tu repositorio.
4. **Llamar A1**: Execute Workflow (Execute Sub-workflow) → W3. Activa **Wait For Sub-Workflow Completion**.
5. **O02 Validar A1**: Code.
6. **¿Sigue a A2?**: IF `{{ $json.siguiente }}` is equal to `a2`. La rama false va a **Cerrar caso** (ver más abajo).
7. **Leer catálogo**, **Leer industrias** y **Leer capacidad**: tres nodos Data Table → Row → Get (Return All) sobre `catalogo_servicios`, `industrias` y `capacidad_equipo`, en serie. En cada uno: Settings → **Execute Once** ON.
8. **O03 Recuperar A2**: Code. Luego **Llamar A2**: Execute Workflow → W3.
9. **O04 Integrar A2**: Code. Luego **¿Sigue a A3?**: IF `siguiente` = `a3`. La rama false va a **Cerrar caso**.
10. **O05 Calcular A3**: Code. Luego **Llamar A3**: Execute Workflow → W3.
11. **O06 Preparar A4**: Code. Luego **¿Llamar A4?**: IF `siguiente` = `a4`.
    - true → **Llamar A4** (Execute Workflow → W3) → **O07 Decidir**.
    - false → directo a **O07 Decidir**.
12. **O07 Decidir**: Code. Luego **Ruta decisión**: Switch sobre `{{ $json.siguiente }}`:
    - `reintentar` → conecta de vuelta a **O05 Calcular A3**. Este es el loop de calidad; O07 lo corta en la iteración 3.
    - `aprobacion` → **O08 Preparar aprobación**.
    - `cerrar` → **Cerrar caso**.

Rama de aprobación:

13. **Guardar propuesta**: Data Table → Row → Update en `casos`. Condición `caso_id` = `{{ $json.actualizacion_caso.caso_id }}`; columnas desde `{{ $json.actualizacion_caso.<columna> }}`.
14. **Traza aprobación**: Insert en `trazas` desde `{{ $('O08 Preparar aprobación').first().json.traza.<columna> }}`.
15. **Pedir aprobación**: Telegram → Send Message.
    - Chat ID: `{{ $('O08 Preparar aprobación').first().json.mensaje_coordinadora.chat_id }}`. Text: `{{ $('O08 Preparar aprobación').first().json.mensaje_coordinadora.texto }}`.
    - Reply Markup: **Inline Keyboard** con dos botones. "Aprobar" con Callback Data `{{ $('O08 Preparar aprobación').first().json.callback_aprobar }}`; "Rechazar" con `{{ ... .callback_rechazar }}`.
16. **¿Avisar solicitante?**: IF con `{{ $('O08 Preparar aprobación').first().json.aviso_solicitante.chat_id }}` is not empty → Telegram Send Message con ese chat y ese texto.

El mensaje de O08 muestra la cadena A1–A4 según `ctx.historial`, conserva los botones y enlaza al panel público: https://montserratsanchez.github.io/design-brand-studio/. El panel refleja la última exportación de W5; no se promete actualización instantánea.

Rama de cierre (entran O02, O04 y O07):

17. **Cerrar caso**: Data Table Update en `casos` desde `{{ $json.actualizacion_caso.<columna> }}`. Luego **Traza cierre**: Insert en `trazas` desde `{{ $json.traza... }}`.
    - Si cada IF dejó un item distinto, usa `$input` en lugar de referencias por nombre.
18. **¿Avisar cierre?**: IF `aviso_solicitante.chat_id` not empty → Telegram Send Message.

## W1 · DBS · Entrada Telegram

1. **Telegram Trigger**: credencial `DBS Telegram bot`, Updates: `message` y `callback_query`. Es el único receptor de este bot: no uses polling ni otro webhook.
2. **T01 Normalizar**: Code.
3. **¿Evento nuevo?**: Data Table → Row → **If Row Does Not Exist** en `eventos`, condición `event_key` = `{{ $json.event_key }}`. Si el evento ya existe, no sale nada y el flujo termina; así se deduplica.
4. **Registrar evento**: Insert en `eventos` (`event_key`, `ts` = `{{ $json.ts_evento }}`).
5. **Buscar usuario**: Data Table Get en `usuarios`, condición `telegram_user_id` = `{{ $('T01 Normalizar').first().json.telegram_user_id }}`. Settings → **Always Output Data** ON.
6. **T02 Autorizar y enrutar**: Code.
7. **Ruta**: Switch sobre `{{ $json.ruta }}` con salidas `nuevo`, `estado`, `aprobacion` y fallback.

Salida `nuevo`:
- **Crear caso**: Insert en `casos`. Columnas: `caso_id`, `canal`, `usuario`, `chat_id`, `texto_solicitud`, `ts_solicitud` desde `$json`; `estado` = `recibido`; `version` = 0.
- **Confirmar folio**: Telegram Send Message (chat `{{ $json.chat_id }}`, texto `{{ $json.mensaje }}`).
- **Procesar caso**: Execute Workflow → W2, con **Wait For Sub-Workflow Completion OFF**, para que el usuario reciba el folio de inmediato. Envía `caso_id`, `canal`, `usuario`, `texto_solicitud`, `chat_id` y `ts_solicitud` desde `$('T02 Autorizar y enrutar').first().json`.

Salida `estado`:
- **Leer caso**: Get en `casos`, con `caso_id` = `{{ $json.caso_id }}` y Always Output Data ON.
- **T03 Formatear estado**: Code.
- **Responder estado**: Telegram Send Message.

Salida `aprobacion`:
- **Buscar coordinadora**: Get en `usuarios`, con `rol` = `coordinadora`.
- **Leer caso aprobación**: Get en `casos`, con `caso_id` = `{{ $('T02 Autorizar y enrutar').first().json.caso_id }}` y Always Output Data ON.
- **T04 Validar aprobación**: Code.
- **Contestar botón**: Telegram → Callback → **Answer Query**, con Query ID `{{ $json.callback_id }}` y texto `{{ $json.aviso_coordinadora }}`.
- **¿Registrar decisión?**: IF `{{ $json.nuevo_estado }}` is not empty.
  - **Actualizar decisión**: Update en `casos` (`estado` = `nuevo_estado`, `decision`, `ts_decision`).
  - **Traza decisión**: Insert en `trazas` con `tipo` = `decision_humana`, `agente` = `{{ $json.responsable }}`, `estado` = `{{ $json.decision }}`.
  - Si `ok` es true → **Avisar solicitante**: Telegram Send Message al `chat_id_solicitante`.

Fallback (`ayuda`, `invalido`, `no_autorizado`, `bloqueado`):
- **Responder aviso**: Telegram Send Message con `{{ $json.mensaje }}`.
- Para `bloqueado`, agrega además un Insert en `trazas` con `tipo` = `guardrail_inyeccion` y `caso_id` = `SIN-CASO`.

Al terminar, **publica** el workflow (botón Activate/Publish). Solo la URL de producción recibe mensajes de forma continua.

## W4 · DBS · Voz

1. **Webhook**:
   - Method POST. Path: `dbs-voz`.
   - Authentication: **Header Auth** → `DBS Voz secreto`.
   - Respond: **Using 'Respond to Webhook' Node**.
2. **V01 Validar voz**: Code. Luego **Ruta voz**: Switch sobre `ruta`.
3. Salida `consultar`:
   - **Leer caso voz**: Get en `casos` por `caso_id`, con Always Output Data ON.
   - **V02 Responder consulta**: Code.
   - **Responder**: Respond to Webhook, JSON `{{ $json }}`.
4. Salida `crear`:
   - **Crear caso voz**: Insert en `casos` con `estado` = `recibido`.
   - **Procesar caso voz**: Execute Workflow → W2, con Wait OFF.
   - **Responder creación**: Respond to Webhook con `{"caso_id": "{{ $('V01 Validar voz').first().json.caso_id }}", "mensaje": "{{ $('V01 Validar voz').first().json.mensaje }}"}`.
5. Fallback (`invalido`, `bloqueado`): Respond to Webhook con `{"mensaje": "{{ $json.mensaje }}"}` y código 400.

Publica el workflow y copia la **Production URL**: es la que va en la herramienta de ElevenLabs.

## W5 · DBS · Tareas programadas

**Vencimientos (cada hora):**
1. Schedule Trigger cada hora.
2. **Leer pendientes**: Get en `casos` con `estado` = `pendiente_aprobacion`.
3. **P01 Detectar vencidos**: Code.
4. **Marcar vencido**: Update en `casos`.
5. **Traza vencimiento**: Insert en `trazas`.
6. IF `chat_id` not empty → Telegram aviso.

**Exportación (diaria):**
1. Schedule Trigger diario.
2. **Leer casos**: Get All en `casos`. Settings → Execute Once ON.
3. **Leer costos**: Get All en `costos`. Settings → Execute Once ON.
4. **P02 Exportar sanitizado**: Code.
5. **Publicar datos**: GitHub → File → **Edit** (o Create la primera vez).
   - Repository: el tuyo. File Path: `{{ $json.ruta }}`. Content: `{{ $json.contenido }}`. Commit message: `{{ $json.mensaje_commit }}`.
   - El commit dispara GitHub Actions, que valida y publica en Pages.

---

## Al terminar: exportar para la entrega

En cada workflow: menú **⋯ → Download**. Guarda los archivos en `n8n/export/`.

Antes de hacer commit, ejecuta:

```bash
node scripts/revisar_secretos.js n8n/export
```

Las exportaciones guardan referencias a credenciales (nombre e id), no los valores, pero revisa también datos fijados (*pinned data*) y encabezados escritos a mano ([docs n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)).
