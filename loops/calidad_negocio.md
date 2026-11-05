# Loop 1 · Calidad de negocio (A3 ↔ A4)

> Versión 1.0 · 2026-11-04 · Design & Brand Studio (FICTICIO). Implementación: nodos O05, O06 y O07 del workflow «DBS · Procesar caso (orquestador)». Usa los skills `cotizar-campana-dbs` y `revisar-propuesta-dbs`.

## Secuencia (guía, p. 7)
**Generar → medir → diagnosticar → corregir → validar → liberar solo si supera los criterios**

| Paso | Qué ocurre | Nodo / función |
| --- | --- | --- |
| Generar | A3 redacta la versión *n* con el skill `cotizar-campana-dbs`. Las cifras vienen de `calcularPropuesta` | O05 → W3 (L01 carga el skill) |
| Medir | Revisión determinista: total, margen R6, capacidad R3, industria y canales R7, rótulo y promesas | O06 · `revisarPropuesta` |
| Diagnosticar | A4 aplica el skill `revisar-propuesta-dbs` y entrega su veredicto y correcciones concretas | O06 → W3 |
| Corregir | Si hay devolución, `ctx.correcciones` pasa a A3 como `correcciones_previas` y se abre la versión *n+1* | O07 → O05 |
| Validar | Se libera solo si la revisión determinista **y** A4 aprueban | O07 |
| Liberar | El caso pasa a `pendiente_aprobacion` con `version = n`. La coordinadora aprueba la versión vigente | O08 |

## Parámetros
| Elemento | Valor | Justificación |
| --- | --- | --- |
| Entrada | `ctx` del caso: requerimiento validado, datos de A2 y cálculo | Contrato `design-brand-studio/contrato/v1` |
| Responsable | Orquestador (determinista). A4 puede impedir la liberación | Ningún mensaje del usuario cambia O07 |
| Criterios de salida | Total al centavo, margen ≥ 35 %, rótulo RESULTADO SIMULADO, sin promesas, pauta separada, servicios completos | `politicas.md` y criterios de los skills |
| Máximo de iteraciones | 3 (`CONFIG.limite_iteraciones_loop`, con tope fijo de 3 en O07) | Es el punto de partida de la guía. Una corrección suele bastar en 1 vuelta y cada vuelta cuesta 2 llamadas (A3 + A4) |
| Tiempo límite | 300 s por caso (`CONFIG.limite_segundos_caso`), verificado antes de cada llamada | Lo controla el loop 2 |
| Presupuesto | 25,000 tokens y 0.05 USD por caso | Lo controla el loop 2 |
| Acción de retorno | Correcciones concretas de vuelta a A3 en la versión siguiente | O07 → O05 |
| Salidas sin reintento | R3, R6 o R7 → `revision_humana`; un bloqueo de guardrail → `detenido_limite` | Otra redacción no arregla capacidad, margen ni industria |
| Estado al agotar | `detenido_limite`. Se avisa al solicitante y **no** se presenta como éxito | `cerrar()` en lib/orquestador.js |

## Dónde se ve en la traza (tabla `trazas`)
- `tipo = llamada_agente`, `agente = a3_propuesta | a4_revisor`, `iteracion = n`. En `detalle.skill` aparece el skill aplicado (`nombre@versión#huella`).
- `detalle.falla_inyectada = true` solo en la prueba controlada P11.
- `tipo = cierre` cuando el loop termina sin liberar.

## Evidencia V1 → V2 (prueba P11)
- **Offline:** la ejecuta GitHub Actions en `tests/simular_flujo.js`. V1 tiene el total equivocado y se devuelve. V2 corrige y se aprueba con el mismo `caso_id`. El botón queda como `apr:<caso_id>:v2`.
- **En n8n (2026-11-05):** caso **DBS-20261105-QWWR**, con `inyectar_falla_v1: true` solo durante la prueba.
  - V1: A3 redactó y la falla inyectada quitó el rótulo y agregó una promesa. La revisión determinista dio 2 correcciones y A4 (skill `revisar-propuesta-dbs`) dio 2 más. Veredicto: devuelto.
  - V2: A3 corrigió con `correcciones_previas` y A4 aprobó. Pasó a aprobación como `v2`.
  - Costo adicional de la corrección: 2 llamadas (A3 i2 + A4 i2) con 4,292 + 1,605 y 3,613 + 399 tokens. Detalle en `evidencias/skills_loops_n8n.md`.
- **Hallazgo previo (caso DBS-20261105-HUPJ):** la V2 se cortó por `max_tokens`, porque el razonamiento interno del modelo cuenta como salida. El loop no presentó el caso como éxito: cerró en `detenido_limite`. Corrección: A3 de 1,400 a 3,000 y A4 de 900 a 2,000.
- **Reutilización:** caso **DBS-20261105-PBT2** (temporada, moda, 4 semanas). Usó los mismos skills (misma huella), se aprobó en V1 y dio un total de 85,840.00 MXN, que coincide con el cálculo.

## Autoevaluación (0–4 por aspecto; se exige ≥ 16/20 y ningún aspecto < 3)
| Aspecto | Puntaje | Motivo |
| --- | --- | --- |
| Claridad o propósito | 4 | Secuencia y criterio de liberación explícitos |
| Contexto o secuencia | 4 | Cada paso tiene su nodo y su función |
| Evidencia | 4 | V1→V2 real con el mismo `caso_id`, diagnóstico, costo adicional y un segundo caso |
| Control o retorno | 4 | Máximo 3, tiempo, presupuesto, salidas sin reintento y estado al agotar |
| Utilidad | 4 | Evita enviar cotizaciones con cifras o promesas incorrectas |
| **Total** | **20/20** | Listo |
