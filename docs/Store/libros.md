# Libros escolares (STORE-02)

Catálogo de libros descargables de la vista «Libros» de Aula Store. Los
libros no son apps instalables: son contenido persistido en el bucket R2
(`site-creator-r2`, binding `BUCKET`) con su procedencia registrada, para
poder redistribuirlos legalmente y abrirlos en una ventana propia sin
salir de Aula Kanban.

## Catálogo

La fuente única es [`lib/books.ts`](../../lib/books.ts): cada ficha tiene
`id`, título, nivel (`ESO`/`Bachillerato`), curso, materia, fuente con su
URL original, licencia, atribución, formato (`pdf`), tamaño, y
`storageKey`/`version` de la copia persistida (`null` hasta la ingesta).

Cobertura inicial: Matemáticas de **Textos Marea Verde** (CC BY-NC-SA 3.0;
atribución «Textos Marea Verde (apuntesmareaverde.org.es)»):
ESO 1º–4º (4ºA/4ºB) y Bachillerato (Matemáticas I/II, CCSS I/II y
Generales), en PDF LOMLOE. Primaria e INTEF/EDIA (HTML/SCORM) quedan
para fases posteriores; no hay libro completo de Lengua ni de Inglés en
abierto.

## Política de licencias

- Ningún título entra sin licencia verificada. Los libros comerciales
  con copyright (Santillana, Anaya, SM, Oxford…) no se incluyen.
- Cada ficha muestra autor, fuente, URL original y licencia; la misma
  procedencia viaja en `GET /api/books` y se muestra en la vista Libros.
- Claves versionadas e inmutables (`books/<id>/<fecha>.pdf`): una copia
  nunca cambia; actualizar es ingerir una versión nueva.

## Ingesta

El script [`scripts/ingest-books.mjs`](../../scripts/ingest-books.mjs)
descarga el PDF de la fuente del catálogo, verifica su tamaño contra
`sizeBytes` (si la fuente cambió, aborta: actualiza el catálogo antes)
y lo sube a R2, marcando `storageKey` y `version` en `lib/books.ts`:

```bash
node scripts/ingest-books.mjs <bookId>        # un libro, R2 local
node scripts/ingest-books.mjs --all           # todos los pendientes
node scripts/ingest-books.mjs <bookId> --remote   # bucket de producción
```

- En local (por defecto) escribe en el R2 del dev server
  (`.wrangler/state-v20`); con `--remote` escribe en producción — eso lo
  hace Codex al publicar, nunca en comprobaciones locales.
- Tras ingerir, se commitea el cambio de `lib/books.ts` (clave y versión)
  junto con el resto del trabajo.
- `--force` reingiere un libro ya ingerido (nueva versión y nueva clave).

## Servido

- `GET /api/books?project=…` — catálogo con procedencia y disponibilidad
  (`available`, `url`); requiere membresía activa en el proyecto.
- `GET /api/books/<id>/file?project=…` — el PDF con su tamaño y caché
  inmutable de un año (clave versionada); 404 si no está ingerido, 503 si
  R2 no está configurado.
