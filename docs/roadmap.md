# Roadmap PER-01B · Inventario de R2 y copias antiguas

> **Backlog:** PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md).
> **Inicio:** 2026-11-15 · **Estado:** En curso

---

## 1. Objetivo

- [ ] Enumerar el bucket R2 de forma paginada y protegida para administración, cotejarlo con `uploads` y documentar el destino de cada objeto sin fila o copia antigua.
- [ ] Criterio de éxito: el propietario o un administrador recorre todos los objetos por páginas y ve cuáles tienen fila, cuáles no y qué filas no tienen objeto; nada se borra ni se modifica; cada huérfano queda identificado con clave, tamaño y fecha, con una decisión documentada.

## 2. Alcance

**Dentro:**
- Listado paginado de R2 por cursor, con tope de página y metadatos mínimos (clave, tamaño, fecha y etag).
- Cotejo exacto por `storage_key` con `uploads` y clasificación: con fila, objeto sin fila, fila sin objeto y clave que requiere revisión.
- Lectura de solo lectura protegida para propietario o administración mediante `GET /api/storage/inventory`.
- Panel en Ajustes > Almacenamiento con revisión explícita, paginación y recuentos, sin acciones de borrado.
- Documento de hallazgos con el destino de cada objeto sin fila o copia antigua.
- Pruebas de paginación, permisos, claves exactas, filas sin objeto, objetos huérfanos y bucket ausente.

**Fuera de alcance:**
- Borrar, mover o reescribir objetos de R2; la limpieza de huérfanos con fila ya la cubre PER-03.
- Recuperar copias antiguas adivinando claves o inventando correspondencias.
- Descargar cuerpos, firmar URLs o exponer contenido binario.
- Cambiar el esquema de `uploads`, las claves de `storeUpload` o los límites de subida.
- Miniaturas (PER-02), tareas programadas o migraciones.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Recorrer R2 con `list` paginado como fuente de objetos | inferir los objetos desde `uploads` | el diagnóstico actual solo comprueba una lectura mínima; hace falta enumerar el bucket real. |
| Cotejar por `storage_key` exacta | comparar por id, URL o prefijo | una copia antigua puede conservar la clave o tener otra; el prefijo no demuestra propiedad ni equivalencia. |
| Solo lectura, sin botón de borrar | limpiar objetos sin fila desde el panel | sin identificar su origen, borrar un objeto desconocido puede eliminar la única copia. |
| Revisión bajo demanda | listar el bucket al abrir Ajustes | evita coste y latencia en cada visita y deja claro cuándo se consulta R2. |
| Página de 100 y cursor opaco | devolver el bucket completo de una vez | R2 entrega páginas y un bucket grande no cabe en una respuesta. |
| Metadatos mínimos, sin cuerpos | firmar URLs de descarga | el objetivo es inventariar; el contenido sigue en `/api/files/{id}` con permisos de proyecto. |
| Clasificar claves fuera del formato como «revisar» | tratarlas como huérfanas borrables | una clave antigua puede ser legítima; se documenta y se decide a mano. |

## 4. Fases

### Fase 1: Listado paginado del bucket

- [x] Crear un clasificador puro en `lib/domain/uploads/inventory.ts` que reciba objetos y filas y devuelva `con_fila`, `objeto_sin_fila`, `fila_sin_objeto` y `clave_revisar`, con recuentos.
- [x] Implementar `listBucketPage({ cursor, limit })` en `lib/server/storage.ts` sobre `env.BUCKET.list`, con tope de 100 y devolución de `truncated`/`cursor`.
- [x] Cubrir página completa, última página, bucket vacío y R2 ausente con dobles.
- **Criterios de aceptación:** el listado no modifica R2 ni D1; una clave repetida o una fila sin objeto no se confunden; el cursor solo se devuelve cuando R2 indica que hay más.
- **Estado:** Completada el 2026-11-15. `lib/domain/uploads/inventory.ts` clasifica objetos con fila, huérfanos, filas sin objeto y claves a revisar, con recuentos; `listBucketPage` pagina R2 con tope de 100, adapta los metadatos y solo devuelve cursor si hay más. 9 pruebas nuevas (5 del clasificador y 4 del listado), `tsc` y lint en verde.

### Fase 2: Cotejo con D1 y endpoint

- [ ] Cruzar cada página con `uploads` por `storage_key` exacta y detectar además las filas de la instancia que no tienen objeto.
- [ ] Exponer `GET /api/storage/inventory?cursor=&limit=` para propietario o administración, con mismo origen de lectura, 401/403/503 y sin cuerpos.
- [ ] Devolver recuentos, metadatos de cada clave y una marca de revisión para las claves fuera del formato `proyecto/finalidad/id.ext`.
- [ ] Cubrir permisos, paginación encadenada, claves desconocidas, filas sin objeto y R2 ausente.
- **Criterios de aceptación:** una clave antigua no se presenta como borrable; el endpoint no devuelve contenido ni URLs firmadas; el cotejo es exacto y repetible.

### Fase 3: Panel, hallazgos y cierre

- [ ] Añadir al panel de Almacenamiento la revisión paginada con recuentos y aviso de solo lectura, sin botones de borrado.
- [ ] Documentar en el README el uso, el tope de página, la clasificación y que cada huérfano requiere revisión manual.
- [ ] Registrar en el changelog el resultado real de la revisión —objetos, filas y copias antiguas— o «no hay objetos» si el bucket está vacío, sin inventar claves.
- [ ] Ejecutar lint, `tsc`, tests y build; cerrar el roadmap y reiniciar `docs/roadmap.md`.
- **Criterios de aceptación:** el panel no borra nada; la revisión queda documentada con evidencia; la suite y el build están en verde; no se añaden entradas al backlog.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Bucket con muchos objetos | respuesta lenta o incompleta | cursor, tope de 100 y aviso de que hay más páginas. |
| Claves que revelan proyectos | exposición de infraestructura | solo propietario o administración; metadatos mínimos y sin cuerpos. |
| Falso huérfano por una clave antigua | pérdida si alguien lo borra | clasificar como «revisar», no como huérfano borrable, y documentarlo. |
| R2 intermitente | un inventario falso o incompleto | responder 503 y no cachear el resultado como válido. |
| Confundir auditoría con purga | borrar desde el panel equivocado | este roadmap es de solo lectura; la purga ya está separada en Ajustes y en PER-03. |
| Copia antigua en otro prefijo | claves sin correspondencia | documentar el hallazgo y pedir una decisión; no migrar ni borrar automáticamente. |

## 6. Notas de sesión

- Base: PER-03 cerrado; la purga de huérfanos con fila ya es manual, con simulación y 7 días de gracia.
- `uploads.storage_key` guarda la clave exacta y `storeUpload` genera `proyecto/finalidad/id.ext`.
- El diagnóstico actual solo llama a `BUCKET.list({ limit: 1 })`; este roadmap añade el recorrido real del bucket.
- El roadmap anterior de PER-01 se conserva en [`historial/roadmap-per-01.md`](historial/roadmap-per-01.md).
- No se cambia la versión del Site (`1.1.27`) ni se publica en Sites durante el roadmap.
- El push a GitHub se decide al cerrar, según SYNC-01 y la autorización del usuario.
