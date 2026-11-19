# Suite documental: paridad y compatibilidad

> **Estado:** Fase 1 de ADOC-13 · **Fecha:** 2026-11-19
> **Apps comparadas:** Notas y documentos, Diagramas, Presentaciones y Visor Office frente a Aula Documentos.
> **Decisión de producto:** Aula Documentos será la app canónica; las cuatro apps se retiran solo después de demostrar paridad y conservar datos, enlaces, permisos y MCP.

## 1. Datos y accesos actuales

| App | `app_documents` | Forma del estado | Datos que deben sobrevivir |
|---|---|---|---|
| Notas y documentos | `documentos` | `{ title, content }` con Tiptap | Título, contenido y enlaces |
| Diagramas | `mermaid` | `{ code }` | Código Mermaid y diagramas Gantt |
| Presentaciones | `presentaciones` | `{ markdown }` | Markdown, saltos de diapositiva y plantilla |
| Visor Office | — | Sin estado | El archivo local no se guarda |
| Aula Documentos | `aula-documentos` | `{ schemaVersion: 2, title, content, presentation? }` | Documento canónico, tema y notas |

Accesos que deben seguir funcionando durante la transición:

- IDs de app: `documentos`, `mermaid`, `presentaciones`, `visor-office` y `aula-documentos`.
- Parámetro de URL `app=<id>` y enlaces profundos existentes.
- Ventanas y elementos instalados que guarden el ID antiguo.
- Permisos actuales: todos los roles ven las apps; los invitados solo leen.
- MCP: Diagramas expone `leer_diagrama`, `guardar_diagrama` y `listar_plantillas_diagrama`; el resto no tiene herramientas específicas.
- Catálogo: `NATIVE_APPS`, `NATIVE_APP_IDS`, `registry.tsx`, portadas y fichas de la Tienda.

## 2. Matriz de paridad

### Notas y documentos

| Función | App antigua | Aula Documentos | Decisión |
|---|---|---|---|
| Título y texto enriquecido | Sí | Sí | Absorbida |
| Encabezados, listas, citas y código | Sí | Sí | Absorbida |
| Enlaces, tachado, alineación y listas de tareas | Parcial | Sí | Aula Documentos es superior |
| Exportar HTML | Sí | Sí | Absorbida |
| Autosave, conflicto y recuperación | Sí | Sí | Conservar el modelo de Aula Documentos |
| Modo lectura para invitados | Sí | Sí | Absorbida |
| Importación desde la app antigua | — | Sí | Mantener durante la transición |

**Conclusión:** no hay huecos funcionales pendientes. La app antigua puede retirarse cuando la migración y los alias estén verificados.

### Diagramas

| Función | App antigua | Aula Documentos | Decisión |
|---|---|---|---|
| Editar código Mermaid | Sí | Sí, en bloque | Absorbida |
| Plantillas Mermaid | Selector completo | Solo inserta la primera plantilla | **Añadir selector de plantillas** |
| Gantt guiado por contenido | Sí | No | **Añadir al bloque o a una vista de diagrama** |
| Errores con línea y salto | Sí | Parcial en el bloque | **Igualar detalle y salto** |
| Lienzo con zoom, paneo y pantalla completa | Sí | Parcial | **Añadir vista ampliada del bloque** |
| Exportar SVG por diagrama | Sí | No | **Añadir exportación por bloque** |
| Guardar/cargar un diagrama suelto | Sí | Solo dentro del documento | Decidir si se conserva como vista enfocada |
| Ayuda, plantillas y atajos | Sí | Parcial | Igualar antes de retirar |

**Conclusión:** Aula Documentos cubre el caso básico, pero no toda la experiencia de Diagramas. La app antigua se mantiene como cáscara hasta cerrar estos huecos.

### Presentaciones

| Función | App antigua | Aula Documentos | Decisión |
|---|---|---|---|
| Diapositivas por saltos | Sí | Sí | Absorbida |
| Editor Markdown de origen | Sí | No; el documento es Tiptap | **Añadir modo fuente Markdown o equivalente** |
| Plantillas Clase, Proyecto y Blanco | Sí | Plantillas de documento, no de diapositivas | **Añadir plantillas de presentación** |
| Vista previa de diapositivas | Sí | Sí | Absorbida |
| Modo presentación | Sí | Sí | Absorbida |
| Temas de presentación | Parcial | Sí | Aula Documentos es superior |
| Notas del orador | No | Sí | Aula Documentos es superior |
| Exportar HTML de presentación | Sí | Sí | Absorbida |
| Autosave y conflicto | Sí | Sí | Conservar Aula Documentos |
| Modo lectura para invitados | Sí | Sí | Absorbida |

**Conclusión:** faltan la edición Markdown de origen y las plantillas de diapositivas. La primera puede ser un modo fuente sincronizado; la segunda puede reutilizar los presets actuales.

### Visor Office

| Función | App antigua | Aula Documentos | Decisión |
|---|---|---|---|
| Abrir DOCX local | Sí | Solo como vista previa de importación | **Añadir apertura libre en Aula Documentos** |
| Abrir XLSX local | Sí | No | **Permitir XLSX en el visor**, sin importarlo como documento |
| Abrir PPTX local | Sí | Solo como vista previa de importación | **Añadir apertura libre en Aula Documentos** |
| Zoom, navegación y pantalla completa | Sí | Sí en el visor compartido | Reutilizar |
| Importar DOCX/PPTX | No | Sí | Absorbida |
| Exportar DOCX/PPTX | No | Sí | Absorbida |
| Guardar el archivo original | No | No decidido; no se persiste | Mantener sin persistencia |
| Modo lectura | Sí | Sí | Absorbida |

**Conclusión:** el visor compartido ya es la base; falta una entrada estable “Abrir Office” dentro de Aula Documentos para no depender de la app separada.

## 3. Decisiones de migración

1. **Aula Documentos es la fuente de verdad.** Las apps antiguas no se convierten en editores paralelos.
2. **Cáscaras compatibles primero.** Durante las fases 2 y 3 se mantienen las apps y sus datos; se ocultan en la fase 4 y se retiran en la 5.
3. **Migración con copia.** Se importa el estado antiguo a Aula Documentos y se conserva el estado de origen hasta validar el resultado. No se borra `app_documents` en la misma operación.
4. **Alias reversibles.** `documentos`, `mermaid`, `presentaciones` y `visor-office` deben resolver a Aula Documentos o a una vista de compatibilidad antes de retirar sus IDs.
5. **MCP compatible.** Los nombres `leer_diagrama`, `guardar_diagrama` y `listar_plantillas_diagrama` deben seguir funcionando o tener un adaptador documentado. Si el diagrama pasa a ser un bloque del documento, decidir cómo se selecciona el bloque y qué ocurre con varios.
6. **Ficha mínima en ADOC-13.** La tarjeta no debe anunciar apps retiradas; el patrón de ficha de suite se desarrolla en STORE-18.
7. **Carpetas al final.** Lo común se extrae a `shared` o `lib`; las raíces no se anidan dentro de `aula-documentos/` hasta la retirada.

## 4. Huecos priorizados

| Prioridad | Hueco | Fase |
|---|---|---|
| P0 | Migración de datos y alias de IDs/URLs | 4 |
| P0 | Compatibilidad MCP de Diagramas | 4 |
| P0 | Apertura libre de Office en Aula Documentos | 3 |
| P1 | Plantillas, Gantt, error y SVG de Diagramas | 2 |
| P1 | Editor Markdown y plantillas de Presentaciones | 3 |
| P1 | Ficha mínima sin apps retiradas | 5 |
| P2 | Rediseño reutilizable de tarjetas de suite | STORE-18 |

## 5. Plan de reversión

- Mantener el código y los IDs antiguos hasta la fase 5.
- No borrar las filas antiguas de `app_documents` al migrar; guardar una copia y marcar la fecha de migración.
- Mantener un mapa reversible de alias y una prueba de enlaces antiguos.
- Ocultar apps de la Tienda antes de eliminarlas del catálogo y de `NATIVE_APP_IDS`.
- Verificar que las ventanas instaladas y los enlaces profundos siguen abriendo.
- Si falla la paridad o la migración, restaurar la app antigua y conservar Aula Documentos sin cambios.
- No publicar en Sites hasta que la suite complete las pruebas y Codex de OpenAI lo autorice.

## 6. Criterio de salida de la Fase 1

- Cada función de la matriz tiene decisión: absorbida, ampliada, compatibilidad o descartada.
- Los estados de `app_documents`, IDs, URLs, permisos, MCP y catálogo están mapeados.
- Los huecos P0/P1 tienen fase asignada.
- No se ha retirado ninguna app ni se ha borrado ningún dato.
