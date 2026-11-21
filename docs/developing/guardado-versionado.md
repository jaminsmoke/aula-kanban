# Guardado con versión entre editores

> **Estado:** ARC-09 cerrado · **Fecha:** 2026-11-21
> **Alcance:** `useAppDocument`, `useAulaDocumentApi`, persistencia de las apps y recuperación local.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Contrato actual

### `useAppDocument`

- `load()` devuelve `{ state, updatedAt, ok }`.
- Si falla la lectura, devuelve `state: null`, `updatedAt: null` y `ok: false`.
- `save(state)` escribe sin versión esperada.
- `saveVersioned(state, expectedUpdatedAt)` usa `/api/app-documents` y devuelve `saved`, `conflict` o `failed`.
- En conflicto conserva el `updatedAt` local y expone el mensaje de otra sesión.

### Aula Documentos

- `useAulaDocumentApi` usa un endpoint por documento.
- `load()` devuelve el estado y la versión del servidor.
- `saveVersioned` tiene el mismo resultado que el cliente común, pero la API y el modelo de identidad son propios de la suite.
- `useAulaPersistence` añade autosave, copias locales y diálogo de conflicto.
- No debe sustituirse por `useAppDocument` porque el documento tiene identidad y autorización distintas.

## 2. Inventario por editor

| Editor | Persistencia | Versión | Autosave | Recuperación local | Conflicto visible | Invitado |
|---|---|---|---|---|---|---|
| Hoja de cálculo | `useHojaCalculoDocument` | Sí (`saveVersioned`) | No | No | Conserva borrador y pide recarga | Solo lectura |
| Mapas conceptuales | `mapas-app.tsx` | Sí (`saveVersioned`) | No | No | Conserva borrador y permite recargar | Solo lectura |
| Líneas de tiempo | `useTimelineEditor` | Sí (`saveVersioned`) | No | No | Conserva borrador y permite recargar | Solo lectura |
| Tarjetas | `useTarjetasEditor` | Sí (`saveVersioned`) | No | No | Conserva borrador | Solo lectura |
| Blockly | `useBlockly` | No, excepción documentada | No | `createBlocklyState` | Estado local y aviso de guardado | Solo lectura |
| Aula Documentos | `useAulaDocumentApi` + `useAulaPersistence` | Sí | Sí | Copias locales por documento | Diálogo de conflicto | Solo lectura |

## 3. Hallazgos de la Fase 1

- El servidor ya soporta `expectedUpdatedAt` para `/api/app-documents` y responde 409 sin pisar el estado.
- `saveVersioned` ya está probado en el cliente; falta integrarlo en los editores.
- Hoja de cálculo ignora `ok` al cargar. Un fallo de red puede parecer una hoja nueva y habilitar un guardado destructivo.
- Tarjetas y otros editores también tratan un estado nulo como documento inicial; cada uno necesita una decisión explícita.
- Blockly ya conserva un respaldo local, pero el guardado remoto sigue siendo incondicional.
- Aula Documentos no debe perder su autosave, su recuperación por documento ni su diálogo de conflicto.
- No hay un componente común de conflicto para las apps; el piloto debe decidir si basta con estado y una acción de recarga.

## 4. Decisiones del piloto (Fase 1)

- Hoja de cálculo será el primer editor.
- La versión esperada solo se registra después de una carga válida.
- Un fallo de carga no habilita un guardado que pueda crear o sobrescribir el documento.
- Ante un conflicto se conserva `documentValue`; no se recarga automáticamente.
- La recarga del servidor será una acción explícita y perderá el borrador solo si la persona lo confirma.
- Se mantienen los permisos de invitado, la validación del modelo y el estado de guardado actuales.
- No se extrae un componente de conflicto hasta que el piloto demuestre que la interacción se repite.

## 5. Qué puede compartirse después

- Los tipos `LoadedDocument` y `VersionedSaveResult`.
- La interpretación de 409 y de un fallo de red ya viven en `useAppDocument`.
- El helper de recarga explícita solo si lo usan al menos dos editores.
- No se compartirá la recuperación local de Blockly ni el autosave de Aula en esta fase.

## 6. Qué no debe migrarse

- Aula Documentos conserva su API por documento, autosave, copias locales y diálogo de conflicto.
- Blockly conserva `save` y `createBlocklyState`: su respaldo local y su estado de workspace no tienen la misma semántica que el guardado remoto versionado.
- Mapas, Líneas y Tarjetas ya usan `saveVersioned` y mantienen sus modelos, permisos y acciones propias.
- Ningún editor debe usar `expectedUpdatedAt: null` para actualizar un documento existente.

## 7. Cobertura de la Fase 4

- Guardado normal con la versión cargada en Mapas, Líneas y Tarjetas.
- Conflicto 409 que conserva el borrador y avisa sin sobrescribir.
- Fallo de carga que bloquea el guardado en los tres editores.
- Recarga explícita con confirmación en Mapas y Líneas.
- Blockly queda cubierto por su respaldo local existente y su aviso de guardado.

## 8. Baseline

- Arquitectura: **459 archivos / 1.149 imports**.
- Suite: **265 archivos / 1.747 pruebas**.
- Aula Documentos: **386.272 / 387.000 B**.
- Site: `1.1.38`.

## 9. Criterio de salida de la Fase 1

- Cada editor tiene inventariado su contrato de carga, guardado, versión y recuperación.
- El piloto de Hoja de cálculo tiene criterios de conflicto y fallo de carga definidos.
- Está claro qué se comparte y qué se conserva local.
- No se ha cambiado código de producto en esta fase.

## 10. Aplicado en la Fase 2

- Hoja de cálculo registra la versión solo después de una carga válida.
- `saveDocument` usa `saveVersioned` y conserva el `updatedAt` tras un guardado correcto.
- Ante un 409 mantiene el documento local, marca los cambios como pendientes y pide una recarga explícita.
- Si falla la carga inicial o el estado guardado no es válido, no permite guardar hasta recuperar el documento.
- La recarga con cambios locales pide confirmación antes de descartarlos.
- Se mantienen el modo invitado, la validación del modelo y el estado de la hoja.

## 11. Aplicado en la Fase 3

- `app/board/shared/versioned-document.ts` concentra `LoadedDocument` y `VersionedSaveResult`.
- `useAppDocument` los reexporta para conservar su API pública.
- `useAulaDocumentApi` los reutiliza y mantiene sus alias `LoadedAulaDocument` y `AulaDocumentSaveResult`.
- `save` y `saveVersioned` siguen disponibles; no se ha movido la recuperación local de ninguna app.
- El módulo compartido tiene prueba propia del contrato y consumidores reales.

## 12. Aplicado en la Fase 4

- Mapas registra la versión tras una carga válida, usa `saveVersioned` y bloquea el guardado si la lectura falla.
- Líneas de tiempo aplica el mismo contrato y conserva la confirmación antes de recargar con cambios locales.
- Tarjetas usa `saveVersioned`, conserva sus mazos y tarjetas ante conflicto y bloquea el guardado tras un fallo de carga.
- Los tres editores mantienen sus permisos de invitado, sus modelos y sus mensajes de estado.
- Blockly conserva `save` y `createBlocklyState` como excepción documentada por su respaldo local y su estado de workspace.
- Pruebas añadidas para guardado normal, conflicto y carga fallida en cada editor migrado.
- Arquitectura: **460 archivos / 1.151 imports**. Suite: **266 archivos / 1.756 pruebas**.
- Build: Aula Documentos **386.260 / 387.000 B**; Hoja de cálculo **311.063 / 315.000 B**.

## 13. Cierre

- Los clientes anteriores que no envían `expectedUpdatedAt` usan el guardado incondicional y conservan su contrato.
- Las herramientas MCP de Blockly y de la fila histórica de Diagramas mantienen la última escritura; la web versionada detecta el conflicto en el siguiente guardado.
- La ruta `/api/app-documents` sigue aceptando el campo como opcional y responde 409 sin escribir cuando la versión no coincide.
- `npm run check`, la suite, el build y los presupuestos quedan verificados; el Site permanece en `1.1.38` sin publicación.
- Roadmap archivado en [`historial/roadmap-arc-09.md`](../historial/roadmap-arc-09.md).
