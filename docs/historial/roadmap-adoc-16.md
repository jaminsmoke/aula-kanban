# Roadmap ADOC-16 — Importar como flujo propio y más formatos

> **Estado:** Completada (2026-11-21) · **Origen:** ADOC-16 del backlog
> **Backlog:** 5 entradas · **Changelog:** [`changelog.md`](../developing/changelog.md)
> **Publicación:** la despliega y verifica Codex de OpenAI; este roadmap no cambia la versión del Site.

---

## 1. Objetivo

- [x] Unificar archivo, arrastre, pegado y migración en una entrada comprensible.
- [x] Ofrecer una vista previa común con origen, avisos y confirmación antes de reemplazar.
- [x] Añadir texto plano y JSON canónico de Aula; evaluar HTML y descartar ODT/RTF/XLSX.
- [x] Evitar reemplazos duplicados y conservar visible el origen de cada importación.
- [x] Documentar los formatos aceptados, sus límites y lo que se pierde en cada uno.
- [x] Criterio de éxito: toda importación externa entra por el mismo diálogo, se previsualiza, no reemplaza sin copia de recuperación y no promete formatos que no admite.

## 2. Alcance

**Dentro:**

- Un único diálogo **Importar documento** con selector de archivo, zona de arrastre y área de pegado.
- Formatos: Markdown y DOCX/PPTX existentes; TXT y JSON canónico de Aula nuevos.
- Vista previa única: título, extracto, métricas, avisos, origen y confirmación.
- Detección de contenido idéntico al documento abierto antes de reemplazar.
- Conservación del nombre y tipo de origen en la vista previa, el aviso de guardado y la copia local.
- Pruebas de flujo, límites y errores; ayuda y `docs/developing/aula-documentos-import.md`.

**Fuera:**

- ODT, RTF y otros formatos que exigirían una librería nueva.
- Importar XLSX en Aula Documentos: sigue en el visor Office.
- HTML: se evalúa y se descarta si no hay un conversor seguro sin dependencias nuevas.
- Cambiar el esquema del documento, las URLs, los permisos, el MCP o la versión del Site.
- Incrustar las imágenes o notas que el conversor de Office ya omite con aviso.

## 3. Decisiones de arquitectura

| Decisión | Alternativa descartada | Motivo |
|---|---|---|
| Un diálogo para archivo, arrastre y pegado | Una acción distinta por origen | El riesgo y la confirmación son los mismos; el origen solo cambia la lectura. |
| Reutilizar `markdownToDocument`, `parseAulaDocument` y `officeMarkdownToPreview` | Un conversor nuevo por formato | Mantiene una sola validación y un solo modelo canónico. |
| TXT se convierte en párrafos literales | Interpretar TXT como Markdown | Un `.txt` no debería convertir `#` o `*` en estructura. |
| El pegado se interpreta como Markdown | Pegado siempre como texto literal | La vista previa muestra el resultado y permite pegar Markdown real. |
| JSON acepta el documento canónico y las copias de recuperación descargadas | Aceptar cualquier JSON | Ambos pasan por `parseAulaDocument`; un JSON arbitrario se rechaza con mensaje. |
| HTML queda fuera si exige un parser nuevo | Añadir una dependencia de saneado | El presupuesto y la superficie de seguridad no justifican el formato en este bloque. |
| Duplicado por huella del documento canónico | Comparar nombres de archivo | El mismo contenido puede llegar con otro nombre; el nombre no detecta duplicados. |
| El origen se muestra, no se guarda en el documento | Añadir metadatos al esquema | Evita una migración de datos y cambios en copias, exportaciones y MCP. |

## 4. Punto de partida

- El menú **Importar** ofrece cuatro acciones: Importar documento, Importar copia, Abrir Office y Migrar apps antiguas.
- El diálogo de documento vive en `components/dialogs/document-copy-import-dialogs.tsx` (491 líneas) y la lectura en `hooks/use-aula-import.ts` (212).
- Formatos actuales: `.md`/`.markdown` y `text/plain` como Markdown; DOCX/PPTX con `@silurus/ooxml`; XLSX solo en el visor; los archivos con macros se rechazan.
- Office omite imágenes y notas del orador con aviso. La importación siempre sustituye el documento tras confirmar y guardar una copia local de recuperación.
- No hay arrastre, pegado, TXT literal, JSON ni detección de duplicados. `office-import.ts` compartido tiene 68 líneas; los conversores de dominio, 160 y 148.
- Referencia de pruebas: `aula-documentos-documents.test.tsx` (264 líneas) cubre Markdown, Office y migración.
- Suite: **243 archivos / 1.647 pruebas**. Presupuesto `aula-documentos`: **370.000 B gzip**. Site: `1.1.37`.

## 5. Fases

### Fase 1 — Contrato, matriz de formatos y límites

- [x] Inventariar las cuatro acciones, sus archivos, límites y pruebas actuales.
- [x] Fijar el contrato de entrada (`archivo`, `arrastre` o `pegado`) y la vista previa común.
- [x] Crear `docs/developing/aula-documentos-import.md` con la matriz de formatos, límites y pérdidas.
- [x] Decidir HTML con una razón escrita y dejar ODT/RTF/XLSX fuera del flujo.
- **Criterios:** la matriz distingue aceptado, rechazado y convertido con aviso; no cambia el comportamiento; las pruebas existentes siguen en verde.
- **Cierre (2026-11-20):** `aula-documentos-import.md` reúne las cuatro acciones, el contrato de entrada/vista previa, la matriz de formatos, los límites y las pérdidas. HTML se descarta sin parser ni saneado nuevos; TXT será literal y el pegado Markdown; JSON solo canónico. Sin cambios de código; pruebas dirigidas de importación, Office, copias, recuperación y presentación en verde.

### Fase 2 — Un solo diálogo con archivo, arrastre y pegado

- [x] Sustituir los dos selectores ocultos por una zona de arrastre y un selector único.
- [x] Añadir un área de pegado que use el conversor de Markdown y muestre la misma vista previa.
- [x] Enrutar Markdown, DOCX y PPTX por el contrato común; conservar **Ver original** para Office.
- [x] Mantener confirmación, copia de recuperación previa y estados de carga/error; revisar foco y teclado.
- **Criterios:** archivo, arrastre y pegado llegan a la misma vista previa; cancelar no cambia nada; no se reemplaza sin confirmación y copia; pruebas de los tres caminos.
- **Cierre (2026-11-20):** el diálogo usa una zona de arrastre y un selector único, más un área de pegado Markdown; los tres caminos comparten vista previa, confirmación y copia de recuperación. `use-aula-import` enruta por extensión/MIME y conserva «Ver original» para Office. Pruebas de archivo, arrastre y pegado en verde; sin cambios de URLs, permisos ni versión.

### Fase 3 — TXT, JSON canónico y decisión sobre HTML

- [x] Convertir `.txt` en párrafos literales, conservando saltos y avisando de que no se interpreta formato.
- [x] Aceptar JSON de documento canónico y JSON descargado de una copia de recuperación, validado con `parseAulaDocument`.
- [x] Rechazar HTML, ODT, RTF y otros formatos con un mensaje que explique el motivo.
- [x] Aplicar los límites existentes de Markdown/JSON y añadir pruebas de borde: vacío, demasiado grande, esquema inválido y saltos CRLF.
- **Criterios:** TXT y JSON se previsualizan y validan; HTML queda documentado como no admitido; ningún formato nuevo evita la validación canónica.
- **Cierre (2026-11-20):** `import-formats.ts` convierte TXT en párrafos literales y valida JSON canónico con `parseAulaDocument`. El selector y el arrastre enrutan `.txt` y `.json`; HTML, ODT, RTF y PDF se rechazan con mensaje. Pruebas de dominio y de flujo TXT/JSON/HTML en verde; sin cambios de esquema, URLs, permisos ni versión.

### Fase 4 — Duplicados, origen y documentación

- [x] Comparar la huella del documento canónico con el documento abierto y bloquear el reemplazo idéntico con un aviso claro.
- [x] Mostrar nombre de archivo o app de origen en la vista previa y en el mensaje posterior a la importación.
- [x] Actualizar la ayuda y `aula-documentos-import.md` con el flujo real, los límites y las pérdidas.
- [x] Cubrir duplicado, origen, cancelación y formatos rechazados; medir `app:budget` y `perf:budget`.
- **Criterios:** reimportar el mismo contenido no destruye ni duplica; el origen es visible; la documentación coincide con la UI; presupuestos y suite en verde.
- **Cierre (2026-11-20):** la huella del documento validado bloquea reimportar contenido idéntico al documento abierto; la vista previa y el mensaje muestran el nombre de archivo o «Texto pegado»; la ayuda y la matriz documentan el flujo. Pruebas de duplicado, origen y cancelación, `app:budget` y `perf:budget` en verde.

## 6. Riesgos y bloqueos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| HTML amplía el alcance | Parser, saneado y dependencia nueva | Decisión explícita en Fase 1; si no hay conversor seguro, se rechaza con motivo. |
| El diálogo supera las 600 líneas | Difícil de revisar y probar | Extraer la lectura a hooks/dominio y mantener la vista como composición. |
| Presupuesto `aula-documentos` ajustado | Superar 370.000 B gzip | Reutilizar conversores, cargas diferidas y medir en cada fase. |
| JSON grande o inválido | Bloqueo o pérdida al reemplazar | Validar con `parseAulaDocument`, límite de longitud y copia de recuperación previa. |
| Arrastre y pegado inaccesibles | El flujo no funciona con teclado | Selector y textarea nativos, foco visible y pruebas de teclado. |
| Detección de duplicado demasiado agresiva | Impedir una importación intencionada | Solo bloquear si el documento canónico es idéntico al abierto; el aviso explica cómo continuar. |
| Metadatos de origen en el esquema | Migración y cambios en copias/MCP | Mantener el origen en la UI y la copia local, no en `AulaDocument`. |

## 7. Notas de sesión

- 2026-11-20: ADOC-16 sale del backlog y pasa a ser el roadmap activo. El backlog queda con **6 entradas**; siguiente candidato **ADOC-17**.
- Punto de partida: suite **243 archivos / 1.647 pruebas**, presupuesto `aula-documentos` **370.000 B gzip** y Site en `1.1.37`.
- No se ha cambiado código de producto al abrir este roadmap; no hay publicación ni migraciones remotas.
