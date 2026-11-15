# Roadmap — PER-01 · Persistencia de archivos con R2

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** PER-01 — Persistencia de archivos: R2, objetos huérfanos y miniaturas (sale del backlog).
> **Backlog:** UI-01, ARCH-01, ARCH-02, CI-01, SYNC-01, MCP-05 y recortes de rendimiento de chunks (7 entradas).
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

### Fase activa: subida real y recuperación

- [ ] Subir una imagen real, recargar el tablero y comprobar que `/api/files/[id]` la sirve.
- [ ] Inventariar filas de `uploads` y objetos de R2; decidir qué huérfanos se limpian.
- [ ] Si existe copia del almacenamiento antiguo, migrarla a R2 conservando `storage_key`; si no, pedir nuevas subidas.
- [ ] Decidir si se añaden miniaturas derivadas (canvas en cliente o binding `IMAGES`) después de estabilizar R2.
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
- La publicación `1.1.26` ya está hecha por Codex. El repo personal está sincronizado y no se debe cerrar PER-01 hasta probar una subida real y revisar los archivos existentes.
