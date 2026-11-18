# Cobertura MCP de las apps nativas

Estado de la superficie MCP de las dieciséis apps de Aula Store. La fuente de las
herramientas es `lib/server/mcp/apps/registro.ts`; la instalación y los permisos
se resuelven con `lib/server/mcp/apps/contrato.ts`.

**Última revisión:** 2026-11-18 · **Catálogo:** `0.28.0` · **59 herramientas**

**Estado:** MCP-05B, MCP-05C, MCP-05D y MCP-05E cerrados; las dieciséis apps tienen declaración MCP. Ajedrez, Tarjetas, Física, Geometría, Mapas, Presentaciones, Moléculas 3D, Líneas de tiempo, Hoja de cálculo, Notas y documentos, Visor Office y Calculadora no exponen herramientas propias porque su estado de trabajo vive en el navegador o en `app_documents` sin herramientas específicas.

## Herramientas comunes

Estas herramientas no pertenecen a una app concreta, pero son su punto de
entrada:

- **Aula Store (MCP-03):** `listar_apps`, `obtener_app`, `instalar_app` y
  `desinstalar_app`. Instalar y desinstalar exige propietario o administración.
- **Apertura y ventanas (MCP-04):** `abrir_app`, `listar_ventanas`,
  `cerrar_app`, `minimizar_app`, `restaurar_app` y `ampliar_app`. Requieren
  acceso al proyecto y una app instalada; los controles solo actúan sobre las
  pestañas conectadas de la propia cuenta.
- **Excalidraw (MCP-05B):** `leer_pizarra`, `guardar_pizarra` y `anadir_a_pizarra`. Leer requiere acceso al proyecto; escribir exige revisión y sigue las reglas de la pizarra.
- **Calculadora:** sin herramientas MCP; su estado de trabajo vive en el navegador.
- **Tabla periódica (MCP-05C):** `consultar_elemento`.
- **Programación por bloques (MCP-05D):** `leer_programa_bloques` y
  `guardar_programa_bloques`. Leer requiere acceso al proyecto; escribir exige
  permiso y los invitados no escriben.
- **Diagramas (MCP-05E):** `leer_diagrama`, `guardar_diagrama` y
  `listar_plantillas_diagrama`. Leer y listar plantillas no requieren escritura;
  guardar exige permiso y los invitados no escriben.

`abrir_app` acepta el alias `edu-tools` y lo resuelve como `calculadora`
durante un ciclo de compatibilidad; los enlaces nuevos usan el id canónico.
`abrir_app` y `listar_ventanas` son de lectura; cerrar, minimizar, restaurar y
ampliar son de escritura, pero no destructivas. Los invitados pueden abrir y
controlar sus propias ventanas; la escritura de contenido de las apps sigue las
reglas de cada app.

## Matriz por app

| App | Abrir | Ventana | Leer por MCP | Escribir por MCP | Exportar por MCP | Permisos | Límites |
|---|---|---|---|---|---|---|---|
| **Excalidraw** (`excalidraw`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `leer_pizarra` | Sí, `guardar_pizarra` y `anadir_a_pizarra` | No; la ventana exporta imagen | Leer: cualquier miembro. Escribir: no invitados; el alumnado solo en pizarras de sus tareas. La ventana de Tienda es de solo lectura para alumnado e invitados. | Snapshot de hasta 2 MB con revisión optimista; `409` con `revisionActual` si cambió. La publicación en vivo admite hasta 1 MB; las escenas mayores se recogen por sondeo. |
| **Calculadora** (`calculadora`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Cualquier miembro con acceso al proyecto; las cuentas invitadas la usan en local. | Sin estado de servidor: la calculadora, su memoria y su historial viven en el navegador. |
| **Tabla periódica** (`tabla-periodica`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `consultar_elemento` | No | No | Cualquier cuenta autenticada, incluidas invitadas y cuentas sin proyecto, si la app está instalada. La consulta no usa proyecto. | Una ficha por llamada entre 118 elementos. Los datos de referencia viven en el cliente. |
| **Programación por bloques** (`blockly`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `leer_programa_bloques` | Sí, `guardar_programa_bloques` | No; la ventana descarga JSON | Lectura: cualquier miembro. Escritura: no invitados; el alumnado puede guardar el documento del proyecto. | Estado JSON de hasta 200.000 caracteres. Sin revisión optimista: la última escritura gana. |
| **Diagramas** (`mermaid`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `leer_diagrama` y `listar_plantillas_diagrama` | Sí, `guardar_diagrama` | No; la ventana exporta SVG | Lectura y plantillas: cualquier miembro con acceso, o cualquier cuenta autenticada para las plantillas si la app está instalada. Escritura: no invitados; el alumnado puede guardar el documento del proyecto. | Código de hasta 200.000 caracteres. Sin revisión optimista: la última escritura gana. La validación y el render de Mermaid se quedan en el navegador. |
| **Ajedrez** (`ajedrez`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Cualquier miembro con acceso al proyecto; las cuentas invitadas lo usan en local. | Sin estado de servidor: el tablero y la partida viven en el navegador. |
| **Tarjetas de repaso** (`tarjetas`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Mazos: cualquier miembro con acceso; edición solo para owner, admin, teacher y student; invitados en solo lectura. El repaso local está disponible para todos. | Mazos y tarjetas en `app_documents`; el progreso FSRS vive en `localStorage` por proyecto y navegador. Sin herramientas MCP propias en esta versión. |
| **Física 2D** (`fisica`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Cualquier miembro con acceso al proyecto; las cuentas invitadas la usan en local. | Sin estado de servidor: la simulación y las escenas viven en el navegador. |
| **Geometría interactiva** (`geometria`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Cualquier miembro con acceso al proyecto; las cuentas invitadas la usan en local. | Sin estado de servidor: las construcciones, presets y funciones viven en el navegador. |
| **Mapas conceptuales** (`mapas`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Lectura para cualquier miembro; edición para owner, admin, teacher y student; invitados en solo lectura. | El mapa se guarda en `app_documents`; la edición, el zoom y la disposición viven en el navegador. Sin herramientas MCP específicas en esta versión. |
| **Presentaciones** (`presentaciones`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Lectura para cualquier miembro; edición para owner, admin, teacher y student; invitados en solo lectura. | El documento se guarda en `app_documents`; el editor, la vista previa y el modo presentación viven en el navegador. Sin herramientas MCP específicas en esta versión. |
| **Moléculas 3D** (`moleculas`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Todos los roles; la vista y la selección son locales. | La vista y la selección viven en el navegador; no hay documento persistente. Sin herramientas MCP específicas en esta versión. |
| **Líneas de tiempo** (`timeline`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Lectura para cualquier miembro; edición para owner, admin, teacher y student; invitados en solo lectura. | El documento se guarda en `app_documents`; el lienzo, el zoom y la edición viven en el navegador. Sin herramientas MCP específicas en esta versión. |
| **Hoja de cálculo** (`hoja-calculo`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Lectura para cualquier miembro; edición para owner, admin, teacher y student; invitados en solo lectura. | Datos, fórmulas y estilos se guardan en `app_documents`; la edición, el cálculo y la exportación CSV viven en el navegador. Sin herramientas MCP específicas en esta versión. |
| **Notas y documentos** (`documentos`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Lectura para cualquier miembro; edición para owner, admin, teacher y student; invitados en solo lectura. | Título y JSON de Tiptap se guardan en `app_documents`; la edición, los enlaces y la exportación HTML viven en el navegador. Sin herramientas MCP específicas en esta versión. |
| **Visor Office** (`visor-office`) | Sí, `abrir_app` | Sí, MCP-04 | No | No | No | Todos los roles; el archivo se abre en el navegador y no se comparte ni se guarda. | `.docx`, `.xlsx` y `.pptx` de hasta 30 MB en solo lectura; el archivo no se sube ni se persiste. Sin herramientas MCP específicas en esta versión. |

## Qué falta en cada app

### Excalidraw — MCP-05B (completado)

- Leer, escribir y añadir elementos en pizarras de tarea, proyecto y Tienda
  con `leer_pizarra`, `guardar_pizarra` y `anadir_a_pizarra`.
- Añadir texto, rectángulos, elipses y flechas con una lista acotada, sin pedir
  al agente el JSON interno, y conservar `appState`, `files` y los campos
  desconocidos de la escena.
- Mantener la revisión optimista, los permisos de pizarra y la publicación en
  `BoardRoom`; las escenas mayores de 1 MB se recogen por sondeo.
- No se exporta la imagen desde MCP: el render pertenece a la ventana.
- Cobertura funcional cerrada: no quedan huecos MCP para esta app. El resumen
  del roadmap está en el changelog.

### Programación por bloques — MCP-05D (completado)

- Leer y guardar el estado de `app_documents` con `leer_programa_bloques` y
  `guardar_programa_bloques`, con la misma serialización que la app.
- Validar la forma mínima `blocks.blocks[]`, el límite de 200.000 caracteres y
  el `403` de invitados; conservar los campos internos y no crear documento al
  leer.
- No se genera, ejecuta ni valida código en el servidor. La descarga JSON de la
  ventana ya queda cubierta por la lectura del estado; no necesita otra
  herramienta.
- Cobertura funcional cerrada: no quedan huecos MCP para esta app. El resumen
  del roadmap está en el changelog.

### Diagramas — MCP-05E (completado)

- Leer y guardar `{ code }` en `app_documents` con `leer_diagrama` y
  `guardar_diagrama`, con el mismo límite de 200.000 caracteres y el `403` de
  invitados. La lectura devuelve `{ codigo, actualizado }` o `null` sin crear
  documento, y la escritura conserva las claves internas.
- `listar_plantillas_diagrama` devuelve las seis plantillas con
  `{ id, nombre, codigo }` desde `lib/domain/mermaid/templates.ts`, la misma
  lista que usa el editor, sin exigir proyecto.
- No se valida sintaxis, no se renderiza SVG y no se exporta desde MCP; la
  vista previa y la descarga SVG son capacidades del navegador.
- Cobertura funcional cerrada: no quedan huecos MCP para esta app. El resumen
  del roadmap está en el changelog.

### Ajedrez — sin herramientas

- La partida, el tablero y el rival aleatorio viven en el navegador; no hay
  estado de servidor que leer o escribir.
- `abrir_app`, `listar_ventanas` y el control de ventanas siguen disponibles por
  las herramientas genéricas de MCP-04.
- No se añaden herramientas específicas: no hay documento de proyecto que
  guardar ni exportación que el servidor pueda producir.

### Tarjetas de repaso — sin herramientas

- Los mazos y las tarjetas son un documento JSON en `app_documents`, pero el
  repaso y el progreso FSRS viven en el navegador de cada persona.
- No se añaden herramientas MCP específicas en esta versión: leer o escribir el
  documento sin el progreso local daría una vista incompleta.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.

### Física 2D — sin herramientas

- La simulación, los presets y las escenas viven en el navegador; no hay estado
  de servidor que leer o escribir.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- No se añaden herramientas específicas en esta versión.

### Geometría interactiva — sin herramientas

- Las construcciones, los presets y las funciones viven en el navegador; la
  primera versión es efímera y no hay estado de servidor que leer o escribir.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- No se añaden herramientas específicas en esta versión.

### Mapas conceptuales — sin herramientas

- El mapa se guarda en `app_documents`, pero la edición, el zoom y la disposición
  viven en el navegador; no hay herramientas MCP específicas en esta versión.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- La lectura y escritura del documento se valorarán en un roadmap posterior.

### Presentaciones — sin herramientas

- El documento se guarda en `app_documents`, pero el editor, la vista previa y el
  modo presentación viven en el navegador; no hay herramientas MCP específicas
  en esta versión.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- La exportación HTML se queda en la ventana; no se genera desde MCP.

### Moléculas 3D — sin herramientas

- La vista, la molécula seleccionada y las etiquetas viven en el navegador; no
  hay un documento persistente ni herramientas MCP específicas en esta versión.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- La biblioteca de estructuras se sirve desde el bundle; no se consulta ningún
  servicio externo.

### Líneas de tiempo — sin herramientas

- El documento se guarda en `app_documents`, pero el lienzo, el zoom, la selección
  y la edición viven en el navegador; no hay herramientas MCP específicas en esta
  versión.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- Las plantillas y el rango visible se guardan con el documento; no se generan
  desde MCP.

### Notas y documentos — sin herramientas

- El título y el JSON de Tiptap se guardan en `app_documents`, pero la edición,
  los enlaces y la exportación HTML viven en el navegador; no hay herramientas
  MCP específicas en esta versión.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- El HTML se genera en la ventana y no se produce desde MCP.

### Visor Office — sin herramientas

- El archivo se elige en el navegador, se lee en memoria y se descarta al
  cerrar; no se sube, no se guarda en `app_documents` ni queda estado de
  servidor que leer o escribir.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- La lectura completa del canvas y la edición quedan fuera de esta versión; no
  se añaden herramientas MCP específicas.

### Hoja de cálculo — sin herramientas

- La hoja, sus fórmulas y sus estilos se guardan en `app_documents`, pero la
  edición, el recálculo y la exportación CSV viven en el navegador; no hay
  herramientas MCP específicas en esta versión.
- `abrir_app` y el control de ventanas siguen disponibles por MCP-04.
- La exportación CSV se genera en la ventana y no se produce desde MCP.

### Calculadora y Tabla periódica — MCP-05C (completado)

- `consultar_elemento` cubre la única consulta estable de Tabla periódica.
- La calculadora y las ecuaciones son interactivas, usan `compute-engine` y no
  tienen estado de servidor. No se trasladan al Worker en este roadmap.

## Revisión de huecos

- **Instalación y catálogo:** cubiertos por MCP-03.
- **Abrir y controlar ventanas:** cubiertos por MCP-04 para las dieciséis apps.
- **Lectura y escritura de contenido:** MCP-05B, MCP-05D y MCP-05E (completados).
- **Exportación:** no hay una herramienta dedicada. Excalidraw necesita render
  de imagen; Mermaid necesita render de SVG, aunque `leer_diagrama` ya devuelve
  el código; Blockly descarga el mismo JSON que devuelve
  `leer_programa_bloques`. Por eso no se crea una entrada nueva: las
  exportaciones visuales se quedan en la ventana y la exportación de datos no
  aporta nada sobre la lectura.
- **Otras acciones:** no aparecen acciones de app fuera de las anteriores. Este
  roadmap no añade entradas al backlog.

## Referencias

- [`roadmap.md`](../developing/roadmap.md): plantilla del próximo roadmap.
- [`changelog.md`](../developing/changelog.md): resumen de los roadmaps MCP-05B, MCP-05D y
  MCP-05E.
- [`backlog.md`](../developing/backlog.md): STORE-17 y DEV-01.
- [`apps/README.md`](apps/README.md): catálogo, licencias y
  versiones de las apps.
- [`../../app/board/apps/README.md`](../../app/board/apps/README.md): cómo se declara
  una app y su superficie MCP.
