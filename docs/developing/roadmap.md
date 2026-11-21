# Roadmap ARC-09 — Reutilizar el guardado con versión entre editores

> **Estado:** Activo (2026-11-21) · **Origen:** ARC-09 del backlog
> **Backlog:** 2 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Comparar el guardado con versión de Aula Documentos con `useAppDocument`.
- [ ] Pilotar `saveVersioned` en Hoja de cálculo sin pisar ediciones concurrentes.
- [ ] Extraer solo el contrato que el piloto demuestre reutilizable.
- [ ] Migrar otros editores únicamente cuando compartan semántica; documentar las excepciones.
- [ ] Criterio de éxito: dos sesiones no se pisan, un fallo de carga no se interpreta como documento nuevo y el borrador se conserva ante un conflicto.

## 2. Alcance

**Dentro:**

- Inventario de lecturas, guardados, versiones y conflictos en Aula Documentos, Hoja de cálculo, Mapas, Líneas de tiempo, Tarjetas y Blockly.
- Contrato común de resultado de guardado y conflicto.
- Piloto de Hoja de cálculo con `saveVersioned`.
- Tratamiento de carga fallida y preservación del borrador local.
- Migración selectiva de los editores que cumplan la misma semántica.
- Pruebas de dos sesiones, conflicto, fallo de red y recuperación.

**Fuera:**

- Cambiar el esquema de cada app, sus URLs o sus permisos.
- Sustituir el modelo de recuperación local de cada editor.
- Convertir `save` en un alias obligatorio de `saveVersioned`.
- Compartir estado entre ventanas o añadir colaboración en tiempo real.
- Cambiar la API de Aula Documentos por documento.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Comparar primero ambos clientes | Reemplazar `save` en todas las apps | La semántica de conflicto y recuperación no es idéntica. |
| Pilotar con Hoja de cálculo | Migrar todo el catálogo de golpe | Permite validar la UX y el contrato antes de ampliar. |
| Conservar el borrador ante conflicto | Recargar y descartar cambios locales | Evita pérdida de trabajo. |
| No tratar un fallo de carga como documento nuevo | Mostrar el estado inicial y permitir guardar | Un error de red no debe sobrescribir datos existentes. |
| Extraer solo lo que use el piloto | Crear una abstracción genérica anticipada | Evita una API compartida sin consumidores reales. |
| Mantener la API de Aula por documento | Reutilizar `useAppDocument` para documentos múltiples | Aula tiene un contrato de identidad y autorización distinto. |

## 4. Punto de partida

- `useAppDocument` ya expone `load`, `save` y `saveVersioned`; su resultado distingue `saved`, `conflict` y `failed`.
- Aula Documentos usa `useAulaDocumentApi` y `saveVersioned` con un endpoint por documento.
- Hoja de cálculo, Mapas, Líneas de tiempo, Tarjetas y Blockly usan `save` sin versión esperada.
- El servidor de `/api/app-documents` ya acepta `expectedUpdatedAt` y responde 409 sin pisar el documento.
- `use-app-document.test.tsx` cubre la lectura y el conflicto del cliente, pero no los editores.
- Arquitectura: **459 archivos / 1.149 imports**; suite **265 archivos / 1.747 pruebas**; Aula **386.272 / 387.000 B**; Site `1.1.38`.

## 5. Fases

### Fase 1 — Inventario y contrato de guardado

- [ ] Inventariar carga, guardado, versión, conflicto, autosave y recuperación de cada editor.
- [ ] Comparar `useAppDocument` y `useAulaDocumentApi` campo por campo.
- [ ] Decidir qué tipos, resultados y helpers pueden compartirse sin cambiar la semántica.
- [ ] Documentar qué editores no deben migrarse y por qué.
- **Criterios:** contrato de conflicto y carga claro para todos los editores; sin cambios de código.

### Fase 2 — Piloto de Hoja de cálculo

- [ ] Sustituir el guardado sin versión por `saveVersioned` en Hoja de cálculo.
- [ ] Guardar la versión conocida tras una carga correcta y no tras un fallo de lectura.
- [ ] Conservar el documento local y mostrar un estado de conflicto sin sobrescribir.
- [ ] Mantener permisos de invitado, autosave y recuperación actuales.
- [ ] Probar dos sesiones, conflicto, fallo de carga, reintento y cierre.
- **Criterios:** dos sesiones no se pisan; el borrador local se conserva; un fallo de carga no habilita una escritura destructiva.

### Fase 3 — Extraer el contrato validado

- [ ] Extraer a `shared` solo los tipos y helpers que use el piloto.
- [ ] Mantener `save` y `saveVersioned` disponibles mientras existan consumidores.
- [ ] Evitar mover la recuperación local específica de cada app.
- [ ] Cubrir los helpers compartidos con pruebas de conflicto y resultado.
- **Criterios:** el contrato compartido tiene consumidores reales y no duplica lógica de servidor.

### Fase 4 — Migración selectiva de editores

- [ ] Evaluar Mapas, Líneas de tiempo, Tarjetas y Blockly frente al contrato validado.
- [ ] Migrar solo los editores con la misma semántica y permisos.
- [ ] Documentar las excepciones que conservan `save` o su recuperación local.
- [ ] Probar carga fallida, conflicto, borrador y guardado normal en cada editor migrado.
- **Criterios:** no se fuerza una abstracción a un editor con contrato distinto; cada app conserva su experiencia.

### Fase 5 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- [ ] Revisar los clientes anteriores y las herramientas de escritura del plugin.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** conflicto y recuperación verificados, sin pérdida de datos y sin publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Interpretar un fallo de carga como hoja nueva | Sobrescritura de datos existentes | No guardar con versión `null` tras una lectura fallida. |
| Recargar automáticamente al detectar conflicto | Pérdida del borrador | Mantener el estado local y pedir una acción explícita. |
| Extraer un contrato prematuro | Complejidad sin consumidores | Esperar al piloto y migrar solo semánticas equivalentes. |
| Cambiar la UX de guardado de una app | Regresión de flujo | Mantener mensajes, permisos y recuperación propios. |
| Dos clientes actualizan a la vez | Documento pisado | Usar `expectedUpdatedAt` y probar el 409 de extremo a extremo. |
| Ampliar el alcance a colaboración | Roadmap inabarcable | Limitar a guardado, conflicto y borrador local. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** ARC-09 sale del backlog; quedan **2 entradas** y el siguiente candidato es **ARC-10**. Sin cambios de código de producto.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
