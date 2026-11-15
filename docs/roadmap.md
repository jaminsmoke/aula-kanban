# Roadmap — PER-01 · Persistencia de archivos con R2

> **Estado:** Activo
> **Inicio:** 2026-11-15
> **Entrada:** PER-01 — Persistencia de archivos: R2, objetos huérfanos y miniaturas (sale del backlog).
> **Backlog:** MCP-05, recortes de rendimiento de chunks y SYNC-01 (3 entradas).
> **Regla:** Este documento contiene solo la fase activa. Lo que se aparca pasa al backlog; lo completado pasa al changelog cuando **todas** las fases del roadmap hayan terminado.
> **Publicación:** `1.1.26` ya está publicada en Sites; este roadmap distingue esa publicación del cierre real de la persistencia.

---

## 1. Objetivo

- [ ] Recuperar la persistencia de imágenes y documentos usando D1 para metadatos y R2 para bytes, sin VPS ni volúmenes propios.
- [ ] Criterio de éxito: una imagen subida desde la web se guarda en R2, se sirve por `/api/files/[id]` y sobrevive a una recarga; el diagnóstico de Ajustes confirma D1 y R2; los archivos antiguos tienen un destino conocido.

## 2. Alcance

**Dentro:**
- Diagnóstico de D1/R2 para propietario y administración.
- Errores distintos para «storage no configurado», «metadato inexistente» y «objeto perdido».
- Aviso visible en Ajustes y en la tarjeta cuando una imagen no se puede cargar.
- Checklist de R2 en Sites, inventario de `uploads` y plan para copias antiguas.
- Pruebas de rutas, diagnóstico y UI.

**Fuera de alcance:**
- Volver a un VPS, un volumen montado o un servidor propio.
- Sustituir R2 por un proveedor externo mientras Sites pueda proporcionar el binding.
- Generar miniaturas optimizadas antes de confirmar que la persistencia base funciona.
- Cambiar el esquema de `uploads` o los límites de 5 MB / 10 MB.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| D1 + R2 gestionados por Sites | VPS con volumen o filesystem local | El Worker no tiene filesystem persistente; Sites inyecta los bindings y no hay servidor que administrar. |
| Diagnóstico acotado a propietario/administración | Endpoint público con detalles del bucket | Evita revelar la configuración de infraestructura a cualquier cuenta. |
| Base64 para la herramienta MCP de subida | Multipart dentro de `tools/call` | El contrato MCP recibe argumentos JSON; la web mantiene multipart. |
| Imagen completa mientras se arregla storage | Generar miniaturas desde el inicio | Primero hay que garantizar que el objeto original exista y se sirva. |

## 4. Fases

### Fase 1: Diagnóstico y errores
- [x] Añadir `storageStatus` y `GET /api/storage/status` para propietario/administración.
- [x] Separar en `/api/files/[id]` el 503 por storage ausente del 404 por archivo u objeto inexistente.
- [x] Cubrir los casos con pruebas de ruta y typecheck.
- **Criterios de aceptación:** el diagnóstico no expone secretos; un archivo con R2 ausente responde 503 y uno inexistente 404.

### Fase 2: Ajustes y visibilidad
- [x] Mostrar D1, binding `BUCKET`, acceso al bucket y número de filas en Ajustes > Administradores.
- [x] Mostrar «Imagen no disponible» en la tarjeta cuando la miniatura falla, en vez de ocultarla sin explicación.
- [x] Documentar R2, el diagnóstico y el checklist de publicación en README.
- **Criterios de aceptación:** el propietario/administración ve el estado real; una imagen rota deja un aviso visible.

### Fase 3: Verificación en Sites y recuperación
- [ ] Confirmar que el Site publicado tiene el binding `BUCKET` y que el bucket R2 responde.
- [ ] Subir una imagen real, recargar el tablero y comprobar que `/api/files/[id]` la sirve.
- [ ] Inventariar filas de `uploads` y objetos; decidir qué huérfanos se limpian.
- [ ] Si existe copia del almacenamiento antiguo, migrarla a R2 conservando `storage_key`; si no, pedir nuevas subidas.
- [ ] Decidir si se añaden miniaturas derivadas (canvas en cliente o binding `IMAGES`) después de estabilizar R2.
- **Criterios de aceptación:** la subida y la lectura funcionan en producción y el inventario no deja filas sin objeto sin una decisión explícita.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| R2 no está habilitado en el proyecto de Sites | Todo `/api/uploads` responde 503 y las imágenes existentes 404 | Confirmar el binding antes de tocar datos; el diagnóstico lo muestra. |
| Los objetos antiguos solo existían en el VPS descartado | Las filas de D1 quedan sin bytes recuperables | Conservar las filas hasta revisar la copia; si no hay backup, pedir nuevas subidas. |
| El diagnóstico usa `list` y el bucket restringe esa operación | Falso negativo aunque `put`/`get` funcionen | Contrastar con una subida real; el diagnóstico es orientativo, no la única prueba. |
| Miniaturas grandes en el tablero | Consumo de datos y tiempo de carga | Tratar como fase posterior; usar `object-fit: cover` mientras tanto. |

## 6. Notas de sesión

- El código actual no usa filesystem ni VPS: `lib/server/storage.ts` solo accede a `env.DB` y `env.BUCKET`.
- `.openai/hosting.json` declara `"r2": "BUCKET"`; `vite.config.ts` simula el binding en local.
- La publicación `1.1.26` ya está hecha por Codex. No se debe cerrar PER-01 hasta probar una subida real y revisar los archivos existentes.
- La tarea pendiente que no se puede resolver desde el repositorio es habilitar/verificar R2 en el Site publicado.
