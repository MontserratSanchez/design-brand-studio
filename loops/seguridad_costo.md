# Loop 2 · Seguridad y costo (cada llamada a un agente)

> Versión 1.0 · 2026-11-04 · Design & Brand Studio (FICTICIO). Implementación: sub-workflow «DBS · Llamar agente» (L01 → ¿Permitido? → Claude o L05 → L02) y nodo O07. La función es `evaluarPaso` (lib/reglas.js).

## Secuencia (guía, p. 7)
**Evaluar permisos y presupuesto → ejecutar paso autorizado → registrar consumo → revisar límite y resultado → continuar o detener**

| Paso | Qué ocurre | Nodo |
| --- | --- | --- |
| Evaluar | `evaluarPaso` revisa 7 controles: agente en lista, `caso_id` válido, instrucciones cargadas, skill válido (A3/A4), tokens, costo y tiempo | L01 |
| Ejecutar | Solo si los 7 controles pasan, se llama al modelo con `max_tokens` reservado | Claude Messages API |
| Registrar | Tokens medidos y costo `Cᵢ` en `costos`. Traza con skill y controles. `ctx.consumo_usd` y `ctx.consumo_tokens` se acumulan | L02 · `absorberRespuesta` |
| Revisar | La salida debe ser JSON con campos obligatorios. Si no, `estado = error` | L02 |
| Continuar o detener | Si un control falla, L05 no llama al modelo, registra `guardrail_loop_seguridad` y O07 cierra el caso como `detenido_limite`, sin reintentar | L05 → O07 |

## Parámetros
| Elemento | Valor | Justificación |
| --- | --- | --- |
| Entrada | Ítem de `armarLlamada`: agente, contrato, consumo acumulado, límites y tarifas, más el `ctx` | Contrato v1 |
| Responsable | Servidor (n8n). El usuario no puede modificar los límites | Guardrail «Presupuesto y límites», p. 8 |
| Límite de tokens | 40,000 por caso (`limite_tokens_caso`), con reserva de `max_tokens` de salida (A3 3,000 · A4 2,000) | Medido: el caso DBS-20261105-QWWR con una corrección usó 24,016 tokens, muy cerca del límite anterior de 25,000. Ver `evidencias/skills_loops_n8n.md` |
| Límite de costo | 0.05 USD por caso (`limite_costo_usd`) = costo **medido** acumulado + costo estimado de la llamada siguiente | Supuesto inicial. Sin tarifa registrada no se inventa: aplica solo el límite de tokens |
| Tiempo límite | 300 s desde `ts_solicitud` (`limite_segundos_caso`) | La mediana medida (K1) fue 0.2 min con n = 2, así que 300 s deja margen |
| Máximo de iteraciones | 1 evaluación por llamada. Las llamadas por caso están acotadas por el loop 1 (máx. 3 × 2 + 2 = 8) | Nunca se repite indefinidamente |
| Acción de retorno | Ninguna: un bloqueo **detiene** | Reintentar no recupera presupuesto ni tiempo |
| Estado al agotar | `detenido_limite`. Se avisa al solicitante y se registra el motivo | O07 |
| Skill ausente o alterado | Bloquea igual que un presupuesto agotado (control `skill_cargado`) | Guardar el archivo sin usarlo no cuenta; usarlo mal tampoco |

## Dónde se ve en la traza
- `tipo = llamada_agente` → `detalle.controles = "agente_permitido:ok,…,tiempo_caso:ok"` y `detalle.skill`.
- `tipo = guardrail_loop_seguridad` → `detalle.motivo`, por ejemplo `presupuesto_tokens: 24900 usados + 4100 reservados de 25000`.
- `tipo = cierre`, `estado = detenido_limite`.

## Evidencia
- **Offline (CI):** `tests/test_skills.js` con 8 pruebas de controles y `tests/simular_flujo.js`. En la simulación, un presupuesto agotado y un tiempo vencido detienen sin llamar al modelo, y el caso cierra en `detenido_limite`.
- **En n8n:** las 10 llamadas de los casos QWWR y PBT2 registran todos sus controles en `ok` (6 en A1 y A2, 7 en A3 y A4, que suman `skill_cargado`) (`evidencias/skills_loops_n8n.md`). El caso HUPJ cerró como `detenido_limite` en lugar de presentarse como éxito. Dos eventos repetidos de Telegram se detuvieron en «¿Evento nuevo?» (ejecuciones 104 y 114 de W1).
- **Pendiente:** P09, un bloqueo por tiempo o por tokens capturado en n8n. En W3, volver a ejecutar con datos fijados (pin) de un caso con más de 5 minutos. L05 debe mostrar `tiempo_caso`. Otra opción: bajar temporalmente `limite_tokens_caso` a 3000 en O01.

## Autoevaluación (0–4; se exige ≥ 16/20 y ningún aspecto < 3)
| Aspecto | Puntaje | Motivo |
| --- | --- | --- |
| Claridad o propósito | 4 | 5 pasos con su nodo |
| Contexto o secuencia | 4 | Corre en cada llamada, antes y después |
| Evidencia | 3 | CI más trazas reales con controles. Falta capturar un bloqueo real (P09) para llegar a 4 |
| Control o retorno | 4 | Detiene sin reintento y con estado explícito |
| Utilidad | 3 | Los límites de 0.05 USD y 300 s son supuestos que falta calibrar con los costos reales |
| **Total** | **18/20** | Listo: ningún aspecto < 3 |
