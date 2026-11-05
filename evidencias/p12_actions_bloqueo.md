# Evidencia P12 · GitHub Actions bloquea la publicación ante una falla y publica tras corregirla

> 2026-11-05 · Workflow `.github/workflows/validar-y-publicar.yml` · Repositorio MontserratSanchez/design-brand-studio

| Paso | Commit | Ejecución de Actions | Resultado |
| --- | --- | --- | --- |
| Falla deliberada | `ebaa196`: sube `limite_tokens_caso` de 25,000 a 40,000 en O01 **sin** actualizar `tests/simular_flujo.js` | [41974531212](https://github.com/MontserratSanchez/design-brand-studio/actions/runs/41974531212) | **failure**. El paso «Controles previos al despliegue» falló en «Prueba de concatenación», porque la simulación todavía suponía 25,000 tokens (`consumo_tokens_caso: 24900` ya no agotaba el presupuesto). El job `publicar` quedó **skipped** y Pages no se actualizó |
| Corrección | Commit siguiente: la prueba toma el límite de O01 (`limite_tokens_caso - 100`) en lugar de un número fijo | La ejecución inmediatamente posterior en la pestaña Actions | **success**: valida y publica |

**Qué demuestra:** los controles corren antes de publicar y pueden fallar ante un error real. En este caso, una prueba desalineada con la configuración. Si fallan, no se despliega nada.
