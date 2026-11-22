# Roadmap ADOC-22 — Aclarar la apertura de una suite documental vacía

> **Estado:** Activo (2026-11-22) · **Origen:** ADOC-22 del backlog
> **Backlog:** 3 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Evitar que una apertura de proyecto vacío seguida de «Nuevo» cree dos documentos, uno de ellos en blanco.
- [ ] Mostrar un estado de preparación coherente mientras se crea el primer documento automático.
- [ ] Hacer que un error de carga tenga prioridad sobre el estado vacío y ofrezca reintento.
- [ ] Criterio de éxito: una primera apertura deja el número esperado de documentos, sin mensajes contradictorios y con el mismo comportamiento para una tarea nueva o una entrega.

## 2. Alcance

**Dentro:**

- `use-aula-document-suite.ts`, el controlador de la suite y el modelo que expone su estado.
- `document-suite-panel.tsx`, sus estados de carga, preparación, vacío y error, y sus pruebas.
- La acción de reintento de carga y el estado de creación inicial.
- Pruebas de la carrera entre la carga vacía, la creación automática y «Nuevo».

**Fuera:**

- Cambiar el esquema, las rutas o la persistencia del servidor.
- Rediseñar la lista, el editor o el flujo de entrega de tareas.
- Cambiar permisos, datos, URLs, MCP o la versión del Site.
- Eliminar la creación automática del primer documento salvo que la reproducción demuestre que es inviable.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Conservar la creación automática del primer documento | Eliminarla y exigir «Nuevo» siempre | Es el comportamiento actual y evita un paso extra al abrir un proyecto vacío. |
| Mostrar «Preparando el primer documento…» y bloquear «Nuevo» mientras se crea | Mostrar el estado vacío y permitir pulsar «Nuevo» | Evita la carrera que duplica documentos y hace coherente lo que ve la persona. |
| Mostrar el error antes que el vacío | Mostrar ambos mensajes | Un fallo de carga no significa que la suite esté vacía. |
| Añadir reintento explícito | Depender de recargar la app | Permite recuperar la lista sin perder el contexto. |
| Mantener una sola creación inicial por apertura | Reintentar la creación automática sin control | Evita duplicados si la carga o el reintento se repiten. |

## 4. Punto de partida

- `useAulaDocumentSuite` ejecuta `refresh()`, que termina poniendo `loading` en `false`, y después crea el documento inicial dentro del efecto.
- El panel ve `loading === false`, `suite.active.length === 0` y muestra «Todavía no hay documentos»; el botón «Nuevo» sigue habilitado durante la creación.
- La condición del estado vacío no comprueba `suiteError`, por lo que un fallo de lista puede mostrar error y vacío a la vez.
- La creación inicial usa `autoCreated` para no repetirse, pero no bloquea una creación manual simultánea.
- La prueba actual cubre la creación inicial correcta, pero no la carrera con «Nuevo» ni el fallo de carga.
- Baseline: arquitectura **461 archivos / 1.155 imports**; suite **268 archivos / 1.778 pruebas**; Site `1.1.40`.

## 5. Fases

### Fase 1 — Reproducción y contrato de apertura

- [x] Reproducir la secuencia: lista vacía, creación inicial en curso y pulsación de «Nuevo».
- [x] Fijar el contrato de estados: carga, preparación, vacío real, error y reintento.
- [x] Confirmar que el primer documento se conserva automáticamente y que «Nuevo» crea uno solo después.
- [x] Registrar los casos de prueba y el baseline sin cambiar producto.
- **Criterios:** reproducción determinista, contrato claro y decisiones de estados aprobadas.
- **Cierre (2026-11-22):** reproducida la carrera con una prueba temporal retirada: GET vacío + POST inicial pendiente + «Nuevo» envía dos POST. Contrato en [`suite-vacia.md`](suite-vacia.md): conservar la creación automática, mostrar preparación, bloquear «Nuevo», priorizar error y reintentar. Sin cambios de producto.

### Fase 2 — Preparación inicial y precedencia del error

- [x] Exponer un estado de preparación inicial y deshabilitar «Nuevo» mientras esté activo.
- [x] Mostrar un solo mensaje coherente durante la creación automática.
- [x] Suprimir el estado vacío cuando haya un error de carga.
- [x] Cubrir con pruebas una sola creación inicial y la ausencia de mensajes contradictorios.
- **Criterios:** sin documentos duplicados, estados coherentes y pruebas de la carrera.
- **Cierre (2026-11-22):** `useAulaDocumentSuite` expone `initializing`, bloquea una segunda creación y publica el error de preparación. El panel muestra «Preparando el primer documento…», deshabilita «Nuevo» y solo pinta el vacío sin error ni preparación. Suite **268 / 1.781**; Aula **54 / 5.439 ≤ 54 / 5.500**.

### Fase 3 — Reintento y fallo de creación

- [ ] Añadir una acción de reintento para la carga de la lista.
- [ ] Mostrar error y reintento si falla la creación inicial, sin dejar un estado vacío engañoso.
- [ ] Verificar que un reintento no duplica documentos ni relanza una creación ya completada.
- **Criterios:** la lista se recupera desde el error y la suite queda en el estado esperado.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Verificar la apertura vacía, la apertura con error, «Nuevo» y una entrega existente.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- **Criterios:** corrección verificada, sin regresiones ni publicación desde el roadmap.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Crear dos documentos durante la carga | Documento en blanco no deseado | Bloquear «Nuevo» y una sola creación inicial por apertura. |
| Ocultar un error bajo el estado vacío | La persona no sabe qué ocurrió | Error con prioridad y reintento explícito. |
| Reintentar y duplicar la creación | Más documentos de los esperados | Separar carga, preparación y creación; probar el reintento. |
| Cambiar el comportamiento normal de apertura | Regresión en proyectos existentes | Mantener la selección del último documento y la creación automática. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** ADOC-22 entra desde el backlog por el fallo de la suite vacía; quedan UI-12, TASK-01 y DEV-01. Se empieza por reproducir la carrera y fijar los estados. Sin cambios de producto en esta apertura.
- 2026-11-22: **Fase 1 completada.** Carrera reproducida con una prueba temporal retirada; el GET vacío deja `loading=false` y «Nuevo» habilitado mientras el POST inicial sigue pendiente. Contrato en [`suite-vacia.md`](suite-vacia.md). Sin cambios de producto.
- 2026-11-22: **Fase 2 completada.** Estado `initializing`, guard de creación y mensajes de preparación; el vacío no aparece si hay error o preparación. Pruebas de carrera y panel; suite **268 / 1.781**. Presupuesto de pruebas de Aula ampliado a **5.500** líneas.
- La instancia local sigue disponible en `http://127.0.0.1:5173/` para revisar los cambios mientras se prepara este roadmap.
- No se publica en Sites ni se aplican migraciones remotas desde este roadmap.
