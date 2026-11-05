# Evidencia · Skills y loops ejecutados en n8n

> 2026-11-05 · n8n Cloud (montse.app.n8n.cloud) · commit del repo: `a45985d` (skills y loops). Datos **FICTICIOS**, modo **SIMULADO**.
> Fuente: ejecuciones de n8n. Los números de ejecución se ven en *Executions* de cada workflow. Los tokens son los que reportó la API (`usage`). El costo en USD queda `null` porque O01 no tiene tarifa registrada (`origen = medido_sin_tarifa`); no se reporta cero.

## Cómo se disparó
El `/nuevo` se ejecutó en W1 «DBS · Entrada Telegram» de forma manual. Se usó como dato fijado una copia del update real de la ejecución 97, con `update_id` nuevo y otro brief. Después de la prueba se quitó el dato fijado. El resto del recorrido es el de producción: W1 → W2 → W3 (×4 agentes) → aprobación por Telegram.

## P11 · Loop de calidad V1 → V2 con el mismo caso_id
Caso **DBS-20261105-QWWR**: posicionamiento, tecnología, 5 semanas, LinkedIn y Meta. W1 ejecución 115, W2 ejecución 116. `inyectar_falla_v1: true` solo durante esta prueba.

| Ejec. W3 | Agente | Iter. | Skill aplicado | Tokens in / out (thinking) | Resultado |
| --- | --- | --- | --- | --- | --- |
| 117 | A1 | 1 | no aplica | 2,020 / 408 (240) | ok |
| 118 | A2 | 1 | no aplica | 1,876 / 423 (195) | ok |
| 119 | A3 | 1 | cotizar-campana-dbs@1.0.0#aeb25fef | 4,099 / 1,014 (616) | ok; `falla_inyectada = true` |
| 120 | A4 | 1 | revisar-propuesta-dbs@1.1.0#d2211991 | 3,619 / 648 (470) | **devuelto** |
| 121 | A3 | 2 | cotizar-campana-dbs@1.0.0#aeb25fef | 4,292 / 1,605 (1,093) | ok |
| 122 | A4 | 2 | revisar-propuesta-dbs@1.1.0#d2211991 | 3,613 / 399 (376) | **aprobado** |

- **Diagnóstico de V1** (O07, `ctx.correcciones`):
  1. «Texto: falta el rótulo RESULTADO SIMULADO» (revisión determinista).
  2. «Texto: promete resultados garantizados» (revisión determinista).
  3. A4 pidió agregar el rótulo.
  4. A4 pidió eliminar «Garantizamos duplicar sus ventas».
- **Salida:** O07 → `aprobacion` con `version = 2`. Se envió el botón `apr:DBS-20261105-QWWR:v2` a la coordinadora.
- **Costo adicional de la corrección:** llamadas 121 y 122 = 7,905 tokens de entrada y 2,004 de salida.
- **Total del caso:** 24,016 tokens.

## Hallazgo y corrección (mismo loop, caso previo)
Caso **DBS-20261105-HUPJ** (W2 ejecución 106), con la misma falla inyectada:
- En la V2 (ejecución 111), A3 se cortó con `stop_reason = max_tokens`: 1,400 de salida, de los cuales 1,064 fueron razonamiento interno, así que el JSON quedó incompleto.
- La V3 falló igual. El loop cerró el caso como `detenido_limite`, sin presentarlo como éxito.
- **Corrección** (O01, publicada en W2):
  - `max_tokens` de A3: 1,400 → 3,000.
  - `max_tokens` de A4: 900 → 2,000.
  - `limite_tokens_caso`: 25,000 → 40,000.
- Con esa corrección, QWWR pasó. La V2 de A3 usó 1,605 tokens de salida, más que el límite anterior.

## Reutilización de los skills con un segundo caso
Caso **DBS-20261105-PBT2**: temporada, moda, 4 semanas, TikTok y Meta, sin falla inyectada. W1 ejecución 123, W2 ejecución 124.

| Ejec. W3 | Agente | Skill | Tokens in / out | Resultado |
| --- | --- | --- | --- | --- |
| 125 | A1 | no aplica | 2,017 / 451 | ok |
| 126 | A2 | no aplica | 1,848 / 338 | ok |
| 127 | A3 | cotizar-campana-dbs@1.0.0#aeb25fef | 4,089 / 925 | ok |
| 128 | A4 | revisar-propuesta-dbs@1.1.0#d2211991 | 3,576 / 377 | aprobado en V1 |

El cálculo (O05) da honorarios de 74,000.00, sin descuento porque no supera 150,000, más IVA de 11,840.00, para un total de **85,840.00 MXN**. Coincide con el catálogo: 22,000 + 16,000 + 6,000 × 4 + 3,000 × 4.

## Loop de seguridad y costo
- En las 10 llamadas de QWWR y PBT2, `detalle.controles` registra todos los controles en `ok`: 6 en A1 y A2, y 7 en A3 y A4, que agregan `skill_cargado`.
- Deduplicación: W1 ejecuciones **104** y **114**. Dos updates con un `event_key` ya registrado se detuvieron en «¿Evento nuevo?» sin crear caso.
- Falta capturar un **bloqueo real** por tiempo, tokens o costo (P09).

## Límites de esta evidencia
- Los costos en USD no se calculan hasta registrar la tarifa con fuente y fecha (`costos/tarifas.csv`).
- Las aprobaciones de QWWR y PBT2 quedan pendientes de la coordinadora en Telegram.
- La falla de V1 es **inyectada** y está marcada en la traza. Demuestra el mecanismo de corrección, no un error espontáneo del modelo.
