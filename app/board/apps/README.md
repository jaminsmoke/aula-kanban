# Apps de Aula Store

Cada aplicación nativa vive en su propia carpeta:

```
apps/
  <id>/
    <id>-app.tsx      componente de la app (default export)
    <id>.css          estilos propios
    ...               helpers, datos y tests de la app
  registry.tsx        icono, componente lazy y roles de cada app
  types.ts            tipos de la interfaz (SpaceTool, SpaceRole…)
```

El catálogo visible en la tienda y los ids que acepta la API están en
`lib/native-apps.ts`, que es data pura y también se importa desde el servidor.
La API no debe tener su propia lista de ids: usa `NATIVE_APP_IDS`.

## Añadir una app

1. Crea `apps/<id>/` con su componente y sus estilos. No importes archivos de
   otras apps; si algo es común, súbelo a `app/board` o a `lib`.
2. Añade su id a `NATIVE_APP_IDS` y su ficha a `NATIVE_APPS` en
   `lib/native-apps.ts` (nombre, categoría, portada en `public/store`,
   características y tamaño de ventana).
3. Regístrala en `apps/registry.tsx`: icono en `ICONS` y componente lazy en
   `APPS`. El test `registry.test.ts` falla si falta alguno.
4. Si guarda un documento, usa `useAppDocument(projectId, appId)` y
   `/api/app-documents`: un estado JSON por proyecto y app. No crees una tabla
   ni una ruta nuevas salvo que el dato no encaje en ese modelo.

La carpeta se carga en diferido: su código solo se descarga al abrir la
ventana. El estado instalado/desinstalado es común a todas las apps y vive en
`instance_apps`; no hace falta implementarlo de nuevo.

## Tamaño y estado

- `window` en la ficha define el tamaño inicial de la ventana.
- Los roles se aplican en `visibleTools`; hoy todas las apps son visibles para
  todos los roles.
- La tienda solo pinta el catálogo; instalar o desinstalar llama a
  `/api/space-apps`.
- `useAppDocument` lee y guarda en `app_documents`. Cada aplicación decide
  si necesita implementar además un respaldo local por proyecto.
