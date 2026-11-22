# Apps de Aula Store

Cada aplicación nativa vive en su propia carpeta:

```
apps/
  <id>/
    <id>-app.tsx      componente de la app (default export)
    <id>.css          estilos propios
    ...               helpers, datos y tests de la app
  registry.tsx        icono, componente lazy y roles de cada app
  types.ts            tipos de la interfaz (StoreTool, StoreRole…)
```

El catálogo visible en la tienda y los ids que acepta la API están en
`lib/native-apps.ts`, que es data pura y también se importa desde el servidor.
La API no debe tener su propia lista de ids: usa `NATIVE_APP_IDS`.

La interfaz que reutilizan consumidores independientes vive en
`app/board/shared/`, agrupada por capacidad. Las reglas puras van en
`lib/domain` y los servicios de persistencia en `lib/server`. Por ejemplo,
Excalidraw y las pizarras de tareas usan `shared/whiteboard`. Cada app conserva
su entrada, su experiencia de edición y sus pruebas.

## Añadir una app

1. Crea `apps/<id>/` con su componente y sus estilos. No importes archivos de
   otras apps; si algo es común, súbelo a `app/board` o a `lib`.
2. Añade su id a `NATIVE_APP_IDS` y su ficha a `NATIVE_APPS` en
   `lib/native-apps.ts` (nombre, categoría, portada en `public/store`,
   características y tamaño de ventana).
3. Regístrala en `apps/registry.tsx`: icono en `ICONS` y componente lazy en
   `APPS`. El test `registry.test.ts` falla si falta alguno.
4. Para el estado de una app por proyecto, usa `useAppDocument(projectId, appId)`
   y `/api/app-documents`. Para ediciones nuevas, usa `saveVersioned` con la
   versión devuelta por `load` y gestiona el conflicto en la app. Si el dato
   tiene otro modelo, como varios documentos por proyecto en Aula Documentos,
   documenta su contrato y conserva su API específica.
5. Declara su superficie MCP en `lib/server/mcp/apps/registro.ts`. No pongas
   herramientas MCP en `app/board/apps/<id>/`: `lib` no puede importar desde
   `app` y la frontera está bloqueada por ESLint.

La carpeta se carga en diferido: su código solo se descarga al abrir la
ventana. El estado instalado/desinstalado es común a todas las apps y vive en
`instance_apps`; no hace falta implementarlo de nuevo.

## MCP

Las herramientas MCP de una app viven en `lib/server/mcp/apps/`. Cada app
declara una entrada en `APP_MCP_DECLARACIONES`; si todavía no tiene
herramientas, indica un `pendiente` y el test de cobertura lo exige. Para
resolver instalación y permisos, usa `resolverAppInstalada` (consultas de app
sin proyecto) o `resolverAppEnProyecto` (con proyecto y escritura opcional) de
`contrato.ts`. No dupliques la comprobación de instalación ni el mensaje de
`not_found`.

La cobertura actual, los permisos, los límites y lo que queda pendiente en cada
app están en [`docs/Store/mcp-apps.md`](../../../docs/Store/mcp-apps.md).

## Versiones

Cada ficha de `lib/native-apps.ts` declara:

- `appVersion`: versión de nuestra integración; empieza en `1.0.0`.
- `versionLabel`: etiqueta opcional para la ficha; si falta, se usa el nombre de la app.
- `upstream`: paquete principal y versión exacta instalada; opcional si la integración es propia.
- `extras`: librerías adicionales que añade nuestra integración, si las hay.

La versión de Aula Store vive en `AULA_STORE_VERSION` y se muestra en la cabecera de la tienda. La versión del Site es independiente. La política de incremento está en [`docs/Store/apps/README.md`](../../../docs/Store/apps/README.md#versiones) y la tabla por app en [`docs/Store/apps/integradas.md`](../../../docs/Store/apps/integradas.md#versiones-por-app).

## Tamaño y estado

- `window` en la ficha define el tamaño inicial de la ventana.
- Los roles se aplican en `visibleTools`; hoy todas las apps son visibles para
  todos los roles.
- La tienda solo pinta el catálogo; instalar o desinstalar llama a
  `/api/space-apps`.
- `useAppDocument` ofrece lectura, guardado y guardado con versión. Cada
  aplicación decide cuándo guardar, cómo mostrar conflictos y si necesita
  recuperación local.
