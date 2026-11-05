# Escenarios mensuales de costo y optimización

> 2026-11-05 · Fuente de los costos medidos: `costos/costos.csv` (57 llamadas registradas en n8n). Tarifas: `costos/tarifas.csv`. Cálculo reproducible: `python3 scripts/costos_escenarios.py`.
> **Dato** = medido en el registro · **Supuesto** = declarado para proyectar · nada de esto es una cotización.

## 1. Costo medido por caso (LLM, Haiku 5.5 a 0.10 / 0.50 USD por millón de tokens)

| Ruta del caso | Casos medidos | USD por caso (promedio) | Folios |
| --- | --- | --- | --- |
| Completo, sin corrección | 6 | 0.0022104 | GRPF, VMC2, PBT2, ZYFZ, QN6A, T6RE (voz) |
| Completo, con 1 corrección (loop V1 → V2) | 1 | 0.0042004 | QWWR |
| Cierre temprano (faltan datos, presupuesto o falla de la API) | 3 | 0.0003564 | TTM6, G87G, YCHN |
| Detenido por límite (3 vueltas con salida cortada) | 1 | 0.0046049 | HUPJ |
| Desarrollo (pruebas de construcción) | 2 | 0.0048462 | TEST, PRB1. **Subtotal aparte, no es operación** |

- **Promedio de casos completados (K3):** 0.002495 USD, con n = 7 (incluye el rechazado QN6A). Coincide con el panel publicado el 2026-11-05.
- **Casos fallidos (reportados aparte):** 0.0055 USD en total. YCHN no se cobra porque la API rechazó la llamada; se registra como estimado, sin poner cero.
- **Sin dato:** el caso de voz H8F5 no tiene filas en `costos`, así que no entra al promedio.

## 2. Supuestos de proyección

| Supuesto | Base | Mayor consumo | Fuente |
| --- | --- | --- | --- |
| Mezcla de rutas (completo / con corrección / cierre temprano / detenido) | 70 / 15 / 10 / 5 % | 45 / 40 / 5 / 10 % | Supuesto basado en las 12 corridas de prueba |
| Casos que entran por voz y minutos por conversación | 20 % · 2 min | 50 % · 4 min | Supuesto |
| Ejecuciones de n8n por caso | 9 | 12 | Conteo de workflows por caso: W1 + W2 + 4 a 6 de W3 + W5 + aprobación |
| Ejecuciones fijas al mes | 750 | 750 | Vencimiento cada hora (720) + exportación diaria (30) |
| Precio de voz | 0.08 USD/min incluido; costo del LLM de voz aparte (no medido) | — | elevenlabs.io/pricing/agents, consulta 2026-11-05 |
| n8n Cloud | Starter 20 €/mes (2,500 ejecuciones) · Pro 50 €/mes (10,000) · tope sin cobro extra | — | n8n.io/pricing, consulta 2026-11-05 (facturación anual) |
| Telegram, GitHub Pages y Actions | 0 (repositorio público, sin tokens) | — | No aplica tokenización |

## 3. Proyección mensual

| Casos/mes | Escenario | LLM (USD) | Voz: minutos → plan ElevenLabs | n8n: ejecuciones → plan |
| --- | --- | --- | --- | --- |
| 100 | Base | 0.24 | 40 min → Starter 6 USD (75 min incluidos) | 1,650 → Starter 20 € |
| 100 | Mayor | 0.32 | 200 min → Creator 22 USD (275 min) | 1,950 → Starter 20 € |
| 1,000 | Base | 2.44 | 400 min → Pro 99 USD (1,238 min) | 9,750 → Pro 50 € (cerca del tope) |
| 1,000 | Mayor | 3.15 | 2,000 min → Scale 299 USD (3,738 min) | 12,750 → **excede Pro**: Enterprise o self-hosted |
| 10,000 | Base | 24.43 | 4,000 min → Scale 299 USD + excedente, o Business 990 USD | 90,750 → Enterprise o self-hosted |
| 10,000 | Mayor | 31.53 | 20,000 min → Business 990 USD + excedente | 120,750 → Enterprise o self-hosted |

**Lectura para decidir** (inferencia a partir de la tabla):
- El costo del modelo de los 4 agentes es el componente **menor**: menos de 32 USD al mes incluso con 10,000 casos.
- Lo que crece es la **voz** (por minuto) y el **límite de ejecuciones de n8n**, que se corta sin cobrar extra.
- A partir de unos 1,000 casos al mes, la decisión es de plataforma (Pro, Enterprise o self-hosted) y de cuánto se usa la voz, no de tokens.
- No se extrapola el periodo de prueba gratuito de n8n como si fuera permanente.

## 4. Optimización propuesta: no llamar a A4 cuando la revisión determinista ya devolvió la propuesta

- **Hoy (dato):** en O06, aunque `revisarPropuesta` ya devolvió la versión (por ejemplo, total incorrecto o falta del rótulo), se llama a A4. El paso 1 de su skill lo obliga a responder "devuelto" y copiar esas mismas correcciones.
- **Cambio:** si `revision_det.estado = devuelto`, O06 salta a O07 con esas correcciones, como ya hace cuando A3 falla.
- **Antes y después en el caso QWWR (dato medido):** la llamada de A4 en la V1 costó 3,619 + 648 tokens = **0.0006859 USD**, el **16 %** del caso (0.0042004 USD). Con el cambio, el caso costaría 0.0035145 USD.
- **Calidad (inferencia):** la decisión no cambia, porque A4 está obligado a devolver lo mismo. Se pierden las correcciones redactadas por A4, que en QWWR solo repetían las deterministas.
  - El control de seguridad no se reduce: A4 sigue revisando cada versión que pasa la revisión determinista.
- **Ahorro proyectado (supuesto):** con 15 % de casos con corrección en el escenario base, el costo del LLM por caso baja alrededor de 4 %.
- La segunda palanca, más grande en dinero, es la **plataforma**: hoy W5 se ejecuta una vez por propuesta para publicar la ficha. Si se agrupa en una sola exportación cada 15 minutos, se ahorran unas 1,000 ejecuciones de n8n por cada 1,000 casos, a cambio de que la ficha tarde hasta 15 minutos en aparecer.
- **Estado:** propuestas documentadas, no aplicadas, para no cambiar el sistema antes de la defensa.

## 5. Incertidumbre declarada
- No hay desglose de los cargos de ElevenLabs por conversación: no se midió el costo del LLM del agente de voz ni los minutos reales.
- El costo de **desarrollo** con IA (Claude usado para construir) no tiene registro de tokens. Solo se reportan las pruebas registradas (TEST y PRB1: 0.0096925 USD).
- El tipo de cambio MXN/USD y EUR/USD no se verificó, así que no se convierte.
