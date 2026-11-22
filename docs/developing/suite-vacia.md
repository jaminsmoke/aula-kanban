# Apertura de una suite documental vacía

> **Estado:** ADOC-22 cerrado (Fases 1-3) · **Fecha:** 2026-11-22
> **Alcance:** carga inicial de Aula Documentos, creación automática del primer documento y estados del panel.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Reproducción

Se reprodujo con una prueba temporal de la suite, retirada después, usando dos respuestas controladas:

1. `GET /api/aula-documentos` responde con una lista vacía.
2. El `POST` automático del primer documento queda pendiente.
3. La suite termina la carga: `loading` pasa a `false`, `documentId` sigue en `null` y el panel muestra «Todavía no hay documentos».
4. Se pulsa «Nuevo»: se envía un segundo `POST` mientras el primero sigue pendiente.
5. Cuando responde el primer `POST`, la suite selecciona el documento inicial y deja el segundo como documento adicional.

Resultado: **dos documentos**, uno de ellos en blanco. La creación automática y la manual no están coordinadas.

También se confirmó por lectura del código que un fallo de `GET` deja `error` informado, pero el panel evalúa el estado vacío sin comprobar `error`, así que puede mostrar error y vacío a la vez.

## 2. Decisión de producto

Se conserva la creación automática del primer documento. El problema no es que exista, sino que el panel no representa el intervalo en el que se está preparando y «Nuevo» sigue disponible.

La apertura debe pasar por estos estados:

| Estado | Condición | Panel | Acción «Nuevo» |
|---|---|---|---|
| Cargando lista | `loading` y sin error | «Cargando documentos.» | Deshabilitada |
| Preparando primero | lista vacía y creación inicial en curso | «Preparando el primer documento…» | Deshabilitada |
| Error | fallo de lista o de creación | Error y «Reintentar» | Disponible solo si no hay preparación en curso |
| Vacío real | lista vacía, sin error ni preparación | «Todavía no hay documentos…» | Habilitada |
| Con documentos | hay documentos activos | Lista y documento seleccionado | Habilitada |

El estado vacío solo puede mostrarse después de una carga correcta y fuera de la preparación inicial. El error siempre tiene prioridad sobre el vacío.

## 3. Invariantes

- Una apertura de un proyecto vacío realiza **como máximo una creación automática**.
- Mientras esa creación está en curso, «Nuevo» está deshabilitado y el hook/controlador no inicia otra creación.
- Tras la creación automática, «Nuevo» crea un documento adicional solo por una acción explícita.
- Un fallo de carga no ejecuta la creación automática ni muestra el estado vacío.
- Un fallo de creación muestra un error comprensible y permite reintentar.
- Un reintento vuelve a leer la lista antes de decidir si hace falta crear; si el documento inicial ya existe, lo selecciona y no crea otro.
- Se conservan la selección del último documento, el parámetro `doc` de la URL y el documento activo al cambiar de proyecto.
- Un proyecto con documentos no inicia ninguna creación automática.

## 4. Casos de prueba para las fases 2 y 3

| Caso | Secuencia | Resultado esperado |
|---|---|---|
| Carrera con «Nuevo» | GET vacío; POST inicial pendiente; pulsar «Nuevo» | Un solo POST inicial; no nace un segundo documento |
| Creación correcta | GET vacío; POST inicial correcto | Un documento, seleccionado; «Nuevo» habilitado después |
| Fallo de creación | GET vacío; POST inicial falla | Error y reintento; sin mensaje de vacío engañoso |
| Fallo de lista | GET falla | Error y reintento; ningún POST; sin mensaje de vacío |
| Reintento con documento | GET falla; reintento devuelve el documento inicial | Se selecciona el documento; no se crea otro |
| Reintento vacío | GET falla; reintento devuelve vacío | Preparación inicial controlada; una sola creación |
| Documento por URL | GET con `doc` válido | Se abre ese documento; sin creación automática |
| Último documento | GET con último documento guardado | Se recupera; sin creación automática |
| «Nuevo» tras preparar | Proyecto vacío; preparación terminada; pulsar «Nuevo» | Un documento adicional, creado por intención explícita |

## 5. Cambios previstos

- **Hook de la suite:** separar carga, preparación inicial y creación; exponer `initializing`/`busy`, error de creación y una acción de reintento.
- **Controlador:** impedir que «Nuevo» cree mientras la preparación inicial esté activa.
- **Panel:** mostrar un mensaje de preparación, deshabilitar «Nuevo», priorizar el error y renderizar el estado vacío solo cuando corresponda.
- **Pruebas:** convertir los casos de la tabla en pruebas del hook y del panel; la reproducción temporal no se conserva.

No se cambia el servidor, el esquema, los permisos ni la navegación por `doc`.

## 6. Baseline

- Arquitectura: **461 archivos / 1.155 imports / 0 problemas**.
- Suite: **268 archivos / 1.784 pruebas**.
- Site: `1.1.40`.
- Aula Documentos, build final: **386.827 / 387.000 B**.
- Commit de apertura del roadmap: `f3635fd`.

## 7. Aplicado en la Fase 2

- `useAulaDocumentSuite` expone `initializing`, mantiene el estado durante la creación automática y publica «No se pudo preparar el primer documento.» si falla.
- `createDocument()` devuelve `null` mientras `initializing` está activo; el panel también deshabilita «Nuevo».
- El panel muestra «Preparando el primer documento…» y solo pinta el estado vacío cuando no hay carga, preparación ni error.
- Se añadieron pruebas de la carrera y del panel; suite completa **268 archivos / 1.781 pruebas**.
- El presupuesto de pruebas de Aula se amplió de **5.400** a **5.500** líneas; el consumo queda en **5.481** tras las pruebas de reintento. `npm run check` y `app:budget` correctos.

## 8. Aplicado en la Fase 3

- `useAulaDocumentSuite` expone `retry()`: limpia el error, vuelve a leer la lista y solo prepara el primer documento si sigue vacía.
- La creación inicial completada queda marcada y no se relanza en un reintento; si el documento ya existe, se selecciona.
- El panel muestra «Reintentar» junto al error y lo deshabilita durante carga o preparación.
- Se cubrieron la carga fallida, la creación inicial fallida y el reintento tras una creación completada.
- Suite completa **268 archivos / 1.784 pruebas**; Aula **54 / 5.481 ≤ 54 / 5.500**; `npm run check` y `app:budget` correctos.
