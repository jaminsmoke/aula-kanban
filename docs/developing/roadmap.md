# Roadmap ADOC-07 · Concurrencia y versiones de Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-07 del backlog (2026-11-18)
> **Backlog:** DEV-01 pendiente · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Evitar que dos ventanas o pestañas se pisen al guardar y ofrecer una salida segura cuando el servidor tiene una versión más nueva.
- [ ] Criterio de éxito: dos guardados simultáneos no se sobrescriben en silencio; la persona puede recargar, conservar su copia o descargarla, y queda una copia local recuperable.

## 2. Alcance

**Dentro:**

- Enviar y comprobar `expectedUpdatedAt` en el guardado de `app_documents`.
- Respuesta `409` con la versión actual cuando otro guardado llegó antes.
- Diálogo de conflicto con «Recargar versión del servidor», «Conservar la mía» y «Descargar copia».
- Copia local recuperable antes de un reemplazo destructivo, con límite y sin historial completo.
- Revisión del autosave para que no reintente ni pise una versión en conflicto.
- Pruebas de dos ventanas, dos pestañas, guardados consecutivos, invitados y recuperación.

**Fuera de alcance:**

- Edición colaborativa en tiempo real, cursores o comentarios.
- Historial completo de versiones o migraciones de datos históricos.
- Varios documentos por proyecto, carpetas o duplicado.
- Cambios de `AULA_STORE_VERSION`, versión de la app o del Site.
- Publicación en Sites: el cierre termina con un push único al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Usar `updatedAt` como testigo de versión | Añadir una columna `revision` y migrar la tabla | El dato ya existe y evita una migración; sigue siendo un número monótono por guardado. |
| `expectedUpdatedAt` opcional en el POST | Romper el contrato de las demás apps | Solo Aula Documentos lo envía; las demás apps conservan su comportamiento. |
| Actualización condicional atómica en D1 | Leer, comparar y escribir en pasos separados | Evita una carrera entre la comprobación y el guardado. |
| El conflicto se resuelve explícitamente | Last-write-wins silencioso | La persona decide qué versión conservar. |
| La copia local usa `localStorage` con límite y purga | Enviar copias al servidor | No cambia el esquema ni crea un historial compartido. |
| No hay auto-merge | Intentar combinar JSON de Tiptap | Un merge automático puede corromper el documento y las notas. |
| «Conservar la mía» exige confirmación | Reintentar el guardado sin avisar | El reemplazo destructivo debe ser una decisión consciente. |

## 4. Fases

### Fase 1 — Contrato de concurrencia en el servidor

- [x] Añadir `expectedUpdatedAt` opcional al POST de `/api/app-documents`.
- [x] Implementar una actualización condicional atómica: si el `updatedAt` actual no coincide, responder `409` con el valor vigente.
- [x] Mantener el comportamiento actual cuando el cliente no envía el campo.
- [x] Devolver `updatedAt` en guardados correctos y conflictos.
- [x] Cubrir con pruebas guardado normal, conflicto, cliente antiguo, invitado y tamaño.
- **Criterios de aceptación:**
  - Un guardado con la versión esperada se acepta.
  - Un guardado con una versión anterior recibe `409` y no escribe.
  - Las demás apps siguen funcionando con el contrato anterior.
  - Un invitado sigue sin poder guardar.

### Fase 2 — Cliente y diálogo de conflicto

- [x] Hacer que `useAppDocument` envíe el `updatedAt` conocido y distinga conflicto de error de red.
- [x] Detener el autosave y el guardado manual mientras haya conflicto.
- [x] Añadir un diálogo con «Recargar versión del servidor», «Conservar la mía» y «Descargar copia».
- [x] Actualizar el estado local solo después de una resolución explícita.
- [x] Cubrir con pruebas conflicto, recarga, conservar, descargar y nuevo guardado posterior.
- **Criterios de aceptación:**
  - Dos guardados consecutivos no se pisan en silencio.
  - Recargar trae la versión del servidor y conserva el documento actual hasta confirmar.
  - Conservar la mía solo sobrescribe tras confirmación y guarda una copia antes.

### Fase 3 — Copia recuperable y reintento

- [x] Guardar una copia local antes de reemplazar o conservar una versión en conflicto.
- [x] Limitar tamaño y número de copias por proyecto/app; purgar las más antiguas.
- [x] Permitir descargar la copia y restaurarla en el editor con confirmación.
- [x] Reintentar el guardado con el `updatedAt` actualizado tras la resolución.
- [x] Cubrir con pruebas cuota, purga, descarga y restauración.
- **Criterios de aceptación:**
  - Una copia recuperable sigue disponible tras recargar la página.
  - La copia no crece sin límite ni bloquea el almacenamiento del navegador.
  - Restaurar no pisa el servidor hasta confirmar el guardado.

### Fase 4 — Verificación y cierre

- [ ] Revisar dos ventanas, dos pestañas y guardados consecutivos a 1366, 1024 y 390 px.
- [ ] Actualizar la ayuda y registrar el resumen en el changelog.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-07.md`, reiniciar `developing/roadmap.md` y dejar el backlog con DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - El conflicto y la recuperación se verificaron con datos reales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Carrera entre comprobar y escribir | Dos guardados aceptados | Actualización condicional en una sola sentencia SQL. |
| `updatedAt` no es suficientemente único | Falso conflicto o falso positivo | Usar el valor devuelto por el servidor y guardar con precisión de milisegundos. |
| El autosave reintenta en bucle | Ruido y riesgo de pisar | Bloquear autosave hasta resolver el conflicto. |
| `localStorage` supera la cuota | No se guarda la copia | Límite de tamaño, purga y aviso antes de descargar. |
| El usuario conserva su versión por error | Cambios del servidor perdidos | Confirmación explícita y copia previa descargable. |
| Varias pestañas con el mismo `updatedAt` | Una gana y otra recibe conflicto | Aceptable: la segunda debe resolver, nunca guardar en silencio. |

## 6. Notas de sesión

- 2026-11-18: ADOC-07 sale del backlog y pasa a ser el roadmap activo. Prioridad P2; no se implementa nada en este paso.
- Puntos de partida: `lib/server/app-documents.ts`, `app/api/app-documents/route.ts`, `app/board/apps/use-app-document.ts`, `app/board/apps/aula-documentos/aula-documentos-app.tsx` y sus pruebas.
- ADOC-01 a ADOC-06 están cerrados. El esquema del documento ya está en v2 y no se añade historial completo; la copia local es una red de seguridad, no una funcionalidad de versiones.
- 2026-11-18: Fase 1 completada. El POST acepta `expectedUpdatedAt` numérico o `null`; un `UPDATE ... WHERE updated_at = ? RETURNING` atómico acepta solo la versión vigente y un `INSERT ... ON CONFLICT DO NOTHING` protege la creación. El conflicto responde `409` con `updatedAt` y no escribe. El testigo avanza con `max(ahora, actual + 1)` para no repetirse en el mismo milisegundo; sin el campo se conserva el contrato anterior. 17 pruebas focalizadas y 1.402 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 2 completada. `useAppDocument` añade `saveVersioned` y conserva `save` para las demás apps. Aula Documentos envía el testigo del servidor, abre un diálogo de conflicto y detiene autosave, Ctrl+S y guardado manual hasta resolver. «Recargar versión del servidor» descarta la copia local tras una acción explícita; «Conservar la mía» exige confirmación y descarga un JSON antes de sobrescribir. La siguiente fase sustituye esa descarga por una copia recuperable en el navegador. 47 pruebas focalizadas y 1.406 en la suite completa; `tsc` y ESLint en verde.
- 2026-11-18: Fase 3 completada. `recovery.ts` guarda hasta 3 copias por proyecto con un máximo de 420.000 bytes; purga las más antiguas y reintenta si el navegador agota la cuota. Aula Documentos crea una copia antes de recargar o conservar un conflicto y antes de sustituir por plantilla o importación. El diálogo «Copias locales» permite descargar y restaurar con confirmación; restaurar no escribe en el servidor y el siguiente guardado usa el testigo vigente. 52 pruebas focalizadas y 1.414 en la suite completa; `tsc` y ESLint en verde.
