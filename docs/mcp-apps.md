# Cobertura MCP de las apps nativas

Estado de la superficie MCP de las cuatro apps de Aula Store. La fuente de las
herramientas es `lib/server/mcp/apps/registro.ts`; la instalación y los permisos
se resuelven con `lib/server/mcp/apps/contrato.ts`.

**Última revisión:** 2026-11-15 · **Catálogo:** `0.26.0` · **59 herramientas**

**Estado:** MCP-05B, MCP-05D y MCP-05E cerrados; las cuatro apps tienen cobertura MCP.

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
- **Herramientas de aula (MCP-05C):** `consultar_elemento`.
- **Programación por bloques (MCP-05D):** `leer_programa_bloques` y
  `guardar_programa_bloques`. Leer requiere acceso al proyecto; escribir exige
  permiso y los invitados no escriben.
- **Diagramas (MCP-05E):** `leer_diagrama`, `guardar_diagrama` y
  `listar_plantillas_diagrama`. Leer y listar plantillas no requieren escritura;
  guardar exige permiso y los invitados no escriben.

`abrir_app` y `listar_ventanas` son de lectura; cerrar, minimizar, restaurar y
ampliar son de escritura, pero no destructivas. Los invitados pueden abrir y
controlar sus propias ventanas; la escritura de contenido de las apps sigue las
reglas de cada app.

## Matriz por app

| App | Abrir | Ventana | Leer por MCP | Escribir por MCP | Exportar por MCP | Permisos | Límites |
|---|---|---|---|---|---|---|---|
| **Excalidraw** (`excalidraw`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `leer_pizarra` | Sí, `guardar_pizarra` y `anadir_a_pizarra` | No; la ventana exporta imagen | Leer: cualquier miembro. Escribir: no invitados; el alumnado solo en pizarras de sus tareas. La ventana de Mi espacio es de solo lectura para alumnado e invitados. | Snapshot de hasta 2 MB con revisión optimista; `409` con `revisionActual` si cambió. La publicación en vivo admite hasta 1 MB; las escenas mayores se recogen por sondeo. |
| **Herramientas de aula** (`edu-tools`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `consultar_elemento` | No | No | Cualquier cuenta autenticada, incluidas invitadas y cuentas sin proyecto, si la app está instalada. La consulta no usa proyecto. | Una ficha por llamada entre 118 elementos. No hay estado de trabajo en el servidor; calculadora, memoria, medición y voz viven en el navegador. |
| **Programación por bloques** (`blockly`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `leer_programa_bloques` | Sí, `guardar_programa_bloques` | No; la ventana descarga JSON | Lectura: cualquier miembro. Escritura: no invitados; el alumnado puede guardar el documento del proyecto. | Estado JSON de hasta 200.000 caracteres. Sin revisión optimista: la última escritura gana. |
| **Diagramas** (`mermaid`) | Sí, `abrir_app` | Sí, MCP-04 | Sí, `leer_diagrama` y `listar_plantillas_diagrama` | Sí, `guardar_diagrama` | No; la ventana exporta SVG | Lectura y plantillas: cualquier miembro con acceso, o cualquier cuenta autenticada para las plantillas si la app está instalada. Escritura: no invitados; el alumnado puede guardar el documento del proyecto. | Código de hasta 200.000 caracteres. Sin revisión optimista: la última escritura gana. La validación y el render de Mermaid se quedan en el navegador. |

## Qué falta en cada app

### Excalidraw — MCP-05B (completado)

- Leer, escribir y añadir elementos en pizarras de tarea, proyecto y Mi espacio
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

### Herramientas de aula — sin entrada nueva

- `consultar_elemento` cubre la única consulta estable de la app.
- Calculadora, ecuaciones, medición y lectura en voz alta son interactivas,
  usan `compute-engine` o la voz del sistema y no tienen estado de servidor. No
  se trasladan al Worker en este roadmap.

## Revisión de huecos

- **Instalación y catálogo:** cubiertos por MCP-03.
- **Abrir y controlar ventanas:** cubiertos por MCP-04 para las cuatro apps.
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

- [`roadmap.md`](roadmap.md): plantilla del próximo roadmap.
- [`changelog.md`](changelog.md): resumen de los roadmaps MCP-05B, MCP-05D y
  MCP-05E.
- [`backlog.md`](backlog.md): PER-03, PER-01B, PER-02 y SYNC-01.
- [`aplicaciones-nativas.md`](aplicaciones-nativas.md): catálogo, licencias y
  versiones de las apps.
- [`../app/board/apps/README.md`](../app/board/apps/README.md): cómo se declara
  una app y su superficie MCP.
