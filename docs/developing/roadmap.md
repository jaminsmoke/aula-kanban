# Roadmap ADOC-10 · Paridad de apps heredadas

> **Estado:** Activo · **Origen:** ADOC-10 del backlog (2026-11-19)
> **Backlog:** ADOC-11, Hoja de cálculo y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Alinear Notas y documentos, Diagramas y Presentaciones con el guardado seguro de Aula Documentos, sin convertirlas en copias de la app unificada.
- [ ] Criterio de éxito: ninguna app heredada pierde cambios en silencio; un invitado no puede editar Diagramas; los conflictos se resuelven con recarga, conservación o copia.

## 2. Alcance

**Dentro:**

- Un motor compartido de borrador versionado para las tres apps.
- Autosave, indicador de cambios, guarda de cierre y conflicto de versión.
- Copia recuperable y descarga antes de una operación destructiva.
- Rol de invitado y edición bloqueada en Diagramas.
- Confirmaciones al cargar, limpiar o reiniciar con cambios.
- Nombres de exportación basados en el título.
- Pruebas de dos guardados, cierre, conflictos, rol y exportación.

**Fuera de alcance:**

- Convertir las apps heredadas en clones completos de Aula Documentos.
- Cambiar sus formatos de documento o migrar datos existentes.
- El lienzo y el editor visual de Diagramas; eso corresponde a ADOC-11.
- Nuevas acciones de menús o formato en Aula Documentos.
- Cambiar `AULA_STORE_VERSION`, versiones de app o el Site.
- Publicar en Sites: el cierre termina con un push al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mantener las apps como editores ligeros | Retirarlas y dejar solo Aula Documentos | Siguen teniendo valor para tareas simples y ya están instaladas. |
| Compartir un motor de borrador versionado | Copiar autosave/conflicto en cada app | Evita tres implementaciones distintas del mismo riesgo. |
| Reutilizar `useAppDocument.saveVersioned` | Volver al guardado incondicional | El servidor ya soporta concurrencia optimista. |
| Un diálogo de conflicto compartido | Resolver cada app con `window.confirm` | La recarga, conservación y descarga deben ser explícitas y accesibles. |
| Copia local de una sola entrada por app/proyecto | Historial completo por app | Suficiente para recuperar el último reemplazo sin duplicar ADOC-07. |
| Guardar automáticamente con el mismo patrón que Aula Documentos | Mantener solo guardado manual | Evita pérdidas al cerrar o cambiar de app. |
| Bloquear Diagramas para invitados | Ocultar solo el botón de guardar | El editor local no debe permitir cambios que el servidor rechazará. |
| Nombres de archivo desde el contenido | Mantener `projectId` | Hace identificables las descargas fuera de la app. |

## 4. Fases

### Fase 1 — Motor compartido y conflicto

- [ ] Extraer un hook de borrador versionado con carga, autosave, estado sucio, guardado manual y error.
- [ ] Integrar `saveVersioned`, el estado de conflicto y la guarda de cierre.
- [ ] Crear un diálogo compartido con «Recargar versión del servidor», «Conservar la mía» y «Descargar copia».
- [ ] Guardar una copia local con límite antes de conservar o reemplazar.
- [ ] Cubrir con pruebas guardado normal, conflicto, recarga, conservación, copia y cierre.
- **Criterios de aceptación:**
  - El motor no usa guardado incondicional.
  - Un conflicto no sobrescribe ni pierde la versión local.
  - El diálogo es accesible y devuelve el foco al cerrar.

### Fase 2 — Notas y Diagramas

- [ ] Migrar Notas y documentos al motor compartido: autosave, estado, cierre y conflicto.
- [ ] Exportar Notas con un nombre derivado del título.
- [ ] Pasar `role` a Diagramas y dejar el editor en solo lectura para invitados.
- [ ] Añadir autosave, guarda de cierre y conflicto a Diagramas.
- [ ] Confirmar antes de cargar o limpiar cuando haya cambios.
- [ ] Exportar Diagramas con un nombre legible en lugar del `projectId`.
- **Criterios de aceptación:**
  - Ambas apps avisan y bloquean el cierre con cambios pendientes.
  - Un invitado no puede editar ni guardar en Diagramas.
  - Cargar o limpiar con cambios exige confirmación.
  - Las descargas tienen nombres identificables.

### Fase 3 — Presentaciones

- [ ] Migrar Presentaciones al motor compartido.
- [ ] Confirmar antes de cargar, reiniciar o aplicar una plantilla con cambios.
- [ ] Exportar con un nombre derivado del título.
- [ ] Resolver conflictos con el diálogo compartido y copia recuperable.
- [ ] Revisar que el modo presentación no pierda el estado al resolver un conflicto.
- **Criterios de aceptación:**
  - Presentaciones no pierde cambios al cerrar, cargar o reiniciar.
  - La plantilla y el reinicio requieren confirmación.
  - El HTML exportado conserva el título y el contenido actual.

### Fase 4 — Verificación y cierre

- [ ] Revisar las tres apps a 390, 620, 900, 1024 y 1366 px.
- [ ] Probar dos ventanas, dos pestañas, invitado, conflicto, copia y cierre.
- [ ] Revisar que Aula Documentos no cambia por este roadmap.
- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget`.
- [ ] Actualizar ayuda y changelog; archivar en `docs/historial/roadmap-adoc-10.md`, reiniciar `developing/roadmap.md` y dejar el backlog con tres entradas.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - Los flujos de conflicto y rol se verificaron con datos reales.
  - El Site no cambia de versión y no se publica nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El motor compartido no encaja con tres estados distintos | Retrasos y parches | Interfaz genérica de estado JSON y adaptadores por app. |
| Autosave y acciones destructivas compiten | Pérdida o bloqueo | Cancelar el timer antes de cargar, limpiar o reiniciar. |
| Copia local duplicada o sin límite | Cuota agotada | Una entrada por app/proyecto y purga por tamaño. |
| Diagramas recibe el rol tarde | Invitado edita antes de guardar | Bloquear el editor al cargar, no solo el botón. |
| Cambios de las apps heredadas afectan Aula Documentos | Regresión | Probar Aula Documentos y mantener sus módulos separados. |
| La app Presentaciones no está instalada en un proyecto | No se puede revisar visualmente | Revisar CSS/pruebas y usar un proyecto de verificación si hace falta. |

## 6. Notas de sesión

- 2026-11-19: ADOC-10 sale del backlog y pasa a ser el roadmap activo.
- Decisión de producto: se mantienen las tres apps como editores ligeros; no se convierten en clones de Aula Documentos ni se retiran del catálogo.
- Estado inicial: Notas, Diagramas y Presentaciones usan `save` incondicional y no tienen autosave/conflicto. Diagramas no recibe `role`. «Cargar», «Limpiar» y «Reiniciar» pueden perder cambios sin confirmación.
- Puntos de partida: `app/board/apps/use-app-document.ts`, las tres apps heredadas, `window-close-guard`, `use-dialog-focus` y las utilidades de recuperación de Aula Documentos.
- No se cambia el formato de datos de cada app ni se toca el esquema del documento de Aula Documentos.
