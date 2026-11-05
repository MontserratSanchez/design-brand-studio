# Skills · Design & Brand Studio

| Skill | Tipo | Agente | Versión | Loop que lo usa |
| --- | --- | --- | --- | --- |
| [`cotizar-campana-dbs`](cotizar-campana-dbs/SKILL.md) | Negocio | A3 Propuesta | 1.0.0 | Calidad de negocio |
| [`revisar-propuesta-dbs`](revisar-propuesta-dbs/SKILL.md) | Calidad y seguridad | A4 Revisor | 1.1.0 | Calidad de negocio |

## Cómo se cargan (adaptador)
n8n no carga skills de forma nativa. El adaptador vive en el sub-workflow «DBS · Llamar agente» (W3):

1. **Leer instrucciones** (HTTP GET) descarga `agentes/<agente>.md` desde GitHub raw.
2. **Leer skill** (HTTP GET) descarga `skills/<skill>/SKILL.md`. La URL se deriva de la del agente. A1 y A2 no tienen skill y vuelven a leer su propio archivo.
3. **L01** ejecuta `parsearSkill`, que verifica:
   - el nombre esperado;
   - que el skill esté autorizado para ese agente;
   - la versión semántica;
   - las 12 secciones obligatorias.

   Si el skill es válido, lo agrega a las instrucciones con el título `SKILL APLICADO: nombre vX (huella)`. Si falta o está alterado, **no se llama al modelo** (control `skill_cargado`).
4. **L02** escribe en la traza `detalle.skill = nombre@versión#huella`. Así cada llamada demuestra qué archivo exacto se aplicó.

Las reglas del skill que se pueden verificar con código también corren en el servidor (`calcularPropuesta`, `revisarPropuesta`). El modelo no puede saltarlas.

## Cómo se versionan
- Cada cambio sube la `version` del encabezado y agrega una línea a «Historial de versiones».
- La huella cambia con cualquier edición, así que la traza distingue versiones aunque alguien olvide subir el número.
- `tests/test_skills.js` (lo corre GitHub Actions) falla si un skill pierde una sección, su versión o sus ejemplos.

## Autoevaluación (0–4; se exige ≥ 16/20 y ningún aspecto < 3)
| Aspecto | cotizar-campana-dbs | revisar-propuesta-dbs | Motivo |
| --- | --- | --- | --- |
| Claridad o propósito | 4 | 4 | Objetivo, activador y salida JSON únicos |
| Contexto o secuencia | 4 | 4 | Pasos numerados ligados a campos del contrato |
| Evidencia | 4 | 4 | Trazas reales de n8n con `detalle.skill` en 2 casos (QWWR y PBT2), con la misma huella que en CI (`aeb25fef`, `d2211991`) |
| Control o retorno | 4 | 4 | Errores E1 y E2, límites y bloqueo si el skill no carga |
| Utilidad | 4 | 4 | Específicos del catálogo y de las políticas de la consultora; no sirven sin cambios para otra empresa |
| **Total** | **20/20** | **20/20** | Listo |
