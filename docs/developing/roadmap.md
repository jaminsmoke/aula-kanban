# Roadmap ADOC-21 — Copias portables del documento en R2 y en local

> **Estado:** Activo · **Origen:** ADOC-21 del backlog (2026-11-20)
> **Backlog:** ADOC-15 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Permitir archivar una copia completa y portable de Aula Documentos en R2 o en el equipo local, listarla y recuperarla sin convertir R2 en el almacén del documento vivo.
- [ ] Criterio de éxito: una persona puede guardar una copia, verla en la lista del proyecto, descargarla o importarla con vista previa y confirmación; si R2 no está disponible o la cuota está llena, la edición y la descarga local siguen funcionando con un mensaje claro.

## 2. Alcance

**Dentro:**

- Definir el contenedor de copia, su manifiesto, versión de formato y validación.
- Incluir el documento completo y sus imágenes en la copia para que sea portable fuera de la sesión y del proyecto original.
- Guardar copias privadas en R2 con metadatos y cuota por proyecto.
- Listar, descargar y borrar copias de R2 desde Aula Documentos.
- Descargar siempre una copia local, aunque R2 no esté disponible o la cuota esté llena.
- Importar una copia desde R2 o desde el equipo local con vista previa, avisos y confirmación.
- Reutilizar la recuperación local y el diálogo de importación existentes donde sea posible.
- Resolver conflictos, permisos, invitados, imágenes huérfanas y limpieza de copias.
- Actualizar ayuda, ficha, documentación, pruebas y presupuestos de rendimiento.

**Fuera de alcance:**

- Usar R2 como fuente viva del autosave o sustituir D1.
- Copias automáticas programadas, retención legal o historial de versiones con diferencias.
- Comentarios, control de cambios y varios documentos por proyecto; tienen entradas propias en el backlog.
- Enlaces públicos o compartición de copias fuera de los miembros del proyecto.
- Un gestor general de archivos o adjuntos arbitrarios.
- Publicar en Sites o cambiar la versión del Site (`1.1.37`).

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| D1 sigue siendo la fuente viva | Guardar el documento actual en R2 | Autosave, conflictos, permisos y recuperación ya están resueltos en `app_documents`. |
| Copia en ZIP `.aula.zip` con `manifest.json`, `document.json` y `assets/` | JSON con imágenes base64 | Evita inflar el documento y mantiene los binarios separados, con nombre, MIME y tamaño verificables. |
| Nueva finalidad `document-copy` con MIME `application/zip` | Reutilizar la finalidad `document` | Permite cuota, listado, retención y limpieza específicas sin mezclar copias con documentos importados. |
| Metadatos en una tabla `document_copies` | Leer el manifiesto de cada objeto al listar | El listado no debe descargar y descomprimir todas las copias. La tabla guarda título, fecha, autor, tamaño, versión y proyecto. |
| Descarga local generada en el cliente | Depender de R2 para descargar | La copia local debe funcionar con R2 caído o sin cuota. |
| Importar con vista previa y confirmación | Sustituir el documento al elegir el archivo | Evita pérdidas accidentales y permite validar versión, imágenes y conflictos antes de aplicar. |
| Reutilizar `/api/uploads` para las imágenes de la copia restaurada | Incrustar imágenes en el JSON vivo | El esquema `aulaImage` solo admite `/api/files/:id`; las imágenes se vuelven a subir como `document-image`. |
| Borrado manual y limpieza conservadora | Borrado automático por antigüedad | Una copia puede ser la única recuperación; no se elimina sin acción explícita o borrado del proyecto. |
| Límites estrictos de ZIP y manifiesto | Confiar en el archivo elegido | Evita zip bombs, rutas maliciosas, entradas inesperadas y consumos descontrolados. |

## 4. Fases

### Fase 1 — Formato de copia, manifiesto y validadores

- [x] Auditar las utilidades de ZIP disponibles y elegir una dependencia pequeña con licencia compatible; si no encaja, documentar la alternativa y su coste.
- [x] Definir `manifest.json`: versión de formato, versión de esquema, título, fechas, origen, tamaño, lista de assets, MIME y hash.
- [x] Definir `document.json` como documento Aula completo, sin URLs externas ni estados de autosave.
- [x] Empaquetar y desempaquetar la copia con nombres seguros y sin rutas relativas fuera de `assets/`.
- [x] Validar tamaño total, número de entradas, tamaños descomprimidos, MIME de imágenes y documento antes de importar.
- [x] Rechazar zip bombs, entradas duplicadas, manifiestos incompletos, versiones futuras y assets que no use el documento.
- [x] Añadir fixtures de copias válidas, corruptas, antiguas, con imágenes y con intentos de path traversal.
- **Criterios de aceptación:**
  - Una copia generada se puede volver a abrir y validar en otra sesión.
  - Una copia manipulada o sobredimensionada se rechaza con un mensaje claro.
  - El formato incluye todas las imágenes del documento y conserva su MIME, texto alternativo y pie.

### Fase 2 — Persistencia en R2 y API de copias

- [x] Añadir la finalidad `document-copy`, el MIME `application/zip`, el límite por copia y la cuota por proyecto.
- [x] Crear la tabla `document_copies` y su migración: id, proyecto, título, formato, versión de esquema, tamaño, autor y fecha.
- [x] Implementar `GET` de listado, `POST` de creación, `GET` de descarga y `DELETE` de una copia.
- [x] Servir la descarga con nombre de archivo y cabeceras privadas; no exponer objetos de otros proyectos.
- [x] Aplicar cuota y límite de copias por proyecto; devolver errores distintos para cuota llena, R2 no disponible y copia no encontrada.
- [x] Limpiar objetos y metadatos al borrar una copia o un proyecto; reconciliar huérfanos sin tocar el documento vivo.
- [x] Probar listado, permisos de invitado, descarga, borrado, cuota, R2 caído y aislamiento entre proyectos.
- **Criterios de aceptación:**
  - Una copia válida se guarda en R2 y solo la lista y descarga el proyecto autorizado.
  - La cuota llena no bloquea la edición ni la descarga local.
  - Borrar una copia no modifica el documento vivo ni las imágenes que usa.

### Fase 3 — Interfaz de copias y descarga local

- [x] Añadir **Archivo > Copias portables** con acciones para guardar en el proyecto, descargar y borrar.
- [x] Mostrar lista con título, fecha, tamaño, autor y estado; estados vacíos y errores legibles.
- [x] Mantener la descarga local disponible con R2 caído o cuota llena.
- [x] Integrar **Importar > Importar copia** con la vista previa existente y un resumen de imágenes, versión y avisos.
- [x] Exigir confirmación antes de sustituir el documento actual y conservar una copia local de recuperación.
- [x] Resolver teclado, foco, Escape, modo lectura para invitados y comportamiento en móvil.
- [x] Añadir pruebas de UI para guardar, listar, descargar, borrar, R2 caído, cuota llena y permisos.
- **Criterios de aceptación:**
  - Guardar una copia y verla en la lista no altera el autosave ni el documento abierto.
  - La descarga local funciona sin R2 y conserva documento, imágenes y metadatos.
  - Un invitado puede consultar y descargar si el rol lo permite, pero no crear ni borrar copias.

### Fase 4 — Importación completa, imágenes y cierre

- [ ] Importar desde R2 o local, descomprimir con los límites de Fase 1 y previsualizar antes de aplicar.
- [ ] Volver a subir las imágenes como `document-image`, sustituir sus URLs y abortar sin cambios si una subida falla.
- [ ] Mantener el documento actual si la importación no se confirma, falla la cuota o hay conflicto de versión.
- [ ] Guardar una copia de recuperación antes de reemplazar y permitir deshacer la sustitución.
- [ ] Reconciliar imágenes subidas durante una importación abortada sin borrar recursos usados por otros documentos.
- [ ] Actualizar ayuda, ficha, documentación, `changelog.md` y presupuestos; revisar cinco anchos y ambos temas.
- [ ] Archivar el roadmap, reiniciar `roadmap.md` y hacer el push único al cerrar.
- **Criterios de aceptación:**
  - Una copia con imágenes se restaura y el documento abierto conserva sus imágenes, pies y texto alternativo.
  - Un fallo de R2, cuota o validación deja el documento actual intacto y explica el motivo.
  - El Site sigue en `1.1.37`; no se publica desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Zip bomb o archivo manipulado | Consumo de memoria o rutas peligrosas | Límites de entradas, tamaño descomprimido, nombres seguros y validación del manifiesto. |
| Copias grandes por imágenes | Cuota agotada o descargas lentas | Medir el tamaño, limitar copia y proyecto, y mostrar el consumo antes de guardar. |
| R2 no disponible | No se pueden guardar/listar copias | La edición y la descarga local siguen funcionando; mensajes distintos para cada fallo. |
| Importación parcial | Documento roto o imágenes huérfanas | Validar antes, subir imágenes de forma controlada, aplicar al final y reconciliar huérfanos. |
| Duplicar imágenes en R2 | Coste y basura | Reutilizar recursos cuando sea posible y limpiar solo tras confirmar que no hay referencias. |
| Copia sin imágenes | Restauración incompleta | La validación exige que todos los `src` internos tengan un asset en la copia. |
| Dependencia ZIP con licencia o mantenimiento dudoso | Riesgo de seguridad o de proyecto | Auditar licencia, tamaño, mantenimiento y alternativa antes de integrarla. |
| Descarga local confundida con autosave | Pérdida de trabajo | Etiquetar claramente copia portátil y mantener D1 como fuente viva. |

## 6. Notas de sesión

- 2026-11-20: ADOC-21 sale del backlog y pasa a ser el roadmap activo. ADOC-14 quedó cerrado y archivado en [`historial/roadmap-adoc-14.md`](../historial/roadmap-adoc-14.md).
- Auditoría inicial: `/api/uploads` ya guarda recursos privados en R2 y `/api/files/:id` comprueba el proyecto, pero no existe una finalidad de copia, una tabla de metadatos ni listado de copias.
- Las copias locales de recuperación actuales son un mecanismo de seguridad del autosave; no son una copia portable completa con imágenes ni un catálogo importable.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
- 2026-11-20: Fase 1 completada. Añadida `fflate` 0.8.3 (MIT) como dependencia directa y el módulo `lib/domain/aula-documentos/copy.ts` con el formato `.aula.zip`: manifiesto v1, `document.json`, assets con ruta segura, hash SHA-256, límites de tamaño/entradas y validación de MIME real. Las pruebas cubren copia válida, falta o exceso de assets, ZIP corrupto, path traversal, zip bomb, formato/versión futura, hash alterado y manifiesto incompleto. Suite completa: 215 archivos / 1.528 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos: 366.772 / 370.000 B gzip; aula-documentos-export: 329.621 / 340.000 B gzip) y `perf:office` correctos.
- 2026-11-20: Fase 2 completada. Añadida la finalidad `document-copy` (ZIP hasta 60 MB), cuota de 200 MB y máximo de 20 copias por proyecto. La migración `0041` crea `document_copies`; la API ofrece listado, alta, descarga con nombre de archivo y borrado. El alta inspecciona manifiesto y documento sin descomprimir las imágenes, y R2 guarda el ZIP privado. MCP no expone la finalidad nueva y la purga de archivos protege las copias. Pruebas de API, cuotas, permisos, descarga, borrado, R2 caído y aislamiento entre proyectos. Suite completa: 217 archivos / 1.544 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos: 366.844 / 370.000 B gzip; aula-documentos-export: 329.698 / 340.000 B gzip) y `perf:office` correctos.
- 2026-11-20: Fase 3 completada. Añadido **Archivo > Copias portables** con guardado en el proyecto, listado, descarga, borrado y descarga local independiente de R2. **Importar > Importar copia** lee el ZIP, muestra título, estadísticas, imágenes, versión y avisos, exige confirmación y guarda una copia local de recuperación antes de aplicar. Los invitados pueden listar y descargar, pero no crear ni borrar. Pruebas de UI para guardar, listar, descargar, borrar, R2 caído, cuota llena, permisos e importación con confirmación. Suite completa: 217 archivos / 1.550 pruebas; `tsc`, ESLint, build, `perf:budget` (aula-documentos: 369.921 / 370.000 B gzip; aula-documentos-export: 329.694 / 340.000 B gzip) y `perf:office` correctos.
