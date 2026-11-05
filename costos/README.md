# Costos · registro, tarifas y corrección del 5 de noviembre de 2026

## Dónde está cada cosa
| Archivo o tabla | Contenido |
| --- | --- |
| `costos/tarifas.csv` | Tarifas por millón de tokens, con fuente oficial y fecha de consulta |
| Tabla privada `costos` (n8n Data Tables) | Una fila por llamada a un agente: `caso_id`, `llamada_id`, agente, modelo, tokens de entrada y salida, tarifa, `costo_usd`, estado y origen del dato |
| `web/data/publico.json` → `kpi.k3_*` | Agregado público, sin datos personales |

Fórmula por llamada (guía, p. 9): **Cᵢ = (T_entrada × P_entrada + T_salida × P_salida) / 1 000 000**. `T_salida` ya incluye los tokens de razonamiento, porque la documentación de Anthropic los cobra como salida y los suma en `usage.output_tokens`. Por eso no se suman dos veces.

## Corrección del K3 = 0.0104 USD
**Qué se encontró (datos de la tabla `costos`, 42 filas, consultada el 2026-11-05):**
1. Las primeras 22 filas (casos TEST, PRB1 y GRPF del 2026-11-04) se guardaron con una tarifa de **1 / 5 USD por millón**, sin fuente registrada. No coincide con la tarifa oficial de Haiku 5.5 (0.10 / 0.50). *Inferencia, no verificada:* 1 / 5 es la tarifa de un modelo Haiku anterior y se copió como supuesto.
2. El panel calculaba K3 = suma de los costos de los casos completados / **número de casos completados**. El caso de voz H8F5 está completado pero no tiene **ninguna** llamada en `costos`, así que contaba como costo 0:
   - GRPF: 0.020805 USD con la tarifa 1 / 5.
   - H8F5: sin registro.
   - K3 = 0.020805 / 2 = **0.0104025 ≈ 0.0104**. El valor era incorrecto por las dos causas.

**Qué se corrigió:**
| Cambio | Dónde | Verificación |
| --- | --- | --- |
| Tarifa oficial 0.10 / 0.50 con fuente y fecha | `costos/tarifas.csv`; O01 en n8n (W2, publicado) | Los casos nuevos registran `costo_usd` |
| Recálculo de las 42 filas existentes con la tarifa oficial; `origen = medido_recalculado_tarifa_oficial` | Tabla `costos` | 42/42 actualizadas; cada `costo_usd` coincide con la fórmula. Respaldo previo en el navegador del editor |
| K3 solo promedia casos completados **con** llamadas registradas; informa cuántos quedan fuera (`k3_casos_sin_registro`) y reporta aparte el costo de los casos fallidos (`k3_fallidos_usd`) | `exportarSanitizado` en `lib/reglas.js` (nodo P02 de W5) | 2 pruebas nuevas en `tests/test_reglas.js` |

**Costos por caso con la tarifa oficial (tabla `costos`, 2026-11-05):**
| Caso | Estado | Llamadas | Costo USD |
| --- | --- | --- | --- |
| DBS-20261104-GRPF | completado, aprobado | 4 | 0.0020805 |
| DBS-20261105-VMC2 | aprobado en Telegram | 4 | 0.0018450 |
| DBS-20261105-QWWR | pendiente de aprobación, con 1 corrección (P11) | 6 | 0.0042004 |
| DBS-20261105-PBT2 | pendiente de aprobación | 4 | 0.0021985 |
| DBS-20261105-HUPJ | detenido_limite (fallido) | 6 | 0.0046049 |
| DBS-20261104-PRB1 y TEST | pruebas de construcción | 18 | 0.0096925 |

## Investigación de H8F5 (2026-11-05)
**Qué se encontró (dato):**
- H8F5 **sí** pasó por los cuatro agentes: ejecuciones 84–87 de W3 (04-nov, 21:24 UTC). En cada una, el nodo «Guardar costo» corrió e insertó su fila (IDs 26–29 de la tabla `costos`).
- La suma de tokens de esas 4 llamadas (8,133 de entrada + 2,281 de salida = 10,414) coincide con `consumo_tokens` del caso en la tabla `casos`.
- El 04-nov a las 21:53:57 UTC, 29 minutos después, **todas** las filas con ID 1–32 desaparecieron de la tabla y se insertaron 22 filas nuevas en un solo lote (IDs 33–54, mismo `createdAt`). Ese lote volvió a cargar TEST, PRB1 y GRPF, pero no las 4 de H8F5 ni 3 de TEST.
- *Inferencia:* fue una recarga de la tabla desde una copia anterior a H8F5. El registro de n8n no muestra quién la hizo, así que no se atribuye.
- Las 3 filas de TEST que faltaban son llamadas fallidas (`estado = error`, sin respuesta del proveedor).

**Qué se corrigió:**
| Cambio | Dónde | Verificación |
| --- | --- | --- |
| Se restauraron las 7 filas desde la salida del nodo «Guardar costo» de las ejecuciones 33–35 y 84–87 de W3. H8F5 con la tarifa oficial (`origen = medido_restaurado_ejecucion`); TEST sin costo (`origen = estimado_sin_respuesta_restaurado`) | Tabla `costos` (IDs 90–96) y `costos/costos.csv` | Ahora **todas** las llamadas trazadas tienen fila de costo |
| H8F5 = 0.0019538 USD (4 llamadas) | Ficha pública de H8F5 | Igual a la suma manual de las 4 filas |
| K3 = 0.002427 USD, n = 8, `k3_casos_sin_registro = 0` | Panel (W5, ejecución 191) | (0.002495 × 7 + 0.0019538) / 8 = 0.0024274 |

**Control para que no se repita (propuesta, no aplicada):** no recargar `costos` desde un CSV. Si hace falta corregir, usar `updateRow` sobre filas existentes y conciliar antes y después contra `trazas` (P14).

## Pendiente
- Los costos de **ElevenLabs** y de las plataformas (n8n, GitHub) van en filas aparte, según la guía (p. 10).
- Las filas de PRB1 y TEST son pruebas de construcción. Cuentan como costo de **desarrollo**, no de operación.
