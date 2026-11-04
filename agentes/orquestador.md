# Orquestador — Design & Brand Studio (FICTICIO) · v1.0

El orquestador es determinista: se implementa con los nodos Code O01 a O08 del workflow «DBS · Procesar caso (orquestador)». No usa modelo de lenguaje, por eso no genera costo de tokens. Sus decisiones quedan en la tabla `trazas` y en `ctx.historial`.

## Responsabilidades
| Paso | Nodo | Decisión |
| --- | --- | --- |
| Plan | O01 | Crea el contexto del caso, fija modelo, límites y orden: A1 → A2 → A3 → A4 → aprobación humana |
| Tras A1 | O02 | Valida el brief con reglas (R1, R2, listas cerradas). Rechaza, pide datos o continúa |
| Recuperación | O03 | Consulta las 3 tablas autorizadas (servicios, industrias, capacidad) y arma la entrada de A2 |
| Tras A2 | O04 | Sin capacidad (R3), industria regulada o sin canal compatible (R7), o fuera de catálogo → revisión humana; si no, continúa |
| Cálculo | O05 | Calcula honorarios con la función determinista y pide a A3 la redacción |
| Revisión | O06 | Revisión determinista; si A3 falló, salta A4 |
| Loop | O07 | Aprueba solo si la revisión determinista Y A4 aprueban. Si no, reintenta (máx. 3 iteraciones) o detiene. Las fallas de R3, R6 o R7 detienen sin reintentar |
| Cierre | O08 | Deja el caso en `pendiente_aprobacion` y pide aprobación a la coordinadora de cuentas |

## Controles que no se pueden desactivar desde un mensaje
- Presupuesto de tokens por caso (`limite_tokens_caso`), verificado antes de cada llamada en «DBS · Llamar agente».
- Máximo 3 iteraciones del loop de calidad.
- Ningún caso incompleto se presenta como exitoso: todo cierre anticipado usa `cerrar()` con su estado real.
- Solo una aprobación válida (usuario autorizado, versión vigente, no vencida) cambia el caso a `cerrado_aprobado`.

## Estados del caso
`recibido` → `pendiente_aprobacion` → `cerrado_aprobado` | `cerrado_rechazado` | `cerrado_vencido`.

Cierres anticipados: `requiere_datos`, `rechazado`, `sin_capacidad`, `revision_humana`, `detenido_limite`, `error`.
