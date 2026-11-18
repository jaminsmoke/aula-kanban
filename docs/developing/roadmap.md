# Roadmap ADOC-01 · Guardado seguro y recuperación de Aula Documentos

> **Estado:** Activo · **Origen:** ADOC-01 del backlog (2026-11-18)
> **Backlog:** ADOC-02…ADOC-07 y DEV-01 pendientes · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Evitar que se pierda trabajo en Aula Documentos: guardar automáticamente, no perder el borrador de un diagrama Mermaid y proteger el cierre de la app cuando hay cambios pendientes.
- [ ] Criterio de éxito: una persona puede escribir, editar un diagrama, cerrar la app y volver a abrirla sin perder nada; si el documento guardado está dañado, puede descargar el original antes de decidir cómo continuar.

## 2. Alcance

**Dentro:**

- Autosave con debounce sobre el endpoint existente `/api/app-documents`, reutilizando `useAppDocument`.
- Estado visible de guardado: limpio, sucio, guardando, guardado y error, con última hora de guardado.
- `Ctrl/Cmd+S` y guardado manual sin duplicar la lógica actual.
- Volcado del borrador pendiente de cada bloque Mermaid al guardar, al perder el foco y antes de cerrar.
- Guarda de cierre de la ventana de la app y `beforeunload` para recargas o cierre de pestaña.
- Recuperación de un documento guardado inválido: descargar el JSON original y elegir entre reintentar, recuperarlo o empezar de cero sin sobrescribirlo en silencio.
- Pruebas de autosave, borradores Mermaid, cierre, modo invitado y recuperación.

**Fuera de alcance:**

- Plantillas, documento nuevo y limpieza del editor; pertenecen a ADOC-02.
- Concurrencia entre ventanas, revisiones y copia histórica; pertenecen a ADOC-07.
- Cambios de esquema, migraciones de base de datos o un endpoint nuevo.
- Subida de versión de la app, de `AULA_STORE_VERSION` o del Site.
- Publicación en Sites; el cierre termina con un push único al repositorio personal.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Autosave con debounce de 1,5–2 s sobre `useAppDocument` | Guardar en cada pulsación | Evita peticiones excesivas y mantiene el contrato actual de `/api/app-documents`. |
| Secuencia de guardado con token y cancelación del timer al desmontar | Confiar en el orden de las promesas | Evita que un guardado antiguo pise uno nuevo al escribir rápido. |
| El borrador Mermaid se registra con una función de volcado y también se aplica en `onBlur` | Guardar el texto local en cada tecla | Conserva el historial de deshacer y evita transacciones por cada carácter. |
| El cierre de la app usa un hook opcional del escritorio (`onBeforeClose`) | Confiar solo en `beforeunload` | El cierre de una ventana interna no dispara `beforeunload`; el hook permite guardar o confirmar. |
| `updatedAt` existente para mostrar la última hora de guardado | Añadir una revisión o tabla nueva | Esta fase no necesita migraciones; la concurrencia se resuelve en ADOC-07. |
| Un documento inválido no se repara ni se sobrescribe automáticamente | Cargar el ejemplo y seguir | No se deben adivinar datos ni destruir el original sin una decisión explícita. |
| El modo invitado sigue sin autosave ni guardado | Permitir guardados silenciosos | Respeta el contrato de solo lectura y los permisos actuales. |

## 4. Fases

### Fase 1 — Autosave y estado de guardado

- [ ] Extraer una función única que construya el documento actual validado y otra que lo persista, para que guardado manual y autosave compartan la misma ruta.
- [ ] Añadir autosave con debounce cuando el documento esté sucio; cancelar el timer al desmontar, al importar y al cerrar, y descartar respuestas de guardados antiguos.
- [ ] Añadir `Ctrl/Cmd+S` y mantener el botón de guardado como acción explícita.
- [ ] Mostrar estados claros: «Guardando…», «Guardado», «Cambios sin guardar» y error con opción de reintentar; mostrar la última hora de guardado.
- [ ] Cubrir con pruebas: no guardar limpio, guardar una vez tras varias ediciones, no guardar como invitado, conservar sucio si falla la red y no guardar durante la carga.
- **Criterios de aceptación:**
  - Escribir y esperar el debounce guarda el documento sin pulsar nada.
  - Varias ediciones seguidas producen un solo guardado y nunca uno fuera de orden.
  - Un fallo de red deja el documento como sucio y permite reintentar.
  - El estado visible coincide con lo que está ocurriendo.

### Fase 2 — Borradores Mermaid

- [ ] Definir un registro de borradores de bloques Mermaid que la app pueda vaciar antes de leer `editor.getJSON()`.
- [ ] Aplicar el borrador al nodo en `onBlur` y antes de guardar, autosave o cierre; conservar «Aplicar», «Descartar», Escape y `Ctrl/Cmd+Intro`.
- [ ] Marcar el documento como sucio cuando cambie el borrador sin generar transacciones por cada pulsación.
- [ ] Evitar dobles aplicaciones y comprobar que deshacer/rehacer sigue siendo predecible.
- [ ] Cubrir con pruebas: guardar sin pulsar «Aplicar», `Ctrl/Cmd+S` con el foco en el textarea, descartar y reabrir el bloque.
- **Criterios de aceptación:**
  - Editar el código de un diagrama y guardar conserva el texto nuevo aunque no se haya pulsado «Aplicar».
  - Descartar restaura el código anterior.
  - El autosave no guarda un código intermedio mientras se escribe si el debounce aún no ha vencido.
  - El historial de deshacer no se llena de una entrada por carácter.

### Fase 3 — Cierre protegido y recuperación

- [ ] Añadir al escritorio un hook opcional de cierre por app, sin cambiar el comportamiento de las apps que no lo registren.
- [ ] Usar ese hook para ofrecer «Guardar y cerrar», «Cerrar sin guardar» y «Cancelar» cuando haya cambios pendientes; registrar también `beforeunload`.
- [ ] Si el documento guardado no valida, conservar el estado original y mostrar descarga del JSON, reintento y reinicio explícito; no cargar el ejemplo como si todo hubiera ido bien.
- [ ] Añadir pruebas del hook de cierre, del aviso de `beforeunload`, de la recuperación y de que un invitado no recibe acciones de guardado.
- **Criterios de aceptación:**
  - Cerrar con cambios pendientes no pierde trabajo de forma silenciosa.
  - Cancelar el cierre mantiene la app abierta y el documento intacto.
  - Un documento inválido se puede descargar antes de reiniciar.
  - Las apps que no usan el hook se siguen cerrando como hasta ahora.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar la suite completa, `tsc`, ESLint, build y `perf:budget` sobre el estado final.
- [ ] Revisar el flujo a 1366, 1024 y 390 px, con teclado y con el foco dentro de un diagrama.
- [ ] Actualizar la ayuda si el autosave cambia el texto de guardado y registrar el resumen en el changelog.
- [ ] Archivar este roadmap en `docs/historial/roadmap-adoc-01.md`, retirarlo de `developing/roadmap.md` y dejar el backlog con ADOC-02…ADOC-07 y DEV-01.
- [ ] Hacer un commit por fase verificada y un push único al cerrar; no publicar en Sites ni cambiar la versión del Site.
- **Criterios de aceptación:**
  - Suite, tipos, lint, build y presupuesto en verde.
  - El flujo de guardado y recuperación se verificó con datos reales.
  - El Site sigue en `1.1.35` y no se ha publicado nada desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un guardado antiguo termina después de uno nuevo | Se pisa el documento con una versión anterior | Token de secuencia, cancelación del timer y descarte de respuestas obsoletas. |
| El borrador Mermaid se aplica dos veces | El historial de deshacer queda sucio o el texto se duplica | Un único punto de volcado y pruebas de `onBlur`, guardado y cierre. |
| El hook de cierre afecta a otras apps | Regresiones al cerrar ventanas | Hook opcional; sin registro, el cierre actual no cambia. |
| `beforeunload` no cubre el cierre interno | Pérdida de cambios al cerrar la ventana | Autosave + hook de cierre; `beforeunload` queda como segunda barrera. |
| El autosave falla repetidamente | El documento parece guardado cuando no lo está | Estado de error visible, reintento y documento marcado como sucio. |
| Un documento inválido se sobrescribe | Pérdida irreversible de datos | Descarga del JSON original y reinicio solo con confirmación explícita. |
| Invitados reciben autosave | Errores de permisos y escrituras no deseadas | Autosave desactivado en modo lectura y pruebas de rol. |

## 6. Notas de sesión

- 2026-11-18: ADOC-01 sale del backlog y pasa a ser el roadmap activo. Prioridad P0 antes de publicar. No se implementa nada en este paso.
- Puntos de partida: `app/board/apps/aula-documentos/aula-documentos-app.tsx`, `app/board/apps/use-app-document.ts`, `app/board/shared/aula-documentos/mermaid-block.tsx`, `app/board/store/use-desktop-windows.ts` y `app/board/store/store-desktop.tsx`.
- La app conserva un único documento por proyecto. No se añaden revisiones ni concurrencia en esta entrega; quedan en ADOC-07.
