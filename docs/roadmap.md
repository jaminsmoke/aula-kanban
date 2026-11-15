# Roadmap PER-03 · Purga segura de archivos sin uso

> **Backlog:** PER-01B, PER-02 y SYNC-01 siguen en [`backlog.md`](backlog.md).
> **Inicio:** 2026-11-15 · **Estado:** En curso

---

## 1. Objetivo

- [ ] Eliminar de R2 y de `uploads` los archivos que ya no referencia ningún documento, sin borrar los compartidos ni los que están a medio guardar.
- [ ] Criterio de éxito: un archivo sustituido, cancelado o de una edición perdida se purga tras el periodo de gracia; un archivo referenciado por una tarea, una pizarra o un documento nunca se borra; la purga es reintentable, acotada y solo la ejecuta propietario o administración.

## 2. Alcance

**Dentro:**
- Inventario de referencias `/api/files/{id}` en `tasks.image_url`, en `boards.snapshot` (`files` y cualquier cadena del JSON) y en `app_documents.state`.
- Cálculo de candidatos por proyecto: filas de `uploads` sin referencia y más antiguas que el periodo de gracia.
- Purga idempotente y acotada: borrar el objeto de R2 y después la fila, conservando la fila si el objeto falla.
- Modo simulación y ejecución explícita desde un endpoint protegido para propietario o administración.
- Control mínimo en Ajustes > Almacenamiento con el resumen de la simulación y confirmación.
- Pruebas de referencias, sustitución, cancelación, referencias compartidas, concurrencia, fallo de R2, reintento y proyecto eliminado.

**Fuera de alcance:**
- Inventario completo de objetos de R2 sin fila (PER-01B) y miniaturas derivadas (PER-02).
- Cambiar la subida, los límites de 5 MB / 10 MB, las URLs `/api/files/{id}` o el esquema de `uploads`.
- Borrar archivos referenciados por otros proyectos, URLs externas o documentos con JSON corrupto.
- Prometer una purga programada: solo se conectará si Sites ofrece tareas periódicas verificables.
- Añadir herramientas MCP en este roadmap.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Calcular las referencias al vuelo desde los documentos | una tabla de referencias mantenida al guardar | hoy no existe relación y mantenerla obligaría a tocar cada guardado y a migrar datos; el inventario acotado basta para una purga por lotes. |
| Buscar referencias solo dentro del proyecto de la fila | búsqueda global de cualquier documento | `/api/files/{id}` ya resuelve el proyecto de la fila; una URL de otro proyecto no se puede servir y no debe proteger el archivo. |
| Periodo de gracia de 7 días y edad mínima | borrar en cuanto no haya referencia | una subida elegida en un formulario o una escena a medio guardar aún no tiene referencia; la gracia cubre ese intervalo. |
| Releer las referencias justo antes de borrar cada candidato | confiar en el inventario inicial | reduce la carrera entre un guardado y la purga, y descarta candidatos que acaban de usarse. |
| Borrar primero el objeto de R2 y después la fila | borrar la fila primero | si R2 falla, la fila sigue ahí para reintentar; el metadato nunca se pierde. |
| Fallar cerrado ante un JSON corrupto | asumir que un documento ilegible no referencia nada | un `snapshot` o un `state` corrupto no permite afirmar que sus archivos estén libres; se omite el proyecto hasta revisarlo. |
| Ejecución manual, acotada y con simulación por defecto | cron o purga en cada carga | el proyecto no declara tareas periódicas; una purga en cada petición añadiría latencia y carreras sin control. |
| Sin migración en esta primera versión | columna `pending_delete` | la gracia, la relectura y el tope por lote bastan; un estado nuevo complica la subida y no impide guardar una URL. |

## 4. Fases

### Fase 1: Inventario de referencias y candidatos

- [x] Crear un extractor puro en `lib/domain/uploads/references.ts` que obtenga los ids de las URLs `/api/files/{id}` de un texto y de un JSON, ignore URLs externas y deduplique.
- [x] Reunir por proyecto las referencias de `tasks.image_url`, `boards.snapshot` y `app_documents.state`, sin interpretar el contenido de las apps.
- [x] Calcular candidatos con modo simulación: filas del proyecto sin referencia y con antigüedad mayor que el periodo de gracia, con tope por lote.
- [x] Confirmar si Sites ofrece tareas periódicas y registrar la conclusión antes de elegir el disparador definitivo.
- **Criterios de aceptación:** una referencia en cualquiera de los tres orígenes protege el archivo; una URL externa no cuenta; un JSON corrupto bloquea la purga de ese proyecto en vez de asumir que no hay referencias; los candidatos se listan sin tocar R2 ni D1.
- **Estado:** Completada el 2026-11-15. `lib/domain/uploads/references.ts` extrae los ids, ignora URLs externas, deduplica y falla cerrado; `lib/server/uploads/usage.ts` reúne referencias de tareas, pizarras y documentos y devuelve candidatos acotados con 7 días de gracia, sin borrar nada. 11 tests focalizados, suite de 945 tests, `tsc` y lint en verde. Sites no ofrece cron de Worker en este proyecto, así que la fase 3 mantiene la ejecución manual.

### Fase 2: Purga idempotente y reintentable

- [x] Implementar el servicio de purga con relectura de referencias, borrado de R2 y después de la fila, tope por llamada y tolerancia a fallos individuales.
- [x] Devolver recuentos de candidatos, borrados, omitidos por referencia nueva y fallos, sin lanzar por un archivo concreto.
- [x] Exponer `POST /api/storage/purge` para propietario o administración, con mismo origen, `simulacion` por defecto y `limite` acotado.
- [x] Cubrir sustitución de imagen, cancelación de subida, referencia compartida, archivo recién subido, fallo de R2, reintento y proyecto eliminado.
- **Criterios de aceptación:** el archivo referenciado sobrevive; el huérfano antiguo desaparece de R2 y de `uploads`; un fallo de R2 deja la fila para el siguiente intento; una referencia creada entre el inventario y el borrado evita la eliminación.
- **Estado:** Completada el 2026-11-15. `lib/server/uploads/purge.ts` relee las referencias antes de cada borrado, elimina R2 y después la fila, tolera fallos y simula por defecto; `POST /api/storage/purge` queda reservado a propietario o administración y recorre todos los proyectos con archivos. 25 tests focalizados, `tsc` y lint en verde.

### Fase 3: Activación, cobertura y cierre

- [ ] Añadir el control de simulación y limpieza en Ajustes > Almacenamiento, solo para propietario o administración, con confirmación explícita.
- [ ] Documentar periodo de gracia, tope por ejecución, ausencia de purga programada y cómo reintentar.
- [ ] Ejecutar lint, `tsc`, tests y build; probar en local con archivos huérfanos y referenciados antes de activar.
- [ ] Resumir el roadmap en `docs/changelog.md` y reiniciar `docs/roadmap.md`.
- **Criterios de aceptación:** la purga no se activa sin simulación y confirmación; la documentación explica qué se borra y qué no; la suite y el build están en verde; no se añaden entradas al backlog.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Carrera entre un guardado y la purga | un documento apunta a un objeto borrado | relectura justo antes de borrar, gracia de 7 días y tope por lote. |
| Borrar un archivo compartido | se rompe una tarea, una pizarra o un documento | inventario de los tres orígenes y fallo cerrado si un JSON no se puede leer. |
| R2 no disponible o borrado parcial | metadatos sin objeto o viceversa | borrar objeto y después fila; conservar la fila ante un fallo y reintentar. |
| JSON grande o mal formado | inventario lento o incorrecto | límites ya existentes (2 MB en pizarras y 200.000 caracteres en documentos), parseo tolerante y omisión del proyecto. |
| Purga accidental en producción | pérdida de archivos en uso | simulación por defecto, confirmación explícita y permiso de propietario o administración. |
| Sites sin tareas periódicas | la purga no se ejecuta sola | endpoint manual acotado; no se promete cron hasta verificarlo. |

## 6. Notas de sesión

- Base: catálogo MCP `0.26.0` con 59 herramientas; MCP-05E cerrado. El backlog conserva PER-01B, PER-02 y SYNC-01.
- `uploads` guarda `purpose` y URL, pero no referencias; `/api/files/{id}` sirve solo a miembros del proyecto de la fila.
- La subida ocurre al elegir la imagen de una tarea o al guardar una escena de pizarra; cancelar o sustituir deja huérfanos sin referencia.
- `cleanupOrphanUploads` ya limpia archivos de proyectos eliminados y se reintenta al listar proyectos; esta purga cubre los huérfanos dentro de un proyecto vivo.
- Comprobación de Sites (2026-11-15): el Worker no exporta `scheduled`, `hosting.json` solo declara `d1`, `r2` y la capacidad `mcp`, y las tareas programadas de ChatGPT son sesiones del agente, no un disparador del Worker. La purga se activará con el endpoint manual de la fase 3.
- No se cambia la versión del Site (`1.1.27`) ni se publica en Sites durante el roadmap.
- El push a GitHub se decide al cerrar, según SYNC-01 y la autorización del usuario.
