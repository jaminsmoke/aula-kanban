# Menús, atajos y barra de estado de Aula Documentos

> **Estado:** UI-11 completado (2026-11-21) · **Fecha:** 2026-11-21
> **Alcance:** inventario de acciones, hogar único, atajos, barra de estado, responsive y accesibilidad.
> **Roadmap:** [`roadmap.md`](roadmap.md) · **Suite:** [`aula-documentos-suite.md`](aula-documentos-suite.md)
> **Regla:** la Fase 1 fijó el contrato; la Fase 2 unificó menús y acciones; la Fase 3 centralizó los atajos y la ayuda; la Fase 4 consolidó la barra de estado, el responsive y la accesibilidad.

---

## 1. Decisión

La interfaz de Aula Documentos se organiza por **acciones**, no por botones aislados.

- Cada acción tiene un `id`, un nombre visible, un hogar principal y, si existe, un atajo.
- Una misma acción puede mostrarse en escritorio y móvil mediante el mismo modelo; eso no cuenta como duplicado.
- Un atajo es una vía alternativa al mismo `id`, no una segunda acción.
- Los paneles laterales ofrecen contexto y acciones propias del panel, pero no repiten Guardar, Importar o Exportar.
- La barra de estado muestra datos derivados; no guarda estado en el documento.
- Los atajos solo se interceptan cuando el foco está dentro de Aula Documentos.
- Los cambios de esta fase no alteran datos, URLs, permisos, MCP ni versión del Site.

## 2. Modelo de acción

```ts
type AulaActionHome =
  | "file-menu"
  | "import-menu"
  | "export-menu"
  | "document-menu"
  | "document-toolbar"
  | "status-bar"
  | "side-panel"
  | "contextual"
  | "shortcut";

type AulaActionDefinition = {
  id: string;
  label: string;
  home: AulaActionHome;
  shortcut?: string;
  scope: "document" | "editor" | "revision" | "app";
  permission: "all" | "editor" | "reviewer";
  responsive: "same" | "menu-only";
};
```

Reglas:

- `id` es estable y no depende del texto traducido.
- Un `id` tiene un solo hogar principal.
- `responsive: "menu-only"` indica que la acción solo aparece en el menú móvil; no crea un `id` nuevo.
- Las acciones destructivas piden confirmación.
- Cada acción tiene etiqueta accesible, estado deshabilitado y motivo cuando corresponda.
- Las acciones sin `editor` se deshabilitan sin desaparecer del modelo.
- El botón, menú o panel que dispara una acción debe devolver el foco a un lugar razonable.

## 3. Inventario actual

### 3.1 Barra superior

| Menú / grupo | Acciones actuales | Observación |
|---|---|---|
| Archivo | Nuevo documento, Copias portables | Dos acciones de ciclo de vida. |
| Importar | Importar documento, Importar copia, Abrir Office, Migrar apps antiguas | La importación no se repite en la barra del documento. |
| Exportar | HTML, PDF, Markdown, DOCX, PPTX, presentación | La exportación no tiene botones directos permanentes. |
| Acciones directas | Presentar, Guardar | Guardar también tiene atajo y variante móvil. |

### 3.2 Barra del documento

| Grupo | Acciones actuales | Observación |
|---|---|---|
| Formato | Párrafo, H1–H3, listas, cita, código, tachado, alineación, línea, limpiar | Menú y botones directos comparten acciones relacionadas. |
| Insertar | Tabla, imagen, diagrama Mermaid, salto de diapositiva | La tabla abre herramientas contextuales. |
| Herramientas directas | Deshacer, rehacer, negrita, cursiva, subrayado, enlace | Se ocultan en modo lectura. |
| Tabla | Cabeceras, combinar/dividir, filas/columnas | Contextual a la tabla. |
| Enlace | Campo, aplicar, quitar, cerrar | Barra contextual; no duplica el menú. |

### 3.3 Barra de estado

- Sección actual del esquema.
- Recuento de palabras.
- Recuento de diagramas.
- Chip único de guardado.
- Comentarios: panel y recuento.
- Historial: solo docentes, administración y owner.
- Modo enfoque.

### 3.4 Paneles laterales

| Panel | Acciones actuales | Límite |
|---|---|---|
| Documentos | Nuevo, abrir, renombrar, duplicar, archivar, eliminar, restaurar | No repite Archivo. |
| Navegación | Esquema, ocultar/mostrar, subir/bajar/duplicar/eliminar diapositiva, deshacer estructura, vista previa | Acciones de estructura propias. |
| Presentación | Tema, página, orientación, márgenes, números, vista previa, PDF de diapositivas, fuente Markdown | No repite Exportar. |
| Comentarios | Crear, responder, editar, resolver, reabrir, borrar, filtrar, paginar, incluir en exportación | No repite Guardar ni Exportar. |
| Historial | Crear, ver, restaurar y paginar versiones | Solo roles de revisión. |

## 4. Auditoría de duplicados

| Acción | Apariciones actuales | Decisión |
|---|---|---|
| Guardar | Barra superior, menú móvil, `Ctrl/Cmd+S` | Hogar: barra superior. Móvil y atajo son variantes del mismo `id`. |
| Presentar | Barra superior, menú móvil | Hogar: barra superior; móvil comparte modelo. |
| Exportar HTML/PDF/Markdown/DOCX/PPTX | Menú Exportar y menú móvil | Hogar: menú Exportar; móvil comparte modelo. |
| Formato | Menú Formato y menú móvil | Hogar: menú Formato; móvil comparte modelo. |
| Insertar | Menú Insertar y menú móvil | Hogar: menú Insertar; móvil comparte modelo. |
| Buscar | Botón lateral y `Ctrl/Cmd+F` | Hogar: botón lateral; atajo alternativo. |
| Comentarios | Barra de estado y `Ctrl/Cmd+Alt+M` | Hogar: barra de estado; atajo alternativo. |
| Historial | Barra de estado | Solo docentes/administración. |
| Esquema | Botón del navegador y `Ctrl/Cmd+Shift+O` | Hogar: navegador; atajo alternativo. |
| Enfoque | Barra de estado y `Alt+Shift+F` | Hogar: barra de estado; atajo alternativo. |

No se detectan dos acciones distintas con el mismo nombre. El riesgo real es la **duplicación de renderizado** entre modelos de escritorio y móvil, que la fase 2 debe unificar.

## 5. Mapa de atajos

| Atajo | Acción | Ámbito |
|---|---|---|
| `Ctrl/Cmd+S` | Guardar | Documento. |
| `Ctrl/Cmd+F` | Abrir búsqueda | Aula. |
| `Ctrl/Cmd+H` | Abrir búsqueda con reemplazo | Aula. |
| `Ctrl/Cmd+Shift+O` | Mostrar u ocultar esquema | Aula. |
| `Alt+Shift+F` | Alternar enfoque | Aula. |
| `Ctrl/Cmd+Alt+M` | Alternar comentarios | Aula. |
| `Ctrl/Cmd+B/I/K` | Negrita, cursiva, enlace | Editor. |
| `Ctrl+Alt+1/2/3` | Título 1/2/3 | Editor. |
| `Enter` / `Shift+Enter` | Siguiente/anterior resultado | Búsqueda. |
| `Escape` | Cerrar búsqueda, diálogo o enfoque | Contexto. |
| `Tab` / `Shift+Tab` | Navegar celdas | Tabla. |
| `Ctrl/Cmd+Enter` | Aplicar código Mermaid | Diagrama. |

Mapa de precedencia de `Escape`:

1. Diálogo abierto.
2. Búsqueda abierta.
3. Modo enfoque.
4. Editor.

Los manejadores actuales están distribuidos entre `use-aula-persistence`, `use-aula-search`, `use-aula-view` y `use-aula-comments`. La fase 3 debe centralizar el mapa sin cambiar los atajos existentes.

## 6. Barra de estado

- Sección actual: último título H1–H3 anterior a la selección; `Sin sección` si no existe.
- Palabras y diagramas: contadores actuales del editor.
- Guardado: chip único ya existente; no se duplica en la barra superior.
- Comentarios: botón y contador del documento activo.
- Historial: botón y contador solo para roles de revisión.
- Enfoque: botón visible y estado de sesión.
- La barra no persiste datos ni cambia el documento.
- En móvil, los datos pueden envolver; los botones mantienen un objetivo táctil suficiente.

## 7. Responsive y accesibilidad

- Se revisan cinco anchos: 360, 480, 640, 900 y 1280 px.
- A menos de 560 px, la barra del documento se sustituye por menús móviles equivalentes.
- Los menús de escritorio y móvil deben usar los mismos `id`, etiquetas y estados.
- Los botones de icono tienen `aria-label`; los menús usan `aria-haspopup`, `aria-expanded` y `role="menu"`.
- La navegación por flechas y `Escape` se mantiene en menús.
- Los paneles laterales no atrapan el foco fuera de su contexto.
- Los estados vacíos no muestran acciones imposibles.
- El modo lectura deshabilita edición, Guardar, estructura e historial según corresponda.
- El foco vuelve al disparador al cerrar menús, paneles y diálogos.

## 8. Matriz de pruebas

| Caso | Debe demostrar |
|---|---|
| Inventario | Toda acción visible tiene `id`, etiqueta y hogar. |
| Sin duplicados | La misma acción no tiene dos hogares permanentes. |
| Escritorio/móvil | El mismo modelo genera ambos menús y mismos estados. |
| Atajos | Cada atajo funciona con el foco correcto y no fuera de Aula. |
| Escape | La precedencia cierra primero búsqueda/diálogo. |
| Roles | Guest, student, teacher y admin ven solo acciones permitidas. |
| Barra de estado | Sección, palabras, diagramas, guardado y revisiones no se duplican. |
| Estados vacíos | No hay botones imposibles ni saltos. |
| Cinco anchos | Sin desbordamiento horizontal ni acciones inalcanzables. |
| Lector de pantalla | Etiquetas, menús y foco son coherentes. |

## 9. Criterio de salida de la Fase 1

- Inventario de acciones y duplicados cerrado.
- Hogar principal, atajo y variante responsive definidos por acción.
- Mapa de atajos y precedencia de `Escape` documentados.
- Contrato de barra de estado y responsive fijado.
- Matriz de pruebas y límites explícitos.
- Sin cambios de código, datos, URLs, permisos ni versión del Site.

## 10. Cierre de la Fase 2

Implementado el 2026-11-21:

- `ToolbarAction` y `AulaMenuAction` incorporan `id` estable y `data-action-id` para pruebas e inspección.
- Las acciones de Archivo, Importar, Exportar, Insertar, Formato y Documento comparten definiciones entre menús, botones directos y menú móvil.
- El menú móvil se agrupa por secciones en lugar de una lista plana; los grupos vacíos no se muestran.
- El menú de formato móvil reutiliza las mismas acciones de formato y herramientas directas.
- Se retiró la lista plana `documentFileActions`; los grupos móviles apuntan a los mismos objetos de acción que los menús de escritorio.
- Pruebas de identificadores únicos, grupos móviles y acción de escritorio compartida.
- Suite: **264 archivos / 1.733 pruebas**; build **385.018 B**; presupuesto **386.000 B**.

## 11. Cierre de la Fase 3

Implementado el 2026-11-21:

- `app/board/apps/aula-documentos/atajos/shortcuts.ts` concentra `AULA_SHORTCUTS` con id, teclas, combinación normalizada, ámbito y descripción.
- `matchesAulaShortcut` exige coincidencia exacta de `Ctrl/Cmd`, `Alt` y `Shift`; evita que un atajo más amplio capture una combinación diferente.
- Persistencia, búsqueda, vista y comentarios usan el matcher; se conservan `Ctrl/Cmd+S`, `Ctrl/Cmd+F`, `Ctrl/Cmd+H`, `Ctrl/Cmd+Shift+O`, `Alt+Shift+F` y `Ctrl/Cmd+Alt+M`.
- La ayuda de `AulaDocumentosShortcuts` se genera desde el mismo mapa, agrupada en Aplicación, Editor y Contexto.
- Los atajos del editor y del contexto se documentan con `intercept: false` y no se capturan globalmente: `B/I/K`, `Ctrl+Alt+1/2/3`, `Enter`/`Shift+Enter`, `Escape`, `Tab`/`Shift+Tab` y `Ctrl/Cmd+Enter`.
- Todos los atajos globales comprueban que el foco esté dentro de `.aula-documentos-app`.
- Pruebas de ids y combinaciones únicas, modificadores exactos, ayuda desde el mapa y apertura/cierre de comentarios solo dentro de Aula.
- Suite: **264 archivos / 1.737 pruebas**; build **385.905 B**; presupuesto **386.000 B**.

## 12. Cierre de la Fase 4

Implementado el 2026-11-21:

- La barra de estado separa `Datos del documento` (sección, palabras, diagramas y guardado) de `Acciones de revisión` (comentarios, historial y enfoque), sin duplicar información.
- Los recuentos y el chip de guardado exponen `aria-label`; comentarios y enfoque declaran `aria-keyshortcuts`.
- El menú móvil enfoca la primera acción, recorre con flechas, cierra con Escape/Tab y devuelve el foco al disparador.
- Comentarios e historial restauran el foco al botón que los abrió; el historial enfoca su control de cierre al abrirse.
- La barra usa container queries de 700 y 430 px, envuelve datos y acciones y mantiene objetivos táctiles de 44 px.
- Pruebas de agrupación accesible, foco de paneles, teclado móvil y contenedores de la barra.
- Presupuesto de Aula Documentos ajustado a **387.000 B** por la barra accesible; build **386.230 B**.
- Suite: **264 archivos / 1.742 pruebas**; arquitectura **456 archivos / 1.136 imports**; `perf:office` correcto. Site `1.1.37`, sin publicación.
