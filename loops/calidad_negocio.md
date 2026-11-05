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
- **En n8n (pendiente de capturar):**
  1. Poner `inyectar_falla_v1: true` en O01 y enviar un `/nuevo`.
  2. La V1 de A3 sale sin rótulo y con una promesa. O06 la devuelve con 2 correcciones.
  3. La V2 se aprueba.
  4. Evidencias: fila de traza de V1 y V2 con el mismo `caso_id`, correcciones, costo de la segunda vuelta (2 filas extra en `costos`) y botón `v2`.
  5. Regresar `inyectar_falla_v1` a `false`.
- **Reutilización:** un segundo `/nuevo` con otro brief usa los mismos skills. Se ve en su traza la misma huella con otro `caso_id`.

## Autoevaluación (0–4 por aspecto; se exige ≥ 16/20 y ningún aspecto < 3)
| Aspecto | Puntaje | Motivo |
| --- | --- | --- |
| Claridad o propósito | 4 | Secuencia y criterio de liberación explícitos |
| Contexto o secuencia | 4 | Cada paso tiene su nodo y su función |
| Evidencia | **2** | Hay prueba offline en CI. **Falta la captura V1→V2 en n8n** |
| Control o retorno | 4 | Máximo 3, tiempo, presupuesto, salidas sin reintento y estado al agotar |
| Utilidad | 4 | Evita enviar cotizaciones con cifras o promesas incorrectas |
| **Total** | **18/20** | **No listo para entregar** hasta que Evidencia ≥ 3 (capturar P11 en n8n) |
