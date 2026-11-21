# Roadmap ARC-07 — Eliminar duplicación comprobada en Aula Documentos

> **Estado:** Activo (2026-11-21) · **Origen:** ARC-07 del backlog
> **Backlog:** 4 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Unificar la lógica repetida de recuperación local sin cambiar claves, formatos guardados ni datos existentes.
- [ ] Reutilizar una única extracción de texto concatenado en Markdown, presentación, título y Office.
- [ ] Reutilizar la descarga existente en Blockly y mantener aislado el ciclo de vida de la URL del worker.
- [ ] Criterio de éxito: mismas copias, mismos textos exportados y mismas descargas, con arquitectura, pruebas y presupuestos correctos.

## 2. Alcance

**Dentro:**

- Extracción de un núcleo común para las copias de recuperación por proyecto y por documento.
- Conservación de las claves actuales y de la migración de recuperaciones antiguas.
- Extracción de un helper de texto inline que no añade espacios entre marcas que dividen una palabra.
- Sustitución de los `nodeText` duplicados en los formatos afectados.
- Reutilización de `shared/ui/download.ts` en la descarga JSON de Blockly.
- Revisión del ciclo de vida de la URL del worker de Blockly.
- Pruebas de recuperación, formatos, descargas, arquitectura y presupuestos.

**Fuera:**

- Mover módulos entre `app`, `shared` y `lib` o redefinir fronteras de ARC-08.
- Cambiar el esquema de documentos, la API, las URLs, los permisos o las claves de almacenamiento.
- Cambiar el comportamiento de `contentText`, que separa nodos con espacios de forma deliberada.
- Unificar formateadores con semántica distinta o selecciones de plantillas que solo repiten una línea.
- Crear un gestor genérico de workers o una abstracción de descargas más amplia que la existente.
- Publicar en Sites o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Núcleo de recuperación dentro de `lib/domain/aula-documentos` | Mover la lógica a una app o a `shared` | Es una regla pura y ambos consumidores son del mismo dominio. |
| Mantener las claves actuales y los wrappers públicos | Reescribir el almacenamiento con una clave nueva | Evita pérdida de copias y mantiene la migración existente. |
| Nuevo helper de texto inline en `text.ts` | Reutilizar `contentText` para todo | `contentText` debe conservar sus espacios entre nodos para otros consumidores. |
| Reutilizar `downloadBlob` | Duplicar la creación del enlace temporal | La descarga ya tiene una implementación probada y compartida. |
| El worker conserva su módulo y ciclo de vida | Mover el worker a `shared` | Solo Blockly lo usa; ARC-08 decidirá si cambia de hogar. |
| No tocar `shared` en este roadmap | Adelantar ARC-08 | Primero se elimina la duplicación comprobada y después se mueven fronteras. |

## 4. Punto de partida

- `recovery.ts` y `recovery-document.ts` repiten validación, normalización, identificadores, serialización y recorte por cuota.
- Markdown, presentación, título, importación de Office y exportación de Office repiten un `nodeText` que concatena sin espacios entre nodos inline.
- La descarga JSON de Blockly crea su propio Blob, enlace y URL; `shared/ui/download.ts` ya ofrece `downloadBlob`.
- El worker de Blockly ya vive en `blockly-run-worker.ts` y revoca la URL en su finalización; hay que conservar ese comportamiento al revisar la descarga.
- Suite: **264 archivos / 1.742 pruebas**; arquitectura **456 archivos / 1.136 imports**; Aula Documentos **386.230 / 387.000 B gzip**; Site publicado `1.1.38` según la confirmación del usuario.

## 5. Fases

### Fase 1 — Núcleo común de recuperación

- [x] Extraer validación, normalización, orden, identificadores, serialización y recorte por cuota a un módulo interno del dominio.
- [x] Mantener `listAulaRecoveryCopies`, `saveAulaRecoveryCopy`, `listDocumentRecoveryCopies`, `saveDocumentRecoveryCopy` y `migrateDocumentRecoveryCopies` con las mismas firmas y claves.
- [x] Conservar la lectura de la clave antigua del proyecto y la migración al documento sin borrar el origen.
- [x] Cubrir recuperación por proyecto y documento, entradas inválidas, orden, cuota, fallo de serialización y migración.
- **Criterios:** mismas copias y mismos resultados de error; ninguna clave ni dato existente cambia.
- **Cierre (2026-11-21):** `recovery-store.ts` concentra validación, normalización, identificadores, serialización y recorte; los wrappers de proyecto y documento conservan sus claves y APIs, y la migración sigue leyendo la clave antigua sin borrarla. Pruebas de copias, entradas inválidas, cuota y migración correctas. Arquitectura **457 archivos / 1.139 imports**; suite **264 archivos / 1.742 pruebas**; build **386.244 B**.

### Fase 2 — Extracción de texto de formatos

- [ ] Añadir a `text.ts` un helper de texto inline que concatene nodos sin introducir espacios entre marcas.
- [ ] Reutilizarlo en Markdown, presentación, título, importación de Office y exportación DOCX/PPTX.
- [ ] Mantener `contentText` intacto para los consumidores que necesitan separación entre nodos.
- [ ] Probar marcas que dividen una palabra, bloques consecutivos, tablas, listas y texto vacío.
- **Criterios:** los títulos, celdas y exportaciones producen exactamente el mismo texto visible que antes.

### Fase 3 — Descarga de Blockly y URL del worker

- [ ] Sustituir la descarga manual de Blockly por `downloadBlob`.
- [ ] Mantener el nombre `programa-<projectId>.json`, el tipo JSON y el aviso de descarga.
- [ ] Revisar que la URL del worker se revoca al terminar, fallar, agotar el tiempo o cancelar.
- [ ] Probar la descarga y la finalización del worker sin dejar URLs ni workers vivos.
- **Criterios:** la descarga es idéntica para el usuario y el ciclo de vida del worker queda cubierto.

### Fase 4 — Cierre

- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- [ ] Revisar que las pruebas de recuperación, conversión y Blockly cubren los cambios.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** sin duplicación pendiente en los puntos revisados, sin cambios de comportamiento y sin publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cambiar una clave de recuperación | Pérdida de copias locales | Mantener wrappers y probar la migración de la clave antigua. |
| Un helper de texto demasiado agresivo | Palabras separadas o unidas de forma distinta | Probar marcas inline y conservar `contentText` sin cambios. |
| Mover el worker antes de tiempo | Duplicación nueva y presupuesto alterado | Mantenerlo en Blockly hasta ARC-08. |
| Budget de Aula Documentos ajustado | El build puede superar el límite | Medir cada fase y no ampliar el presupuesto sin justificación. |
| Cambios de recuperación sin compatibilidad | Copias antiguas inaccesibles | Leer primero la clave antigua y no borrarla durante la migración. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** ARC-07 sale del backlog; quedan **4 entradas** y el siguiente candidato es **ARC-08**. Sin cambios de código de producto.
- 2026-11-21: **Fase 1 completada.** Núcleo común de recuperación en `recovery-store.ts`; wrappers, claves y migración conservados. Arquitectura **457 archivos / 1.139 imports**; suite **264 archivos / 1.742 pruebas**; build **386.244 B**.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios de UI-11 mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
