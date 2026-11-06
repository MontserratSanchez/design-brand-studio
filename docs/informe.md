---
title: "Design & Brand Studio · Propuestas de campaña con un orquestador y cuatro agentes de IA"
subtitle: "Informe técnico y empresarial · Proyecto final individual de AI Tools"
author: "Montserrat Sánchez"
date: "5 de noviembre de 2026"
lang: es
---

> Consultora, empresas cliente, catálogo, honorarios y decisiones son **ficticios**. Toda operación de negocio es **SIMULADA**; las integraciones (Telegram, n8n, Claude, ElevenLabs, GitHub) son reales.
> Convención del informe: **dato** = medido en los registros del sistema; **inferencia** = conclusión razonada a partir de los datos; **supuesto** = valor declarado para diseñar o proyectar.

# 1. Problema, usuario y decisión

Design & Brand Studio es una consultora de marketing ficticia. Las empresas la contratan para diseñar y ejecutar campañas: estrategia, concepto creativo, contenido, video, pauta digital, landing pages, email y reportes.

Cada brief que llega exige cruzar varias cosas:
- Servicios del catálogo, con cobro fijo o semanal y dependencias (la pauta exige un reporte semanal).
- Semanas de campaña y canales compatibles.
- Capacidad libre del equipo en el mes de inicio.
- Industria, porque las reguladas requieren revisión humana.
- Reglas comerciales: descuento, margen mínimo, IVA y vigencia.

**Supuesto:** a mano, este trabajo es lento y propenso a errores de cálculo y a comprometer horas que el equipo no tiene. No se midió una línea base manual, así que el informe no afirma ahorro de tiempo frente al proceso anterior.

- **Usuario que decide:** la coordinadora de cuentas.
- **Decisión:** ¿se envía esta propuesta al cliente y se reservan las horas del equipo, se pide un ajuste o se rechaza?
- **Proceso delimitado:** empieza cuando llega un brief por Telegram (`/nuevo`) o por voz y recibe un folio `caso_id`. Termina cuando la propuesta revisada queda **aprobada, rechazada o vencida**, registrada y notificada.
- **Fuera de alcance:** contrato, cobro, compra de pauta y ejecución de la campaña.

**Indicadores del proceso** (fórmula, unidad, fuente):

| KPI | Fórmula | Unidad | Fuente | Valor medido (05-nov-2026) |
| --- | --- | --- | --- | --- |
| K1 · Tiempo a propuesta lista | Mediana de (ts_propuesta_lista − ts_solicitud) | min | tabla `casos` | **0.3 min**, n = 8 |
| K2 · Tasa de aprobación humana | aprobadas / (aprobadas + rechazadas + vencidas) | % | tabla `casos` | **77.8 %**, n = 9 (7 aprobadas, 1 rechazada, 1 vencida) |
| K3 · Costo variable por caso completado | Σ costo de LLM de casos completados / n | USD/caso | `costos.csv` | **0.002427 USD**, n = 8 |

**Limitación de los KPI:**
- Todos los casos son de prueba y n es pequeño. Por eso no se fijan metas, y K2 refleja las decisiones de la prueba, no un comportamiento comercial.
- Hay una ficha pública por propuesta con otros tres indicadores del proyecto: total, carga del equipo frente a la capacidad, y costo de IA del caso.

# 2. Arquitectura

```
Telegram ─┐                                                                         ┌─ aprobación (botones) ─ registro y aviso
          ├─ n8n W1 (entrada única, dedup, autorización, caso_id) ─ W2 orquestador ─┤
Voz ──────┘  W4 (herramienta autenticada)        W3 × A1 · A2 · A3 ⇄ A4 (loop) ─────┘   └─ W5 exportación sanitizada ─ GitHub ─ Actions ─ Pages
```

| Componente | Dónde corre | Función verificable |
| --- | --- | --- |
| W1 · Entrada Telegram | n8n Cloud | Único receptor del bot: normaliza, **deduplica** por `event_key`, autoriza por rol, enruta `/nuevo`, `/estado` y los botones, y registra decisiones |
| W2 · Orquestador | n8n Cloud (nodos Code O01–O09) | Plan, presupuesto, orden A1→A2→A3→A4, loop de calidad (máx. 3), cierres con estado real, solicitud de aprobación, disparo del panel |
| W3 · Llamar agente | n8n Cloud | Carga las instrucciones y el **skill**; evalúa 7 controles antes de cada llamada; llama a Claude Haiku 5.5; registra costo y traza |
| W4 · Voz | n8n Cloud (webhook con encabezado secreto) | Herramienta `gestionar_caso` de ElevenLabs: valida, consulta o crea casos en las mismas tablas |
| W5 · Exportación y tareas | n8n Cloud | Vence aprobaciones cada hora; exporta datos sanitizados a GitHub cada día y tras cada propuesta o decisión |
| GitHub Actions | GitHub | 10 controles previos (datos, reglas, skills, concatenación, privacidad, secretos); solo publica si pasan |
| GitHub Pages | GitHub | Panel con 3 KPI, historial filtrable, ficha por propuesta (`?caso=FOLIO`) y widget de voz con consentimiento |

**Concatenación (dato):** el mismo `caso_id` aparece en Telegram, en `casos`, en cada fila de `trazas` y `costos`, en el botón de aprobación (`apr:FOLIO:vN`), en la respuesta por voz y en la ficha publicada. Ejemplo: **DBS-20261105-ZYFZ** recorrió todo el flujo y se puede rastrear en `evidencias/trazas_sanitizadas.csv`.

# 3. Ecosistema agéntico

| Rol | Recibe | Aporta (lo que los demás no hacen) | Entrega |
| --- | --- | --- | --- |
| Orquestador (determinista) | Brief validado por W1/W4 | Decide orden, presupuesto, reintentos y cierre; nunca presenta como exitoso un caso incompleto | Plan, estados y respuesta final con `caso_id` |
| A1 · Recepción | Texto libre del cliente | Lo convierte en requerimiento estructurado o pide datos faltantes | JSON de requerimiento o lista de faltantes |
| A2 · Catálogo y capacidad | Requerimiento + tablas autorizadas | Verifica cobertura, dependencias (R4), capacidad (R3), industria y canales (R7) con referencia a la fila de la fuente | Datos o "insuficiente" |
| A3 · Propuesta (skill `cotizar-campana-dbs`) | Cálculo determinista (R4, R5, R8) | Redacta la propuesta con las cifras exactas y sin prometer resultados | Texto versionado con supuestos |
| A4 · Revisor (skill `revisar-propuesta-dbs`) | Propuesta + revisión determinista | Revisa redacción, promesas, elementos fuera de catálogo y pauta separada; **puede bloquear** | Aprobado o devuelto con correcciones |

**Decisión clave:**
- **Los cálculos no los hace el modelo.** `calcularPropuesta` (honorarios, descuento, IVA, margen, horas) es una función determinista con 25 pruebas unitarias.
- `revisarPropuesta` recalcula y compara antes de que A4 opine. Se libera solo si la revisión determinista **y** A4 aprueban.

**Contrato común** (`agentes/contrato.schema.json`):
- Entrada: `caso_id`, canal, usuario seudónimo, objetivo, datos, modo SIMULADO y límite de costo.
- Salida: `caso_id`, agente, estado, resultado, fuentes, advertencias, duración y referencia al consumo.
- No se guarda razonamiento interno, solo decisiones y resultados.

# 4. Skills y loops

- **Skills:** las dos carpetas `skills/*/SKILL.md` tienen nombre, versión, activador, objetivo, entradas, fuentes, pasos, herramientas, límites, salidas, errores, criterios de aceptación y ejemplos válido e inválido.
  - Como n8n no carga skills de forma nativa, se construyó un **adaptador**: el nodo «Leer skill» descarga el archivo y `parsearSkill` valida nombre, agente autorizado, versión y secciones.
  - Si el skill falta o está alterado, el control `skill_cargado` **impide** la llamada.
  - La traza guarda `nombre@versión#huella`. **Dato:** la huella en n8n (`aeb25fef`, `d2211991`) es la misma que en la integración continua, así que n8n aplicó exactamente el archivo versionado.
- **Loop de calidad (A3 ⇄ A4):** generar → medir (revisión determinista) → diagnosticar (A4) → corregir (A3 con `correcciones_previas`) → validar.
  - Máximo 3 iteraciones. Las fallas de capacidad, margen o industria no se reintentan.
  - **Dato (QWWR):** la V1, con falla inyectada y marcada en la traza, fue devuelta con 4 correcciones. La V2 se aprobó con el mismo folio. La corrección costó 2 llamadas: 7,905 tokens de entrada y 2,004 de salida.
  - **Reutilización:** PBT2, ZYFZ y T6RE usaron los mismos skills.
- **Loop de seguridad y costo:** en cada llamada se evalúan agente permitido, folio válido, instrucciones y skill cargados, presupuesto de tokens, costo medido más reserva, y tiempo del caso. Después se registra el consumo. Si algo falla, se detiene sin reintento.
  - **Dato (G87G):** con un límite de prueba de 3,000 tokens, A2 se bloqueó antes de llamar al modelo.

**Hallazgo que cambió el diseño (dato):**
- En el caso HUPJ, la V2 de A3 se cortó por `max_tokens`: de 1,400 tokens de salida, 1,064 fueron razonamiento interno del modelo, que se cobra y cuenta como salida.
- El loop no presentó el caso como éxito: cerró en `detenido_limite`.
- Se subió `max_tokens` (A3 3,000, A4 2,000) y el límite por caso a 40,000.
- Con el ajuste, la V2 de QWWR usó 1,605 tokens de salida y fue aprobada.

# 5. Automatización con n8n y Telegram

- **Entrada única:** un solo Telegram Trigger para el bot.
- **Comandos:**
  - `/nuevo` crea el caso y devuelve el folio.
  - `/estado FOLIO` lee el registro persistente.
  - Los botones Aprobar y Rechazar están ligados a **caso, versión y usuario autorizado**.
- **Bifurcaciones de negocio observables:** datos incompletos (`requiere_datos`), fuera de política (`rechazado` o `revision_humana`), revisión humana, error de API (`error`) y límite (`detenido_limite`).
- **Persistencia y deduplicación:** tablas privadas de n8n más la tabla `eventos` con `event_key`. Repetir el mismo update no produce una segunda operación (P10).
- **Aprobación segura (P04):** una versión obsoleta no se registra; el rechazo detiene la acción; el vencimiento se aplica **cada hora** con una tarea programada (rama «Cada hora» en W5).
- **Exportación:** `n8n/export/` contiene los 5 workflows sin secretos, datos fijados ni IDs de chat. `scripts/armar_import.js` les vuelve a insertar el código de `n8n/code/dist/` para importarlos (instrucciones en el README).

**Falla real documentada (P01b):** Telegram rechazó un mensaje de aprobación porque el guion bajo de `generacion_leads` rompía el formato Markdown. El caso QN6A quedó sin botones. Se agregó el escape a los dos nodos que faltaban y se repitió con éxito (ZYFZ). QN6A se rechazó para no dejarlo abierto.

# 6. Publicación: GitHub Actions y Pages

- **Repositorio:** README, código, datos ficticios, configuraciones exportables y evidencias.
- **Workflow `validar-y-publicar`:** corre ante cambios en `main` o de forma manual.
- **Controles de `validar.js`:**
  - Estructura de datos.
  - `dist/` sincronizado con el código fuente.
  - 25 pruebas de reglas y 17 de skills y loop.
  - Simulación de punta a punta.
  - Datos públicos sin campos privados.
  - Exportaciones de n8n armables.
  - Archivos obligatorios, sin secretos y sin API keys en el HTML.
- **Bloqueo y recuperación (P12, dato):** la ejecución 41974531212 falló porque una prueba suponía el límite anterior de 25,000 tokens, y el job `publicar` se saltó. Tras corregir la prueba, la 41974706357 publicó.
- **Actualización de datos:**
  - Mecanismo: W5 lee las tablas privadas, aplica `exportarSanitizado` y hace commit de `web/data/publico.json`. Ese commit dispara Actions y Pages.
  - Frecuencia: tras cada propuesta, tras cada decisión y diaria a las 20:00.
  - Retraso esperado: de 1 a 3 minutos.

# 7. Agente de voz (ElevenLabs)

- **Configuración** (detalle en `docs/elevenlabs.md`): español, voz Siren, saludo que se identifica como IA, consentimiento antes de usar herramientas, alcance limitado a datos ficticios y derivación a Telegram o a la coordinadora.
- **Herramienta `gestionar_caso`:** POST a W4 con un encabezado secreto guardado en ElevenLabs y en n8n.
- **Allowlist:** `montserratsanchez.github.io`; límite de 30 llamadas al día.
- **Carga del widget:** solo después de marcar el consentimiento.
- **Protecciones de la plataforma:** «Prompt Injection» y «Enfoque» activadas en ElevenLabs (05-nov), además del prompt y de la validación V01 del servidor.

**Pruebas:**
- **Consulta real desde Pages (dato, 04-nov):** el widget leyó el estado real de GRPF.
- **Creación por la herramienta (dato, 05-nov):** T6RE pasó por los cuatro agentes y fue aprobado.
- **Falta de información:** la herramienta responde que el folio no tiene el formato correcto.
- **Servicio caído:** aparece un aviso con la alternativa de Telegram.
- **Creación hablada (06-nov):** con una voz sintética inyectada como micrófono, el agente creó 6S76. El reconocimiento oyó «mil pesos» y la regla R2 rechazó el caso (pauta mínima de 5,000 MXN por semana).
- **Micrófono denegado (simulado en el navegador):** el widget muestra «Permission denied» y deja el chat de texto; la página ofrece Telegram.

# 8. Interfaz y visualización (VizData)

- **Encabezado:** empresa, propósito, fuente, fecha de actualización (con aviso si pasan más de 36 h) y rótulo «DATOS FICTICIOS · RESULTADO SIMULADO».
- **Tres KPI del proceso:** cada uno con su definición y n. Muestran «Sin datos» si no hay medición y explican cuándo quedan casos fuera del promedio.
- **Historial sanitizado:** filtros de estado y canal y un botón para restablecerlos. Cada folio con propuesta abre su ficha.
- **Ficha por propuesta** (`?caso=FOLIO`):
  - P1, total y desglose. La pauta va aparte porque la paga el cliente.
  - P2, carga semanal frente a la capacidad libre del mes, con una barra que acompaña a la cifra; el color no es la única señal.
  - P3, costo de IA del caso.
  - Además, una tabla de servicios.
- **Accesibilidad y estados:** foco visible, etiquetas, sin desplazamiento horizontal a 390 y 1366 px. Hay mensaje para cada caso: carga, sin datos, folio inválido, caso sin propuesta, error de carga y datos desactualizados.

# 9. Guardrails

| Control | Implementación | Prueba (dato) |
| --- | --- | --- |
| Acceso y alcance | Tabla `usuarios` por rol; la voz pública solo maneja datos ficticios | P07: ID no registrado → `no_autorizado` |
| Datos y privacidad | Validación de esquema y longitud; seudónimos; exportación con lista blanca de campos y bloqueo en CI | `validar.js` rechaza campos privados |
| Inyección | Patrones en T02 y V01; los mensajes llegan al modelo como dato no confiable | P06: bloqueado sin llamar al modelo |
| Fuentes y veracidad | Solo tablas autorizadas; cálculos deterministas; A4 recalcula | P05: se piden los datos faltantes en lugar de inventarlos |
| Herramientas y acciones | Lista cerrada de agentes y URL fija; sin ejecución de código del usuario | Control `agente_permitido` en cada llamada |
| Aprobación humana | Botón ligado a caso, versión, usuario y vencimiento | P04a–d |
| Presupuesto y límites | Tokens, costo medido + reserva y tiempo, antes de cada llamada | P09 |
| Fallas y duplicados | Reintento acotado (2), error controlado, deduplicación persistente | P08 y P10 |
| Trazabilidad | `trazas` con caso, estado, decisión, versión, responsable y consumo; evidencia pública sanitizada | P14 |

# 10. Tokenización y costos

- **Fórmula por llamada:** Cᵢ = (T_entrada × 0.10 + T_salida × 0.50) / 1 000 000 USD.
  - Tarifa oficial de Claude Haiku 5.5 para prompts de hasta 100,000 tokens, consultada el 05-nov-2026 (`costos/tarifas.csv`).
  - Los tokens de razonamiento ya vienen en `output_tokens`, así que no se cuentan dos veces.
- **Registro:** `costos/costos.csv` tiene 64 llamadas, cada una con caso, `llamada_id`, etapa, agente, modelo, tokens, tarifa, costo, estado, reintento y origen del dato.

| Resultado (dato) | Valor |
| --- | --- |
| Caso completo sin corrección (n = 7) | 0.0021737 USD |
| Caso con 1 corrección (QWWR) | 0.0042004 USD |
| Casos fallidos, reportados aparte (n = 3 con costo) | 0.005674 USD en total |
| Pruebas de desarrollo (TEST, PRB1) | 0.0096925 USD, subtotal aparte |

**Correcciones de costo hechas durante el proyecto:**
- Las primeras filas tenían una tarifa de 1 / 5 USD sin fuente.
- El panel promediaba como costo 0 un caso completado sin registro (H8F5).
- Ambas cosas daban K3 = 0.0104 USD, valor incorrecto. Se recalcularon las filas y se corrigió la fórmula, con pruebas.

**Escenarios** (`costos/escenarios.md`, supuestos declarados):
- Con 100, 1,000 y 10,000 casos al mes, el LLM cuesta entre 0.24 y 31.53 USD.
- Lo que domina es la **voz** (0.08 USD por minuto incluido, más el LLM de voz, que no se midió) y el **límite de ejecuciones de n8n**:
  - Starter, 20 €/mes por 2,500 ejecuciones, alcanza para unos 100 casos.
  - Pro, 50 €/mes por 10,000, queda justo para unos 1,000 casos.
  - Arriba de eso hace falta Enterprise o self-hosted.

**Optimización propuesta:** no llamar a A4 cuando la revisión determinista ya devolvió la propuesta. **Dato:** en QWWR eso equivale al 16 % del costo del caso. La calidad no cambia, porque A4 está obligado a devolver lo mismo.

# 11. Pruebas y reproducibilidad

`tests/pruebas.csv` documenta P01–P14 con fecha, versión, folio, entrada, resultado esperado y obtenido, estado y evidencia. Hay 20 filas aprobadas, 1 aprobada con hallazgo (P03b), 1 falla corregida (P01b) y ninguna pendiente.

El README explica:
- Requisitos y versiones.
- Estructura del repositorio.
- Credenciales, solo por nombre.
- Importación y armado de los workflows.
- Un caso de prueba con su resultado esperado.
- Validación, parada y solución de problemas.

# 12. Limitaciones

- **Plataforma:** la prueba de n8n Cloud vence en unos días (1,000 ejecuciones y 14 días). Sin plan pagado, el bot deja de responder. Inicio y parada están documentados en el README.
- **Voz:**
  - ElevenLabs no da desglose de costo por conversación.
  - El LLM del agente de voz (DeepSeek Flash 4.1) no se midió.
  - La creación hablada se probó con voz sintética, no humana. La transcripción falló en varios turnos (por ejemplo, «diez mil» → «mil»), y no se midió con voz real.
- **Recarga de la tabla de costos:** el 04-nov se perdieron 7 filas (H8F5 ×4, TEST ×3) al recargar la tabla desde una copia anterior. Se restauraron desde las ejecuciones de W3, pero muestra que el registro privado no es inmutable; falta un control que lo impida.
- **Muestra:** son 13 folios de prueba. Las mezclas de rutas y los minutos de voz de los escenarios son supuestos.
- **Falla inyectada:** en P11 la falla fue inyectada a propósito para demostrar el mecanismo. No es un error espontáneo del modelo.

# 13. Reflexión individual

- **¿Qué decisión resuelve?** Si una propuesta se puede enviar y reservar horas, con cifras verificables y la decisión final en manos de una persona.
- **¿Qué aportó cada agente?**
  - A1 estructura el brief o detecta lo que falta.
  - A2 ancla todo a fuentes autorizadas y detecta capacidad o regulación.
  - A3 convierte cifras exactas en un texto comercial.
  - A4 evita promesas y elementos fuera de catálogo.
  - El orquestador evita que un error se vuelva una propuesta.
- **¿Qué control evitó una acción incorrecta?** La revisión determinista más A4 devolvió una V1 sin rótulo y con una promesa de ventas (QWWR). T04 rechazó una aprobación de versión obsoleta.
- **¿Qué fue lo más costoso y por qué?** En tokens, A3 en las vueltas de corrección, porque el razonamiento interno cuenta como salida. En dinero proyectado, la voz y el plan de n8n.
- **¿Qué cambia al multiplicar el volumen por diez?** El plan de plataforma y la estrategia de exportación: habría que agrupar la publicación en lugar de hacer un commit por caso. El costo del modelo sigue siendo marginal.
- **¿Qué validaría antes de usar datos reales?** Aviso de privacidad y consentimiento, retención de trazas, permisos por cliente, tarifas reales y revisión legal de las cláusulas comerciales.

# 14. Uso de IA y referencias

- **Declaración de uso de IA:**
  - Para diseñar, programar, depurar, probar y redactar se usó Claude (Anthropic), en conversaciones y como agente con acceso al navegador. Una parte se hizo de forma autónoma con mi autorización.
  - El Assistant de n8n se usó al inicio para armar workflows.
  - Revisé el código y los resultados en las ejecuciones reales y puedo explicar y modificar cada componente.
  - El costo de desarrollo con IA no tiene registro de tokens; solo las pruebas registradas (TEST y PRB1) están en `costos.csv`.
- **Referencias:** guía del estudiante, versión del 30-oct-2026, con sus fuentes oficiales:
  - Telegram Bot API.
  - n8n: Telegram Trigger, Webhook y Plans and pricing.
  - GitHub Pages, custom workflows y secrets.
  - ElevenLabs: widget, webhook tools, authentication y pricing.
  - W3C WCAG.
  - Anthropic, Claude Platform Docs: *Pricing* y *Steering thinking*, consultados el 05-nov-2026.
