# Roadmap ADOC-14 — Imágenes y recursos dentro del documento

> **Estado:** Activo · **Origen:** ADOC-14 del backlog (2026-11-20)
> **Backlog:** ADOC-15 a ADOC-20, UI-11 y DEV-01 · **Changelog:** [`changelog.md`](changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [ ] Permitir insertar imágenes locales en Aula Documentos, conservarlas en el documento y exportarlas con texto alternativo y pie sin romper autosave, permisos, presentación ni formatos de salida.
- [ ] Criterio de éxito: una persona puede añadir una imagen desde el menú, arrastrarla o pegarla, verla en la hoja y en la presentación, recuperarla al recargar y exportarla; una imagen solo es visible para quien tiene acceso al proyecto, y el documento sigue siendo válido y manejable.

## 2. Alcance

**Dentro:**
- Decidir y aplicar el modelo de almacenamiento de imágenes sobre la infraestructura existente de `uploads` y R2.
- Añadir un nodo de imagen al esquema de Aula Documentos, con texto alternativo, pie, tamaño y alineación.
- Insertar desde el menú **Insertar**, arrastrar y soltar, y pegar desde el portapapeles.
- Reemplazar, eliminar y ajustar imágenes con estados de carga y errores legibles.
- Conservar imágenes, pies y texto alternativo en HTML, DOCX/PPTX, impresión/PDF y presentación.
- Límites de cantidad, tamaño, tipos MIME y cuotas; accesibilidad, seguridad, limpieza de recursos y pruebas.
- Actualizar ayuda, ficha, documentación y presupuestos de rendimiento.

**Fuera de alcance:**
- Editar imágenes dentro del documento (recortar, filtros o anotaciones).
- Convertir Aula Documentos en un gestor de archivos general.
- Sincronizar imágenes desde URLs externas como fuente de verdad.
- Conservar automáticamente el archivo original de Office.
- Publicar en Sites o cambiar la versión del Site (`1.1.37`).
- Implementar comentarios, historial o tablas completas; tienen entradas propias en el backlog.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Reutilizar `/api/uploads` y R2 | Crear un almacén paralelo | Ya existe subida autenticada, MIME, tamaño, metadatos y lectura privada por proyecto. |
| Nueva finalidad `document-image` | Usar `document` para todo | Permite cuotas, métricas y limpieza específicas sin mezclar imágenes con documentos importados. |
| Guardar solo la URL interna `/api/files/:id` | Incrustar base64 en el JSON | Mantiene pequeño el documento, evita duplicar binarios y respeta el acceso privado existente. |
| Nodo propio `aulaImage` | Usar la extensión Image sin más | Necesitamos pie, alineación, tamaño y validación de esquema controlados. |
| Validar MIME y tamaño en servidor y cliente | Confiar solo en la extensión del archivo | Evita SVG activo, archivos sobredimensionados y errores silenciosos. |
| No borrar R2 al quitar un nodo | Borrado inmediato en cada edición | Una operación de edición no debe destruir un recurso compartido o recuperable; la limpieza se reconcilia aparte. |
| Exportar imágenes con su texto alternativo y pie | Exportar solo el `<img>` sin contexto | Accesibilidad y fidelidad editorial en HTML, DOCX/PPTX y PDF. |

## 4. Fases

### Fase 1 — Almacenamiento, esquema y seguridad

- [ ] Auditar el flujo actual de `/api/uploads`, `/api/files/:id`, `uploads` y R2; documentar límites y acceso.
- [ ] Añadir la finalidad `document-image` con MIME permitidos (PNG, JPEG, WebP y GIF), tamaño máximo y cuota por proyecto.
- [ ] Definir el nodo `aulaImage` en el esquema: `src`, `alt`, `caption` opcional, `width`, `alignment` y relación con el recurso subido.
- [ ] Extender `parseAulaDocument` y los límites de JSON/nodos, manteniendo la migración de documentos anteriores.
- [ ] Definir la limpieza de imágenes huérfanas y la recuperación tras eliminar un proyecto o un documento.
- [ ] Probar subida, acceso entre proyectos, MIME falsos, límites, SVG y usuarios invitados.
- **Criterios de aceptación:**
  - Una imagen válida se guarda en R2 y solo la sirve el proyecto autorizado.
  - El documento valida imágenes y rechaza recursos o atributos inseguros.
  - Los documentos existentes siguen cargando sin cambios.

### Fase 2 — Inserción y edición en el documento

- [ ] Añadir **Insertar > Imagen** con selector local y estados de carga.
- [ ] Implementar arrastrar/soltar y pegar imágenes sobre la hoja, con validación y progreso.
- [ ] Crear el NodeView de imagen: texto alternativo, pie, tamaño, alineación, reemplazo y eliminación.
- [ ] Resolver selección, foco, teclado, menú contextual y comportamiento móvil.
- [ ] Mantener autosave, conflicto, copias locales y modo lectura para invitados.
- [ ] Añadir pruebas de inserción, edición, recarga, accesibilidad y errores.
- **Criterios de aceptación:**
  - Insertar, mover y eliminar una imagen no rompe el autosave ni el documento.
  - La imagen se puede describir con texto alternativo y pie desde la interfaz.
  - Los invitados la ven en lectura y no pueden modificarla.

### Fase 3 — Exportación, presentación y cierre

- [ ] Renderizar imágenes y pies en HTML, impresión/PDF y presentación.
- [ ] Exportar imágenes y texto alternativo a DOCX/PPTX con avisos de fidelidad.
- [ ] Resolver las URLs internas y los recursos durante la exportación sin depender de la sesión del navegador.
- [ ] Revisar tamaño, cuotas, rendimiento y presupuesto `aula-documentos`.
- [ ] Actualizar ayuda, ficha, `office.md`, documentación de la suite y changelog.
- [ ] Ejecutar suite, `tsc`, ESLint, build y presupuestos; revisar cinco anchos y ambos temas.
- [ ] Archivar el roadmap, reiniciar `roadmap.md` y dejar el resto del backlog; push único al cerrar.
- **Criterios de aceptación:**
  - La imagen aparece en las salidas acordadas, con texto alternativo y sin recursos externos.
  - Un fallo de almacenamiento muestra un error claro y no deja un nodo roto.
  - El Site no cambia de versión y no se publica desde este roadmap.

## 5. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| R2 no está disponible en un despliegue | No se pueden subir imágenes | Detectar el estado, deshabilitar la acción con explicación y no crear nodos rotos. |
| Imágenes demasiado grandes | Documento lento o cuota agotada | Límites de MIME/tamaño, compresión opcional y cuota por proyecto. |
| SVG o contenido activo | XSS o recursos no confiables | Rechazar SVG; servir con MIME validado y cabeceras seguras. |
| URLs internas en exportaciones | Imágenes rotas fuera de la app | Resolver recursos en el servidor/cliente exportador y probar cada salida. |
| Nodos huérfanos o recursos duplicados | Coste y basura en R2 | Reconciliación de huérfanos y no borrar en cada edición. |
| Edición móvil o teclado deficiente | Imposible insertar o describir imágenes | NodeView accesible, botones de 44 px y pruebas de teclado. |
| Imágenes compartidas entre documentos | Borrado accidental | Modelo de referencia y limpieza conservadora. |

## 6. Notas de sesión

- 2026-11-20: ADOC-14 sale del backlog y pasa a ser el roadmap activo.
- Auditoría inicial: `/api/uploads` ya acepta PNG, JPEG, WebP y GIF de hasta 5 MB y `/api/files/:id` sirve el recurso solo a miembros del proyecto; el editor no tiene nodo de imagen ni la validación de documento lo permite todavía.
- La entrada se limita a imágenes y recursos dentro del documento; tablas, importación ampliada, varios documentos, búsqueda, presentación avanzada y comentarios siguen en el backlog.
- El Site sigue en `1.1.37`; no se publica nada desde este roadmap.
