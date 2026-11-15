> **Archivo:** conservado el 2026-11-15 al reiniciar el roadmap; los pendientes vigentes están en el backlog (PER-01B y PER-03).

# Roadmap — PER-01 · Persistencia de archivos con R2

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** PER-01 — Persistencia de archivos: R2, objetos huérfanos y miniaturas (sale del backlog).
> **Backlog:** PER-02, UI-01, ARCH-01, ARCH-02, CI-01, SYNC-01, MCP-05 y recortes de rendimiento de chunks (8 entradas).
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** `1.1.26` ya está desplegada en Sites por Codex; el repositorio personal `jaminsmoke/aula-kanban` se sincroniza aparte con commit/push desde local.

---

## 1. Objetivo

- [ ] Recuperar la persistencia de imágenes y documentos usando D1 para metadatos y R2 para bytes, sin VPS ni volúmenes propios.
- [ ] Criterio de éxito: una imagen subida desde la web se guarda en R2, se sirve por `/api/files/[id]` y sobrevive a una recarga; el inventario de archivos antiguos tiene un destino conocido.

## 2. Alcance

**Dentro:**
- Verificación de una subida real y de su lectura en el Site publicado.
- Inventario de filas de `uploads` y objetos de R2; decisión sobre huérfanos.
- Recuperación o resubida de los archivos antiguos.
- Decisión sobre miniaturas derivadas después de estabilizar la persistencia.

**Fuera de alcance:**
- Volver a un VPS, un volumen montado o un servidor propio.
- Sustituir R2 por un proveedor externo mientras Sites pueda proporcionar el binding.
- Cambiar el esquema de `uploads` o los límites de 5 MB / 10 MB.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| D1 + R2 gestionados por Sites | VPS con volumen o filesystem local | El Worker no tiene filesystem persistente; Sites inyecta los bindings y no hay servidor que administrar. |
| Diagnóstico acotado a propietario/administración | Endpoint público con detalles del bucket | Evita revelar la configuración de infraestructura a cualquier cuenta. |
| Base64 para la herramienta MCP de subida | Multipart dentro de `tools/call` | El contrato MCP recibe argumentos JSON; la web mantiene multipart. |
| Imagen completa mientras se verifica storage | Generar miniaturas desde el inicio | Primero hay que garantizar que el objeto original exista y se sirva. |

## 4. Estado de la fase activa

### Ya cerrado en `1.1.26`

El diagnóstico D1/R2, los errores 503/404, el panel de Ajustes, el aviso de imagen rota y su documentación están implementados y desplegados. El diagnóstico de producción confirmó D1 y R2 accesibles, con cero archivos registrados; no se repiten aquí como tareas abiertas.

### Verificación local completada (2026-11-15)

- `POST /api/uploads` devolvió **201** con un PNG de 68 bytes; `GET /api/files/[id]` devolvió **200**, `image/png` y el mismo SHA-256 (`431ced…`).
- `/api/storage/status` devolvió `database: true`, `bucket: true`, `bucketReachable: true` y `uploads: 1` en el entorno local con el binding `BUCKET`.

### Fase activa: verificación en el Site y recuperación

- [x] Repetir la subida y la lectura en el Site publicado: el 2026-11-15 se subió un PNG desde el formulario de tarea, se guardó y, tras recargar, la imagen `/api/files/[id]` cargó con dimensiones naturales. Se eliminó el proyecto temporal junto con su tarea y el contador de metadatos volvió a cero.
- [ ] Inventariar filas de `uploads` y objetos de R2; decidir qué huérfanos se limpian. El panel de producción indica **0 filas** antes y después de la prueba, por lo que no hay filas sin objeto que recuperar allí. El diagnóstico actual solo comprueba que `BUCKET.list({ limit: 1 })` responde: no cuenta ni enumera objetos; no se puede afirmar que el bucket esté vacío. Hace falta un inventario completo de solo lectura, protegido para administración y con paginación, antes de decidir sobre posibles objetos sin fila. No borrar objetos sin identificarlos.
- [ ] Verificar si existe alguna copia del almacenamiento antiguo antes de dar por cerrada la recuperación. En esta instancia hay 0 filas en `uploads`, así que no hay metadatos registrados para migrar; esto no demuestra por sí solo que nunca existieran archivos o copias fuera de D1/R2. Si aparecen archivos que se deban recuperar, documentar su correspondencia o solicitar una nueva subida; no inventar claves.
- [x] Decisión sobre miniaturas: mantener por ahora la imagen original y no introducir derivados ni bindings nuevos. La optimización opcional queda registrada en el backlog como PER-02 para evaluarse con mediciones.
- **Criterios de aceptación:** la subida y la lectura funcionan en producción y el inventario no deja filas sin objeto sin una decisión explícita.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El diagnóstico confirma `list` pero no una escritura | La subida real puede fallar aunque el panel esté en verde | Probar `POST /api/uploads` y `GET /api/files/[id]` antes de cerrar la fase. |
| Los objetos antiguos solo existían en el VPS descartado | Las filas de D1 quedan sin bytes recuperables | Conservar las filas hasta revisar la copia; si no hay backup, pedir nuevas subidas. |
| Miniaturas grandes en el tablero | Consumo de datos y tiempo de carga | Tratar como fase posterior; usar `object-fit: cover` mientras tanto. |

## 6. Notas de sesión

- El código actual no usa filesystem ni VPS: `lib/server/storage.ts` solo accede a `env.DB` y `env.BUCKET`.
- `.openai/hosting.json` declara `"r2": "BUCKET"`; `vite.config.ts` simula el binding en local.
- La publicación `1.1.26` ya está hecha por Codex. El repo personal está sincronizado. La subida y la lectura se probaron tanto en local como en el Site; sigue pendiente revisar el inventario completo y posibles copias antiguas.
- La prueba real de producción se hizo en un proyecto temporal y se eliminó; el Site sigue en `1.1.26`. La prueba confirma la lectura visual tras recarga, no un inventario completo de R2 ni la existencia o ausencia de backups antiguos.
- Siguiente paso para quien retome: obtener un inventario seguro y paginado del bucket con acceso de administración, cotejarlo con D1 sin borrar datos, y revisar si hay copias antiguas. Mantener esta fase activa hasta resolver ambos puntos; no reiniciar el roadmap prematuramente.
