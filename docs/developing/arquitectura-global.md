# Arquitectura global del tablero

> **Estado:** ARC-01 a ARC-14 completados; ADOC-18, ADOC-19, ADOC-20 y ADOC-22 completados; UI-12, TASK-01, TASK-02, TASK-03, TASK-04, PERM-04, UI-15 y UI-16 completados; TASK-05 activo · **Fecha:** 2026-11-22
> **Alcance:** `app/board`, `app/api`, `lib/domain`, `lib/server`, estilos y pruebas.
> **Referencia:** la descomposición de Aula Documentos en ADOC-15 se toma como piloto, no como plantilla rígida.

## 1. Resumen

Aula Documentos ya tiene una separación útil: shell mínimo, modelo de vista, hooks por flujo, componentes, estilos divididos y pruebas por comportamiento. El resto del tablero no sigue el mismo nivel de aislamiento. El problema principal ya no es un archivo de 3.000 líneas: es la **ausencia de contratos comunes** para apps, estado de cliente, UI compartida, CSS y pruebas.

Métricas actuales:

| Área | Archivos | Líneas |
|---|---:|---:|
| `app/board/apps` | 138 | 23.202 |
| `app/board/shared` | 66 | 6.978 |
| `app/board` completo | 339 | 41.488 |
| `lib/domain` | 69 | 7.869 |
| `lib/server` | 138 | 14.224 |
| `app/api` | 52 | 4.188 |
| CSS | 48 | 9.128 |
| Pruebas | 227 | 20.417 |

Presupuesto final de referencia: `aula-documentos` **369.596 / 370.000 B gzip**; export **329.693 / 340.000**; Office **196.481 / 210.000**.

## 2. Mapa por niveles

### Nivel 0 · Composición del tablero

`app/board/board.tsx`, `app/board/layout/`, `app/board/store/`, `app/board/shared/use-board-data.ts` y `use-board-url.ts`.

Responsabilidad: ventanas, foco, URL, datos del tablero, temas y shell. No debe contener lógica de una app concreta.

### Nivel 1 · Apps

Cada carpeta de `app/board/apps/<app>/` debe ser una unidad con:

```text
<app>/
  <app>-app.tsx          # shell de composición
  components/            # UI propia
  hooks/                 # estado y flujos
  model/ o <app>-model.ts
  utils/
  styles/                # si supera un archivo razonable
  __tests__/             # flujos, no un archivo de 1.000 líneas
```

Estado actual:

| App | Archivos | Líneas | Señal |
|---|---:|---:|---|
| Aula Documentos | 43 | 9.508 | Piloto; shell de 20 líneas |
| Hoja de cálculo | 9 | 2.055 | `app.tsx` 525 + fórmula 515 |
| Timeline | 4 | 1.686 | `app.tsx` 676 |
| Tarjetas | 7 | 1.316 | `app.tsx` 415 y CSS 547 |
| Moléculas | 6 | 1.116 | app 324 |
| Mapas | 5 | 1.082 | app 339 |
| Ajedrez | 5 | 836 | app 284 |
| Geometría | 5 | 785 | app 349 |

### Nivel 2 · Compartido de tablero

`app/board/shared/` debe contener solo lo que tenga dos consumidores reales o una justificación escrita.

Ya funciona: `useAppDocument`, `useWindowCloseGuard`, `useBoardUrl`, `Modal`, `download` y `date`.

Deuda detectada:

- ARC-08 Fase 1 inventarió los consumidores y destinos de `shared/aula-documentos`, `shared/office` y `shared/mermaid`: [`shared-consumidores.md`](shared-consumidores.md).
- ARC-09 Fase 1 fijó el contrato de guardado con versión y el piloto de Hoja de cálculo: [`guardado-versionado.md`](guardado-versionado.md).
- El sistema de borradores versionados se retiró en ARC-03 Fase 1: no tenía consumidores de producto y solo se mantenía por sus pruebas.
- Los diálogos de cambios sin guardar y conflicto de versión se retiraron con el sistema; Aula Documentos conserva sus propios diálogos de cierre y conflicto.
- Calculadora, tema, Blockly, Tarjetas y recuperación de Aula usan el contrato local de ARC-03; solo el script de arranque temprano del tema conserva una lectura directa justificada.
- El selector de archivo sigue siendo local a Aula; no hay que extraerlo hasta que otra app lo necesite.

### Nivel 3 · Dominio

`lib/domain/<dominio>/` contiene reglas puras. Aula ya tiene modelo, Markdown, copias, presentación, texto y migración separados.

Prioridad:

- `lib/domain/aula-documentos/document.ts` tiene 655 líneas; separar normalización, validación de tablas y tipos.
- Revisar `lib/domain/mcp-catalogo.ts` (503) y `demo-data.ts` (455) por mezcla de datos y lógica.
- Revisar duplicación de `formatNumber`, `presetInfo` y utilidades de fechas entre apps.

### Nivel 4 · Servidor

`lib/server/` tiene 14.224 líneas y 138 archivos. La dirección es correcta: rutas de `app/api` delegan en servicios, no al contrario.

Deuda:

- Conviven `lib/server/mcp/dominios`, `lib/server/tasks`, `lib/server/people`, `lib/server/uploads` y módulos sueltos.
- Hay que documentar qué es un servicio, qué es un repositorio D1/R2 y qué es un helper HTTP.
- Revisar `storage.ts` (320 líneas), cuotas, purgas y rutas que comparten validación.

### Nivel 5 · API

52 archivos / 4.188 líneas. Debe quedar como adaptador fino: autenticación, validación de entrada, llamada al servicio y respuesta HTTP. No debe contener reglas de negocio duplicadas.

### Nivel 6 · Estilos y pruebas

- 48 archivos CSS / 9.128 líneas. El mayor es `app/portada.css` (628), seguido de `tarjetas.css` (547), `office-viewer.css` (444), `globals.css` (439) y `timeline.css` (437).
- No hay una capa declarada de tokens → primitivas → layout → app. Cada app resuelve botones, tarjetas, estados vacíos y modales a su manera.
- Pruebas: 227 archivos / 20.417 líneas. La división de Aula funciona, pero repite unas 190 líneas de mocks y setup en cinco archivos.

## 3. Hallazgos priorizados

| Prioridad | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| P0 | El MCP de CodArch estaba enganchado a otro repositorio | La configuración global de OpenCode ejecutaba `codarch-mcp` con `--root` apuntando a `Visual Software Architecture`; este repo no tiene `.codarch.yml` | Herramientas y diagnósticos ajenos contaminan las decisiones; ya se retiró del catálogo activo |
| P0 | Apps monolíticas restantes | Timeline 676, Hoja 525, Office viewer 543, Office export 525, Tarjetas 415 | Cambios pequeños obligan a recorrer archivos grandes |
| P1 | Sistema de borradores versionados muerto | `useVersionedDraft` y sus dos diálogos no tenían consumidores reales | Retirado en ARC-03 Fase 1: 1.694 líneas menos |
| P1 | Persistencia local sin contrato | Calculadora, Blockly, Tarjetas, tema y recuperación usaban `localStorage` por separado | Resuelto en ARC-03 con un contrato versionado único |
| P1 | CSS sin capas | 48 archivos; primitivas y estilos de app mezclados | Resuelto en ARC-04: tokens, primitivas, layout y estilos ordenados |
| P1 | Pruebas duplicadas | Cinco archivos de Aula repiten casi todo el setup | Resuelto en ARC-05: harness y seis tests migrados |
| P2 | Dominio grande | `document.ts` 655 líneas | Normalización, tablas y tipos acoplados |
| P2 | Servidor sin mapa explícito | 139 archivos en `lib/server` | Resuelto en ARC-06 con `server-map.md`, rutas finas y auditoría de almacenamiento |
| P2 | Falta de análisis de código muerto | No hay `knip`, `ts-prune` ni equivalente | Resuelto en ARC-05 con checker local y baseline |
| P2 | Presupuesto de Aula muy ajustado | 369.351 / 370.000 | Presupuesto por app/flujo en ARC-05; cualquier crecimiento sigue siendo una puerta |

## 4. Árbol objetivo

```text
app/board/
  shell/                    # layout, ventanas, URL, tema, datos del tablero
  apps/
    <app>/
      <app>-app.tsx
      components/
      hooks/
      model/
      styles/
      __tests__/
  shared/
    ui/                     # Modal, botones, estados vacíos, file picker si hay 2 consumidores
    data/                   # storage, versioned document, API client
    documents/              # piezas documentales compartidas
  styles/                   # tokens, base, layout y utilidades globales
lib/
  domain/<dominio>/         # reglas puras y tests
  server/<dominio>/         # repositorios, servicios, HTTP
app/api/                    # adaptadores finos
```

Reglas:

1. `app/board/apps` puede importar `app/board/shared` y `lib`.
2. `app/board/shared` puede importar `lib` y `lib/domain`; nunca una app.
3. `lib/domain` no importa React, `app` ni `lib/server`.
4. `lib/server` no importa `app`; las rutas importan servicios.
5. Una utilidad compartida necesita dos consumidores reales o justificación escrita.
6. Los archivos nuevos respetan presupuestos: shell <450, componentes/hooks <600, CSS <500, pruebas <600.
7. Las apps no comparten estado por módulos globales; comparten contratos.

## 5. Inventario y línea base

El inventario inicial de ARC-01 (sin pruebas) queda en:

- **357 archivos de producto**, **907 imports locales**.
- Capas: apps 76 archivos / 14.328 líneas; features 76 / 6.752; shared 39 / 4.962; dominio 40 / 6.198; servidor 88 / 9.902; API 26 / 1.357; infraestructura D1 2 / 337; shell 4 / 476.
- **5 violaciones base**: cinco vistas de features importan primitivas de `app/board/layout`.
- **0 ciclos base**: el tipo `ChatGPTUser` se movió a `lib/server/auth-user.ts` y se rompió el ciclo `auth ↔ demo`.
- **3 archivos por encima de 600 líneas**: Timeline, `document.ts` y `mermaid-block.tsx`.
- **2 CSS por encima de 500**: `portada.css` y `tarjetas.css`.
- `app/theme.ts` se clasifica como shared legado hasta moverlo a `app/board/shared/ui/`.

La línea base está en [`arch-baseline.json`](arch-baseline.json). El checker local ya la consume con `npm run arch:check` (o `npm run arch:check -- --json`), acepta solo estas excepciones y falla ante cualquier violación nueva.

Reglas de dirección confirmadas:

| Origen | Puede importar | No puede importar |
|---|---|---|
| `shell` | apps, features, shared, lib, dominio | — |
| `features` | shared, lib, dominio; solo `apps/registry.tsx` y `apps/types.ts` de apps | implementaciones de apps, shell |
| `apps` | shared, lib, dominio | features, shell |
| `shared` | lib, dominio | apps, features, shell, API |
| `api` | lib, dominio, server, infraestructura | apps, features, shell, UI compartida |
| `server` | dominio, lib, infraestructura | apps, features, shell, API |
| `infraestructura` | lib, dominio | apps, features, shell, API |
| `domain` | lib puro | React, app, API, server, features, shell |

### Cómo añadir una app

1. Crear `app/board/apps/<app>/` con `app.tsx`, componentes, hooks, modelo y estilos propios.
2. Registrar la app en `app/board/apps/registry.tsx` y en los metadatos de `lib/native-apps.ts`.
3. Añadir sus pruebas junto al código y una prueba de flujo si toca persistencia o permisos.
4. Ejecutar `npm run arch:check`; no se puede importar otra app ni el shell.
5. Si necesita una excepción, añadirla a `arch-baseline.json` con dueño, motivo y caducidad.

### Cómo retirar una excepción

1. Corregir la dependencia o dividir el archivo.
2. Eliminar su entrada de `arch-baseline.json`.
3. Ejecutar `npm run arch:check` y la suite.
4. Si vuelve a aparecer, la excepción no se recupera: se documenta una nueva decisión.

## 6. Programa propuesto

| ID | Bloque | Resultado |
|---|---|---|
| ARC-01 | Contratos, mapa de capas y verificación local | Reglas ejecutables sin depender de un MCP externo |
| ARC-02 | Descomposición de apps restantes | Timeline, Hoja, Tarjetas y Office con shell/hooks/componentes |
| ARC-03 | Estado de cliente y persistencia | Un contrato para storage, autosave y recuperación; retirar o rescatar borradores |
| ARC-04 | Sistema visual y CSS | Tokens, primitivas, capas y revisión responsive |
| ARC-05 | Pruebas, harness y presupuestos | Setup compartido, detección de código muerto y límites |
| ARC-06 | Cierre de deuda y servidor | Módulos muertos fuera, mapa de `lib/server` y rutas finas |

Orden recomendado: **ARC-01 → ARC-03 → ARC-02 → ARC-04 → ARC-05 → ARC-06**. ARC-01 desbloquea todo; ARC-03 elimina ruido y deuda antes de trocear apps.

## 7. Criterios de salida del programa

- La arquitectura local se verifica con un script o configuración dentro del repo y falla ante imports prohibidos y ciclos; ninguna herramienta MCP apunta a una raíz externa.
- Cada app tiene un shell reconocible y ningún archivo de producto supera los límites acordados.
- No hay módulos de producto sin consumidores ni helpers duplicados sin justificación.
- El CSS tiene una capa de tokens/primitivas y una revisión de cinco anchos y dos temas.
- Las pruebas comparten setup sin perder aislamiento y los presupuestos siguen pasando.
- La documentación explica dónde vive cada responsabilidad y cómo añadir una app nueva.

## 8. Estado tras ARC-01, DEV-02 y ARC-02

- `npm run arch:check` y `npm run check` están disponibles; CI ejecuta `arch:check`.
- Resultado actual: **465 archivos de producto / 1.170 imports / 0 violaciones base / 0 ciclos / 0 problemas nuevos**.
- No quedan excepciones de tamaño ni dependencias `features → layout`; el layout compartido vive en `app/board/shared/ui/`.
- El ciclo `auth ↔ demo` se eliminó con `lib/server/auth-user.ts`.
- La configuración global de CodArch se retiró. DEV-02 quedó cerrado con el guard de MCP por repositorio, el inventario en [`mcp-tooling-audit.md`](mcp-tooling-audit.md) y la plantilla local [`mcp-project.example.json`](mcp-project.example.json).
- ARC-02 quedó cerrado y archivado en [`historial/roadmap-arc-02.md`](../historial/roadmap-arc-02.md): Timeline, Hoja de cálculo, Office, Tarjetas y el residual de Aula Documentos tienen shell, hooks y componentes separados.
- ARC-03 quedó cerrado y archivado en [`historial/roadmap-arc-03.md`](../historial/roadmap-arc-03.md): el estado local usa un contrato versionado único y `useAppDocument` sigue siendo la persistencia de documentos compartidos.
- ARC-04 quedó cerrado y archivado en [`historial/roadmap-arc-04.md`](../historial/roadmap-arc-04.md): tokens, primitivas, layout, estilos de app y revisión responsive están ordenados; `baselineViolations` y `largeCss` quedan vacíos.
- ARC-05 quedó cerrado y archivado en [`historial/roadmap-arc-05.md`](../historial/roadmap-arc-05.md): harness explícito, checker de código muerto y presupuestos por app/flujo.
- ARC-06 quedó cerrado y archivado en [`historial/roadmap-arc-06.md`](../historial/roadmap-arc-06.md): mapa del servidor, adaptadores API finos y auditoría de cuotas, purgas y almacenamiento.
- ADOC-16 quedó cerrado y archivado en [`historial/roadmap-adoc-16.md`](../historial/roadmap-adoc-16.md): importación unificada y matriz de formatos.
- ADOC-17 quedó cerrado y archivado en [`historial/roadmap-adoc-17.md`](../historial/roadmap-adoc-17.md): suite de varios documentos, migración `legacy`, URL por documento y MCP con `documentoId`.
- ADOC-18 quedó cerrado y archivado en [`historial/roadmap-adoc-18.md`](../historial/roadmap-adoc-18.md): búsqueda y reemplazo, esquema de títulos, navegación de diapositivas, enfoque y accesibilidad.
- ADOC-19 quedó cerrado y archivado en [`historial/roadmap-adoc-19.md`](../historial/roadmap-adoc-19.md): estructura editable de diapositivas, presentador, ajustes de página y PDF de calidad.
- ADOC-20 quedó cerrado y archivado en [`historial/roadmap-adoc-20.md`](../historial/roadmap-adoc-20.md): comentarios anclados, hilos, historial de versiones, permisos, exportación opcional y retención.
- ARC-10 quedó cerrado y archivado en [`historial/roadmap-arc-10.md`](../historial/roadmap-arc-10.md): copia unidireccional de una selección de Hoja de cálculo a una tabla de Aula Documentos sin retirar ninguna app.
- ARC-11 quedó cerrado y archivado en [`historial/roadmap-arc-11.md`](../historial/roadmap-arc-11.md): la petición versionada y las transiciones de versión y carga fallida viven en `useAppDocument`, sin cambiar los contratos de las apps.
- ARC-12 quedó cerrado y archivado en [`historial/roadmap-arc-12.md`](../historial/roadmap-arc-12.md): el contexto de Aula Documentos solo reenvía campos con consumidores y el modelo conserva las acciones internas.
- ARC-13 quedó cerrado y archivado en [`historial/roadmap-arc-13.md`](../historial/roadmap-arc-13.md): las ventanas comparten la base `.app-window` sin perder `container-name`, variables locales, foco ni scroll; Calculadora ya no duplica `.edu-app` y el CSS neto baja **117 líneas**.
- ARC-14 quedó cerrado y archivado en [`historial/roadmap-arc-14.md`](../historial/roadmap-arc-14.md): Markdown y documento serializado tienen una sola definición y un validador compartido; los valores, mensajes y estados no cambiaron.
- ADOC-22 quedó cerrado y archivado en [`historial/roadmap-adoc-22.md`](../historial/roadmap-adoc-22.md): la apertura de una suite vacía muestra preparación, bloquea «Nuevo», prioriza el error y permite reintentar sin duplicar documentos.
- UI-12 quedó cerrado y archivado en [`historial/roadmap-ui-12.md`](../historial/roadmap-ui-12.md): las tareas del calendario se abren con Tab, Enter o Espacio y el foco vuelve al evento al cerrar la ficha.
- TASK-01 quedó cerrado y archivado en [`historial/roadmap-task-01.md`](../historial/roadmap-task-01.md): una tarea vincula un documento del proyecto y lo abre en Aula Documentos con `doc`; la migración local está preparada y no se aplicó en remoto.
- TASK-02 quedó cerrado y archivado en [`historial/roadmap-task-02.md`](../historial/roadmap-task-02.md): la ficha editable abre el documento y vuelve a la tarea tras cerrar Aula Documentos, conservando vista y filtros; cubre permisos, Calendario y cambios de revisión.
- TASK-03 quedó cerrado y archivado en [`historial/roadmap-task-03.md`](../historial/roadmap-task-03.md): la ficha de tarea detecta cambios pendientes, comparte la guarda en Esc/X/Cancelar y conserva el borrador al elegir **Seguir editando**.
- TASK-04 quedó cerrado y archivado en [`historial/roadmap-task-04.md`](../historial/roadmap-task-04.md): una tarea libre muestra **Asignarme** y usa la ficha propia para asignar y guardar en una sola acción, con permisos y conflicto de revisión.
- PERM-04 quedó cerrado y archivado en [`historial/roadmap-perm-04.md`](../historial/roadmap-perm-04.md): Almacenamiento, Administradores y Permisos sobreviven a la recarga con acceso y la redirección a Cuenta espera a la comprobación cuando falta permiso.
- UI-15 quedó cerrado y archivado en [`historial/roadmap-ui-15.md`](../historial/roadmap-ui-15.md): tablero y Aula Store buscan sin tildes, mayúsculas ni espacios exteriores, y el tablero ofrece **Limpiar filtros** cuando no hay coincidencias.
- UI-16 quedó cerrado y archivado en [`historial/roadmap-ui-16.md`](../historial/roadmap-ui-16.md): la ficha de alumno compacta la cabecera, oculta datos vacíos y ordena tareas vencidas, próximas, sin fecha y completadas.
- TASK-05 está activo en [`roadmap.md`](roadmap.md): añadir **Mis tareas** con la ficha vinculada y marcar las tareas pendientes vencidas.
