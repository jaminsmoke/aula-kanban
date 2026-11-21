# Roadmap ADOC-20 — Comentarios, revisión e historial

> **Estado:** Activo (2026-11-21) · **Origen:** ADOC-20 del backlog
> **Backlog:** 2 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Añadir comentarios anclados a texto o bloques, con responder, resolver y borrar.
- [ ] Añadir un historial de versiones con nombre, fecha, autor y restauración.
- [ ] Aplicar permisos por rol a comentarios, historial y restauración.
- [ ] Exportar o imprimir comentarios cuando se solicite.
- [ ] Resolver concurrencia, cuotas, retención y estados de error.
- [ ] Criterio de éxito: una persona puede revisar sin modificar el texto, restaurar una versión anterior y ver quién cambió qué sin perder el documento actual.

## 2. Alcance

**Dentro:**

- Comentarios anclados a una selección de texto o a un bloque.
- Hilos con respuesta, resolución, reapertura y borrado según permisos.
- Comentarios huérfanos cuando el ancla ya no se puede resolver.
- Historial de versiones con nombre, autor, fecha, tamaño y restauración.
- Creación de versiones explícitas y snapshot previo a restauración.
- Permisos de comentarios e historial por rol, con autoridad en servidor.
- Exportación e impresión opcional de comentarios.
- Límites de longitud, cantidad, tamaño y paginación.
- Concurrencia optimista y conflictos visibles.
- Pruebas de anclaje, permisos, restauración, concurrencia y exportación.
- Documentación, ayuda y cierre.

**Fuera:**

- Control de cambios o diff de texto.
- Edición colaborativa en tiempo real, cursores o presencia.
- Notificaciones por correo, push o websockets.
- Comentarios entre documentos o búsqueda global de comentarios.
- Guardar comentarios o versiones dentro de `AulaDocument`.
- Cambiar el modelo de edición, la suite o las URLs de ADOC-17.
- Publicar, aplicar migraciones remotas o cambiar la versión del Site.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Comentarios e historial viven fuera de `AulaDocument` | Incrustarlos en el JSON canónico | El documento ya tiene límites estrictos; mezclar revisión y contenido complica guardado y exportación. |
| El ancla guarda cita, contexto y posiciones originales | Guardar solo posiciones Tiptap | Las posiciones cambian al editar; la cita permite recuperar el ancla o marcarla huérfana. |
| Los comentarios no modifican el documento | Insertar marcas o nodos de comentario | Revisar no debe alterar el contenido ni romper exportaciones. |
| El historial guarda snapshots completos del documento validado | Guardar solo diferencias | El documento es pequeño y los snapshots facilitan restaurar sin un motor de diff. |
| Versiones explícitas y snapshot previo a restaurar | Snapshot en cada autosave | Evita decenas de versiones por sesión y mantiene el coste predecible. |
| Permisos en servidor y reflejo en la UI | Ocultar botones como única defensa | La API debe rechazar acciones no permitidas aunque se manipule el cliente. |
| Restauración con concurrencia optimista | Sobrescribir siempre | No se puede pisar un documento que cambió después de la versión elegida. |
| Exportar comentarios solo si se solicita | Incluirlos siempre en PDF | La salida normal del documento debe seguir limpia. |
| Retención y cuotas configurables | Crecimiento sin límite | Evita llenar D1 con hilos y snapshots antiguos. |

## 4. Punto de partida

- Aula Documentos ya tiene suite, guardado optimista, copias portables, recuperación local y MCP por `documentoId`.
- No hay comentarios, hilos, anclas ni historial visible de versiones.
- La recuperación actual guarda copias locales y de documento, pero no ofrece una lista con nombre, autor y restauración.
- Los roles existentes son `owner`, `admin`, `teacher`, `student` y `guest`; los invitados ya están en solo lectura.
- El editor y la exportación trabajan sobre el documento Tiptap activo; las notas de presentación y los ajustes de página ya viven en `presentation`.
- Suite: **258 archivos / 1.714 pruebas**; arquitectura **440 archivos / 1.078 imports**; Aula Documentos **378.750 / 379.000 B gzip**; Site `1.1.37`.

## 5. Fases

### Fase 1 — Inventario, contrato y modelo de revisión

- [ ] Inventariar guardado, versiones, copias, roles y exportaciones existentes.
- [ ] Definir el modelo de comentario, hilo, ancla y estado huérfano.
- [ ] Definir el modelo de versión, snapshot, autoría, retención y restauración.
- [ ] Fijar la matriz de permisos por rol y las cuotas de comentarios/versiones.
- [ ] Documentar el contrato en `docs/developing/aula-documentos-revision.md`.
- **Criterios:** comentarios, historial, permisos, exportación y concurrencia tienen un contrato común; no se mueve código todavía.

### Fase 2 — Comentarios e hilos

- [ ] Añadir selección de texto/bloque y creación de comentarios con cita de contexto.
- [ ] Implementar hilos, respuestas, resolver, reabrir y borrar con permisos.
- [ ] Resolver anclas al abrir y mostrar comentarios huérfanos sin romper el editor.
- [ ] Añadir la vista lateral de comentarios con estados vacíos y filtros básicos.
- [ ] Probar anclas, texto repetido, bloques eliminados, hilos y límites.
- **Criterios:** se revisa el documento sin modificar el texto y cada comentario conserva su contexto o se marca como huérfano.

### Fase 3 — Historial de versiones

- [ ] Añadir creación de versiones con nombre y snapshot validado.
- [ ] Listar versiones con autor, fecha, tamaño y paginación.
- [ ] Permitir previsualizar y restaurar una versión con concurrencia optimista.
- [ ] Guardar un snapshot previo antes de restaurar y avisar del resultado.
- [ ] Probar restauración, conflictos, versiones antiguas y documentos grandes.
- **Criterios:** se puede recuperar una versión anterior sin perder el estado actual por una escritura concurrente.

### Fase 4 — Permisos, exportación y límites

- [ ] Aplicar la matriz de permisos en API y UI para comentarios e historial.
- [ ] Exportar e imprimir comentarios bajo demanda, con cita, autor y estado.
- [ ] Añadir retención, cuotas, paginación y mensajes de error claros.
- [ ] Revisar concurrencia entre comentarios, versiones y guardado del documento.
- [ ] Probar roles, exportación, límites y recuperación ante fallos.
- **Criterios:** cada rol ve y hace solo lo permitido; la salida normal no incluye comentarios y los límites no bloquean la edición.

### Fase 5 — Cierre

- [ ] Revisar que comentarios, historial, documento y exportaciones comparten la identidad correcta.
- [ ] Actualizar ayuda, documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Ejecutar `npm run check`, suite completa, build, `perf:budget`, `app:budget` y `perf:office`.
- **Criterios:** revisión estable y accesible, suite y presupuestos correctos; sin cambios de versión ni publicación.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Anclas frágiles | Comentario en el lugar equivocado | Cita, contexto y fallback huérfano; pruebas con texto repetido y bloques borrados. |
| Permisos solo en UI | Escritura no autorizada | Comprobar rol y pertenencia en cada endpoint. |
| Snapshots ilimitados | Cuota de D1 agotada | Retención, límite por documento y purga documentada. |
| Restauración pisa cambios | Pérdida de trabajo | `expectedUpdatedAt`, snapshot previo y conflicto visible. |
| Comentarios en el JSON | Aumento del documento y exportaciones sucias | Tablas y contrato separados del contenido. |
| Bucles de notificación | Ruido y bloqueo | Sin notificaciones en este roadmap; solo estados visibles al abrir. |
| Exportación accidental | Documento de clase con comentarios privados | Opción explícita y desactivada por defecto. |

## 7. Notas de sesión

- 2026-11-21: **Roadmap abierto.** ADOC-20 sale del backlog; quedan **2 entradas** y el siguiente candidato es **UI-11**. Sin cambios de código de producto.
- La suite, el guardado optimista y las copias de ADOC-17 son la base; no se crea un editor paralelo.
- Comentarios, versiones y retención se documentarán por separado del JSON canónico.
- No hay publicación ni migraciones remotas en este roadmap.
