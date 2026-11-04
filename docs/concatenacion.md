# Prueba de concatenación: un mismo `caso_id` de punta a punta

El folio `DBS-AAAAMMDD-XXXX` se crea **una sola vez**:
- En el nodo **T02 Autorizar y enrutar** si la solicitud llega por Telegram.
- En **V01 Validar voz** si llega por voz.

A partir de ahí, el mismo valor viaja por todos los componentes.

| # | Componente | Dónde aparece el `caso_id` | Evidencia que debes capturar |
| --- | --- | --- | --- |
| 1 | Telegram | Mensaje de confirmación "Caso DBS-… recibido" | Captura del chat |
| 2 | n8n W1 | Salida de T02 y fila nueva en `casos` | Ejecución de W1 + fila de la tabla |
| 3 | Orquestador W2 | `ctx.caso_id` en O01…O08 | Ejecución de W2 |
| 4 | A1, A2, A3, A4 | `entrada.caso_id` y `salida.caso_id` del contrato | 4+ ejecuciones de W3, una por agente |
| 5 | Costos | Columna `caso_id` y `llamada_id` (`<caso_id>-<agente>-i<n>-…`) en `costos` | Filas de la tabla filtradas por el folio |
| 6 | Trazas | Columna `caso_id` en `trazas` (plan, llamadas, decisión) | Filas filtradas por el folio |
| 7 | Aprobación | Botón con `apr:<caso_id>:v<versión>` | Captura del mensaje con botones + traza `decision_humana` |
| 8 | Notificación | Aviso al solicitante con el folio | Captura del chat |
| 9 | Export sanitizado | `web/data/publico.json` → `casos[].caso_id` | Commit del nodo GitHub |
| 10 | GitHub Actions | Ejecución disparada por ese commit | Enlace a la ejecución |
| 11 | GitHub Pages | Fila del folio en la tabla del panel | URL pública |
| 12 | ElevenLabs | La herramienta envía `caso_id` a W4 y lee la misma fila de `casos` | Registro de la llamada a la herramienta + ejecución de W4 |

## Verificación automática sin servicios

`node tests/simular_flujo.js` ejecuta los nodos Code reales con datos de `datos/` y respuestas del modelo simuladas. Comprueba que:
- Un mismo `caso_id` pasa por T01 → T02 → O01 → A1 → A2 → A3 (V1 devuelta) → A3 (V2) → A4 → O08 → aprobación → consulta por voz → exportación.
- Las 6 filas de costo comparten el folio y cubren los 4 agentes.
- La exportación no contiene seudónimos ni `chat_id`.

Esta prueba **no sustituye** la ejecución real en n8n. Valida la lógica y el contrato entre nodos.
