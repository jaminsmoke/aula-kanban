# Suite documental: paridad y compatibilidad

> **Estado:** Cerrada en Fase 5 de ADOC-13 · **Fecha:** 2026-11-19
> **Actualización Fase 2:** el bloque Mermaid de Aula Documentos ya incorpora Gantt guiado, plantillas, salto a la línea del error, zoom/paneo, pantalla completa y SVG por bloque.
> **Actualización Fase 3:** Aula Documentos añade Fuente Markdown, plantillas de presentación y Abrir Office para DOCX/XLSX/PPTX sin importar.
> **Actualización Fase 4:** las apps antiguas se ocultan de la Tienda y del escritorio, sus enlaces abren Aula Documentos y la migración guarda copias reversibles de origen y destino. MCP de Diagramas lee y escribe el primer bloque Mermaid de Aula cuando existe.
> **Actualización Fase 5:** las cuatro apps salen de `NATIVE_APP_IDS`, del catálogo, de la Tienda, del registro y de `app/board/apps/`; Aula Documentos queda como única entrada documental. Los enlaces y comandos antiguos siguen resolviendo a Aula Documentos y los datos históricos se pueden migrar con copia reversible.
> **Actualización STORE-18:** la tarjeta y la ficha presentan Aula Documentos como suite, con módulos, capacidades agrupadas, formatos, captura y aviso de migración. Aula Store sube a `1.15.0`; Aula Documentos sigue en `1.2.0`.
> **Apps comparadas:** Notas y documentos, Diagramas, Presentaciones y Visor Office frente a Aula Documentos.
> **Decisión de producto:** Aula Documentos será la app canónica; las cuatro apps se retiran solo después de demostrar paridad y conservar datos, enlaces, permisos y MCP.

## 1. Datos y accesos actuales

| App | `app_documents` | Forma del estado | Datos que deben sobrevivir |
|---|---|---|---|
| Notas y documentos | `documentos` | `{ title, content }` con Tiptap | Título, contenido y enlaces |
| Diagramas | `mermaid` | `{ code }` | Código Mermaid y diagramas Gantt |
| Presentaciones | `presentaciones` | `{ markdown }` | Markdown, saltos de diapositiva y plantilla |
| Visor Office | — | Sin estado | El archivo local no se guarda |
| Aula Documentos | `aula-documentos` | `{ schemaVersion: 3, title, content, presentation? }` | Documento canónico, tema, notas e imágenes |

Accesos que siguen funcionando durante la transición:

- IDs de app: `documentos`, `mermaid`, `presentaciones`, `visor-office` y `aula-documentos`.
- Parámetro de URL `app=<id>` y enlaces profundos existentes. Los cuatro IDs antiguos se canonizan a `app=aula-documentos`.
- Ventanas y elementos instalados que guarden el ID antiguo; el canal en vivo también resuelve el alias antes de buscar la ventana.
- Permisos actuales: todos los roles ven Aula Documentos; los invitados solo leen y no pueden migrar ni deshacer.
- MCP: Diagramas expone `leer_diagrama`, `guardar_diagrama` y `listar_plantillas_diagrama`. Si Aula Documentos ya tiene un documento válido, los dos primeros operan sobre su primer bloque Mermaid; si no, conservan la fila antigua `mermaid`. `listar_plantillas_diagrama` acepta cualquiera de las dos apps instaladas.
- Catálogo: `NATIVE_APPS`, `NATIVE_APP_IDS`, `registry.tsx`, portadas y fichas de la Tienda. Las cuatro apps antiguas tienen `hidden: true`: siguen en el registro y en `app_documents`, pero no aparecen en el catálogo ni en el escritorio.
- Migración: `POST /api/aula-documentos/migration?project=<id>` con `{ action: "migrate" | "rollback" }`; `GET` devuelve el estado detectado y si hay una migración reversible.

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
| Plantillas Mermaid | Selector completo | Selector en el bloque | Absorbida |
| Gantt guiado por contenido | Sí | Sí, modo Contenido del bloque | Absorbida |
| Errores con línea y salto | Sí | Sí, detalle y salto a línea | Absorbida |
| Lienzo con zoom, paneo y pantalla completa | Sí | Zoom, paneo y pantalla completa nativa | Absorbida |
| Exportar SVG por diagrama | Sí | Sí, por bloque | Absorbida |
| Guardar/cargar un diagrama suelto | Sí | Solo dentro del documento | Decidido: el bloque forma parte del documento; no habrá app separada |
| Ayuda, plantillas y atajos | Sí | Cubierto por el bloque y la ayuda | Absorbida |

**Conclusión:** Aula Documentos cubre ahora las funciones de Diagramas dentro del bloque: plantillas, Gantt guiado, errores con salto, zoom/paneo, pantalla completa y SVG por bloque. La app antigua se mantiene como cáscara hasta migrar datos y alias.

### Presentaciones

| Función | App antigua | Aula Documentos | Decisión |
|---|---|---|---|
| Diapositivas por saltos | Sí | Sí | Absorbida |
| Editor Markdown de origen | Sí | Sí, modal Fuente Markdown | Absorbida |
| Plantillas Clase, Proyecto y Blanco | Sí | Presentación breve, Presentación de proyecto y Presentación en blanco | Absorbida |
| Vista previa de diapositivas | Sí | Sí | Absorbida |
| Modo presentación | Sí | Sí | Absorbida |
| Temas de presentación | Parcial | Sí | Aula Documentos es superior |
| Notas del orador | No | Sí | Aula Documentos es superior |
| Exportar HTML de presentación | Sí | Sí | Absorbida |
| Autosave y conflicto | Sí | Sí | Conservar Aula Documentos |
| Modo lectura para invitados | Sí | Sí | Absorbida |

**Conclusión:** Aula Documentos cubre la edición por diapositivas, la fuente Markdown, las plantillas, temas, notas, vista previa, modo presentación y exportación. La app antigua se mantiene como cáscara hasta la migración.

### Visor Office

| Función | App antigua | Aula Documentos | Decisión |
|---|---|---|---|
| Abrir DOCX local | Sí | Sí, Abrir Office | Absorbida |
| Abrir XLSX local | Sí | Sí, Abrir Office; no se importa | Absorbida |
| Abrir PPTX local | Sí | Sí, Abrir Office | Absorbida |
| Zoom, navegación y pantalla completa | Sí | Sí en el visor compartido | Reutilizar |
| Importar DOCX/PPTX | No | Sí | Absorbida |
| Exportar DOCX/PPTX | No | Sí | Absorbida |
| Guardar el archivo original | No | No decidido; no se persiste | Mantener sin persistencia |
| Modo lectura | Sí | Sí | Absorbida |

**Conclusión:** el visor compartido ya cubre DOCX, XLSX y PPTX, y Aula Documentos ofrece una entrada estable “Abrir Office” además de la vista previa de importación. La app antigua puede retirarse tras la migración y los alias.

## 3. Decisiones de migración

1. **Aula Documentos es la fuente de verdad.** Las apps antiguas no se convierten en editores paralelos.
2. **Cáscaras compatibles primero.** Las apps y sus datos se mantienen en el registro; en la fase 4 se ocultan de la Tienda y del escritorio y se retiran físicamente en la 5.
3. **Migración con copia.** Se importa el estado antiguo a Aula Documentos y se conserva el estado de origen hasta validar el resultado. No se borra `app_documents` en la misma operación. Las copias internas usan el prefijo reservado `__aula-documentos-migration:`: una fila por app de origen, otra para el Aula anterior y una meta con la fecha y las fuentes importadas.
4. **Alias reversibles.** `documentos`, `mermaid`, `presentaciones` y `visor-office` resuelven a `aula-documentos` en URLs y ventanas. Los IDs antiguos siguen disponibles para leer sus filas y para MCP.
5. **MCP compatible.** Los nombres `leer_diagrama`, `guardar_diagrama` y `listar_plantillas_diagrama` siguen funcionando. Con un documento canónico en Aula, el primer bloque Mermaid es el diagrama activo; si no existe, se usa la fila antigua. Los diagramas adicionales del documento no se seleccionan desde MCP.
6. **Ficha de suite en STORE-18.** La tarjeta y la ficha presentan módulos, formatos, captura y migración sin anunciar apps retiradas como instalables.
7. **Carpetas al final.** Lo común se extrae a `shared` o `lib`; las raíces no se anidan dentro de `aula-documentos/` hasta la retirada.

## 4. Huecos priorizados

| Prioridad | Hueco | Fase |
|---|---|---|
| P0 | Migración de datos y alias de IDs/URLs | Hecho en Fase 4 |
| P0 | Compatibilidad MCP de Diagramas | Hecho en Fase 4 |
| P0 | Apertura libre de Office en Aula Documentos | Hecho en Fase 3 |
| P1 | Plantillas, Gantt, error y SVG de Diagramas | Hecho en Fase 2 |
| P1 | Editor Markdown y plantillas de Presentaciones | Hecho en Fase 3 |
| P1 | Ficha mínima sin apps retiradas | 5 |
| P2 | Rediseño reutilizable de tarjetas de suite | Hecho en STORE-18 |

## 5. Plan de reversión

- Mantener el código y los IDs antiguos hasta la fase 5.
- No borrar las filas antiguas de `app_documents` al migrar; guardar copias internas de cada origen y del Aula anterior, y una meta con la fecha de migración.
- `rollback` restaura el estado exacto de los orígenes y de Aula; si Aula no tenía documento, lo elimina. Después borra las copias y la meta para permitir una nueva migración.
- Mantener el mapa reversible de alias y pruebas de enlaces antiguos. Un enlace `app=mermaid`, `app=documentos`, `app=presentaciones` o `app=visor-office` abre Aula Documentos aunque la app antigua no esté instalada.
- Ocultar apps de la Tienda y del escritorio antes de eliminarlas del catálogo y de `NATIVE_APP_IDS`.
- Verificar que las ventanas instaladas, los comandos en vivo y los enlaces profundos siguen abriendo.
- Si falla la paridad o la migración, ejecutar `rollback` y conservar las apps antiguas y sus datos; no borrar rutas.
- No publicar en Sites hasta que la suite complete las pruebas y Codex de OpenAI lo autorice.

## 6. Estado de la Fase 4

- `NATIVE_APPS` marca las cuatro apps antiguas como `hidden`; `visibleTools` las excluye para todos los roles, incluidos administradores.
- `resolveAppRouteId` y `LEGACY_DOCUMENT_APP_ALIASES` canonizan URLs y comandos del espacio. `buildBoardUrl` escribe ya `app=aula-documentos`.
- La migración se ofrece desde **Importar > Migrar apps antiguas**. Solo se habilita sin cambios pendientes y con fuentes válidas.
- Los orígenes inválidos se omiten con aviso; no se modifican. Si Aula ya tiene documento, los datos se añaden al final para no borrar trabajo actual.
- La verificación real local migró Diagramas, mantuvo el título, guardó las copias y revirtió con estados idénticos en Aula y en `mermaid`.
- La app antigua sigue en `toolApps`, en `NATIVE_APP_IDS`, en `APP_MCP_DECLARACIONES` y en las rutas físicas hasta la Fase 5.

## 7. Criterio de salida de la Fase 1

- Cada función de la matriz tiene decisión: absorbida, ampliada, compatibilidad o descartada.
- Los estados de `app_documents`, IDs, URLs, permisos, MCP y catálogo están mapeados.
- Los huecos P0/P1 tienen fase asignada.
- No se ha retirado ninguna app ni se ha borrado ningún dato.
