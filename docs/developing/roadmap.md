# Roadmap UI-16 — Dar prioridad a las tareas en la ficha de alumno

> **Estado:** Activo (2026-11-22) · **Origen:** UI-16 del backlog
> **Backlog:** 6 entradas · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Compactar la cabecera de la ficha de alumno y quitar la repetición del puesto.
- [ ] Dar menos peso a los datos vacíos y acercar la lista de tareas al nombre.
- [ ] Ordenar las tareas por pendientes vencidas, próximas entregas y completadas.
- [ ] Mantener accesibles las acciones de perfil.
- [ ] Criterio de éxito: una ficha parcial no muestra bloques vacíos dominantes y una tarea pendiente vencida aparece antes que una completada.

## 2. Alcance

**Dentro:**

- Ficha de alumno y ficha compartida de profesorado que usa `ProfileDetail`.
- Cabecera, datos de perfil, estado de cuenta y lista de tareas.
- Tareas con fecha pasada, próxima, sin fecha, completadas y estados intermedios.
- Nombres largos, fichas completas y parciales.
- Acciones de edición y eliminación.
- Responsive y contraste existentes.

**Fuera:**

- Cambiar el modelo, la API, los permisos o los datos de tareas.
- Añadir acciones nuevas de perfil.
- Cambiar la tarjeta de alumno en la lista.
- Modificar el calendario o el tablero.
- Publicar en Sites ni aplicar migraciones remotas.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Mostrar el puesto solo en la ficha de datos | Repetirlo en cabecera y datos | Elimina la duplicación sin perder información. |
| Omitir tarjetas de datos vacíos | Mostrar tres bloques con «Sin especificar» | La ficha parcial gana jerarquía y deja espacio a las tareas. |
| Colocar las tareas justo después de la cabecera | Mantener los datos entre nombre y tareas | La prioridad del alumno es qué tiene pendiente. |
| Ordenar con una función pura y probada | Ordenar en el JSX con comparadores ad hoc | El contrato de prioridad queda verificable y reutilizable. |
| Usar `done` como completada | Tratar `review` o `active` como completadas | Solo `done` está terminada; los demás estados siguen pendientes. |
| Ordenar las pendientes sin fecha después de las fechadas | Mezclarlas por `createdAt` | Las próximas entregas deben quedar visibles primero. |
| Mantener las acciones en la cabecera | Moverlas al pie | No se altera su acceso ni su nombre accesible. |

## 4. Punto de partida

- `ProfileDetail` pinta el puesto en la cabecera y otra vez en «Puesto de trabajo».
- Las tarjetas de datos vacíos muestran «Sin especificar» y ocupan la parte alta.
- La lista de tareas aparece después de las tres tarjetas de datos.
- Las tareas se muestran en el orden recibido, sin prioridad por vencimiento o estado.
- Las acciones Editar y Eliminar ya tienen nombre accesible y tooltip.
- Baseline: arquitectura **464 archivos / 1.168 imports**; suite **272 archivos / 1.833 pruebas**; Site `1.1.41`.

## 5. Fases

### Fase 1 — Contrato de datos y prioridad

- [ ] Definir los grupos: pendiente vencida, próxima entrega, sin fecha y completada.
- [ ] Fijar el orden dentro de cada grupo y el criterio de fecha local.
- [ ] Definir qué datos vacíos se omiten y dónde queda el puesto.
- [ ] Mantener las acciones y sus nombres accesibles.
- **Criterios:** el orden es determinista y una ficha parcial no repite ni destaca datos vacíos.

### Fase 2 — Implementación en ProfileDetail

- [ ] Compactar la cabecera y quitar el puesto duplicado.
- [ ] Omitir tarjetas de datos vacíos.
- [ ] Mover la lista de tareas junto al nombre.
- [ ] Aplicar el orden de prioridad a las tareas.
- **Criterios:** pendientes vencidas primero, próximas entregas después y completadas al final; los datos vacíos dejan de dominar.

### Fase 3 — Pruebas de perfiles y tareas

- [ ] Probar ficha completa, parcial, nombre largo y sin tareas.
- [ ] Probar tareas vencidas, próximas, sin fecha y completadas.
- [ ] Verificar edición y eliminación accesibles.
- [ ] Revisar responsive y contraste del bloque compacto.
- **Criterios:** todos los perfiles conservan información y acciones sin depender de datos opcionales.

### Fase 4 — Verificación y cierre

- [ ] Ejecutar `npm run check`, suite completa, build y presupuestos finales.
- [ ] Actualizar documentación, changelog y backlog; archivar este roadmap y reiniciar `roadmap.md`.
- [ ] Push único a GitHub; sin publicación en Sites ni migración remota.
- **Criterios:** flujo verificado; documentación y backlog coherentes; Site sin cambios.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Ocultar un dato importante al omitir vacíos | Pérdida de contexto | Solo se omiten campos vacíos; el estado de cuenta y las tareas permanecen. |
| Orden inestable entre tareas | Saltos visuales | Ordenar por grupo, fecha y creación. |
| Fechas locales mal comparadas | Vencimiento incorrecto | Usar fecha local `YYYY-MM-DD` como el resto del producto. |
| Cambiar también la ficha de profesorado | Regresión compartida | Probar ambos usos de `ProfileDetail`. |
| Perder acciones al compactar | Ficha sin gestión | Mantener los botones y sus nombres accesibles. |
| Nombres largos rompen la cabecera | Desbordamiento | Conservar `min-width:0`, `overflow-wrap` y responsive. |

## 7. Notas de sesión

- 2026-11-22: **Roadmap abierto.** UI-16 entra desde el backlog por la repetición del puesto, los bloques vacíos y el orden de tareas.
- El backlog queda con **6 entradas**: TASK-05, PER-09, UI-13, UI-14, PERM-03 y DEV-01.
- Sin cambios de producto en esta apertura.
