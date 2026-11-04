# Data Tables privadas en n8n

Crea estas tablas en **Overview → Data tables → Create Data table**. Los tipos de columna no se pueden cambiar después de crear la tabla. Las fechas se guardan como texto ISO 8601 (UTC) para evitar conversiones de zona horaria.

## Tablas de operación (zona privada)

| Tabla | Columnas (tipo) | Uso |
| --- | --- | --- |
| `usuarios` | telegram_user_id (string), chat_id (string), seudonimo (string), rol (string), activo (boolean) | Lista de usuarios autorizados. `rol` = `solicitante` o `coordinadora`. Aquí viven los IDs reales; a los agentes solo viaja `seudonimo` |
| `eventos` | event_key (string), ts (string) | Deduplicación de updates de Telegram |
| `casos` | caso_id, canal, usuario, chat_id, estado, texto_solicitud, ts_solicitud, tipo_campana, propuesta_json, aprobacion_expira, ts_propuesta_lista, decision, ts_decision, motivo, ts_cierre (string) · version, duracion_semanas, total_mxn, margen, consumo_tokens (number) | Registro único de casos, compartido por Telegram y voz |
| `trazas` | ts, caso_id, tipo, agente, estado, detalle, llamada_id (string) · iteracion (number) | Plan, llamadas, guardrails, decisiones y cierres |
| `costos` | fecha_hora, caso_id, llamada_id, etapa, agente, proveedor, modelo, unidad_cobro, moneda, estado, origen (string) · tokens_entrada, tokens_salida, tokens_cache_lectura, tokens_cache_escritura, tarifa_entrada, tarifa_salida, costo_usd, reintento (number) | Registro de consumo por llamada |

## Tablas de referencia (importar desde `datos/`)

Usa **Import CSV** en la pestaña Data tables con cada archivo:

| Tabla | Archivo |
| --- | --- |
| `catalogo_servicios` | `datos/catalogo_servicios.csv` |
| `industrias` | `datos/industrias.csv` |
| `capacidad_equipo` | `datos/capacidad_equipo.csv` |

Después de importar, revisa que las columnas numéricas (precios, costos, horas) hayan quedado como **number**. Si quedaron como texto, el código las convierte con `Number()`, pero conviene corregirlo.

## Cómo llenar `usuarios`

1. Escríbele a tu bot desde tu cuenta y abre **@userinfobot** (o revisa la ejecución del Telegram Trigger) para ver tu ID numérico.
2. Agrega dos filas: una con `rol = coordinadora` (tu cuenta; es quien aprueba las propuestas) y otra con `rol = solicitante` (una segunda cuenta de prueba, o la misma cuenta si solo tienes una).
3. Usa seudónimos con el formato `U-` + 6 caracteres, por ejemplo `U-COO001` y `U-SOL001`.

Nunca subas esta tabla ni sus IDs al repositorio.

Límite conocido: el almacenamiento total de Data Tables en una instancia es de 50 MB por defecto ([docs n8n](https://docs.n8n.io/build/work-with-data/data-tables.md)).
