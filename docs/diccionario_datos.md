# Diccionario de datos

> Todas las tablas viven en **n8n Data Tables**, que son privadas. Lo público es `web/data/publico.json`, generado por `exportarSanitizado`. Los datos son ficticios.

## Tablas privadas

### `casos` (una fila por folio)
| Campo | Tipo | Descripción |
| --- | --- | --- |
| caso_id | texto | `DBS-AAAAMMDD-XXXX`; lo genera T02 o V01 |
| canal | texto | `telegram` o `voz` |
| usuario | texto | Seudónimo (`U-SOL001`, `U-VOZ001`); nunca el nombre |
| chat_id | texto | Destino del aviso en Telegram (**privado**) |
| estado | texto | `recibido`, `pendiente_aprobacion`, `cerrado_aprobado`, `cerrado_rechazado`, `cerrado_vencido`, `requiere_datos`, `rechazado`, `revision_humana`, `detenido_limite`, `error` |
| texto_solicitud | texto | Brief original (**privado**: puede traer texto libre) |
| tipo_campana, duracion_semanas | texto, número | Del requerimiento validado |
| propuesta_json | texto | `{calculo, ficha, texto}`: cálculo determinista, ficha pública y redacción de A3 |
| total_mxn, margen | número | Total con IVA; el margen es **interno** y no se publica |
| version | número | Versión aprobable (iteración del loop de calidad) |
| aprobacion_expira | fecha ISO | Solicitud + 24 h (R9) |
| decision, ts_decision | texto, fecha | `aprobada`, `rechazada` o `vencida` |
| ts_solicitud, ts_propuesta_lista, ts_cierre | fecha ISO | Base de K1 |
| motivo, consumo_tokens | texto, número | Causa de los cierres anticipados y tokens del caso |

### `costos` (una fila por llamada al modelo) → `costos/costos.csv`
`fecha_hora, caso_id, llamada_id, etapa, agente, proveedor, modelo, tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, unidad_cobro, tarifa_entrada, tarifa_salida, costo_usd, moneda, estado, reintento, origen`

`origen` puede ser:
- `medido`: tokens y tarifa reales.
- `medido_sin_tarifa`: tokens reales sin tarifa; el costo queda vacío.
- `medido_recalculado_tarifa_oficial`: filas anteriores recalculadas el 2026-11-05.
- `estimado_sin_respuesta`: el proveedor no respondió; no se reporta 0.

### `trazas` (decisiones y llamadas) → `evidencias/trazas_sanitizadas.csv`
`ts, caso_id, tipo, agente, iteracion, estado, llamada_id, detalle`

`tipo` puede ser:
- `llamada_agente`, con `detalle.skill` y `detalle.controles`.
- `guardrail_inyeccion`, `guardrail_loop_seguridad` o `guardrail_presupuesto`.
- `solicitud_aprobacion`, `decision_humana`, `vencimiento` o `cierre`.

### Otras tablas
| Tabla | Campos | Uso |
| --- | --- | --- |
| `eventos` | event_key, ts | Deduplicación de updates de Telegram (`tg-msg-…`, `tg-cb-…`) |
| `usuarios` | telegram_user_id, chat_id, seudonimo, rol, activo | Autorización: `solicitante` o `coordinadora` (**privado**) |
| `catalogo servicios` | clave, nombre, tipo_cobro, precio_mxn, costo_mxn, horas, requiere, canales, activo | Fuente de A2 y del cálculo (copia en `datos/catalogo_servicios.csv`) |
| `industrias` | clave, nombre, regulada | R7 |
| `capacidad equipo` | mes, horas_libres_semana | R3 |

## Datos públicos: `web/data/publico.json`
| Bloque | Campos |
| --- | --- |
| `generado`, `rotulo` | Fecha de exportación y «DATOS FICTICIOS · RESULTADO SIMULADO» |
| `kpi` | `k1_mediana_min`, `k1_n`, `k2_tasa_aprobacion`, `k2_n`, `k3_usd_por_caso`, `k3_n`, `k3_casos_sin_registro`, `k3_fallidos_usd`, `k3_fallidos_n`, `k3_nota` |
| `casos[]` | caso_id, canal, estado, decision, tipo_campana, duracion_semanas, ts_solicitud, ts_propuesta_lista, version |
| `fichas[]` | caso_id, estado, decision, version, tipo_campana, objetivo, industria, fecha_inicio, canales, semanas, vigencia_dias, minutos_a_propuesta, `servicios[]`, `kpi` {total_mxn, honorarios_mxn, descuento_mxn, iva_mxn, pauta_mxn, horas_equipo, horas_semana, capacidad_semana, mes_capacidad, costo_ia_usd, llamadas_ia, tokens_ia} |

`scripts/validar.js` bloquea la publicación si aparece alguno de estos campos: `margen`, `costo_total`, `costo_mxn`, `usuario`, `chat_id`, `texto_solicitud`, `propuesta_json`, `telegram_user_id`, `seudonimo` o `texto`.
