# Guardado con versión entre editores

> **Estado:** ARC-09, Fase 1 · **Fecha:** 2026-11-21
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
| Hoja de cálculo | `useHojaCalculoDocument` | No usa `saveVersioned` | No | No | Solo estado de error | Solo lectura |
| Mapas conceptuales | `mapas-app.tsx` | No | No | No | Solo estado de error | Solo lectura |
| Líneas de tiempo | `useTimelineEditor` | No | No | No | Solo estado de error | Solo lectura |
| Tarjetas | `useTarjetasEditor` | No | No | No | Solo estado de error | Solo lectura |
| Blockly | `useBlockly` | No | No | `createBlocklyState` | Estado local y aviso de guardado | Solo lectura |
| Aula Documentos | `useAulaDocumentApi` + `useAulaPersistence` | Sí | Sí | Copias locales por documento | Diálogo de conflicto | Solo lectura |

## 3. Hallazgos

- El servidor ya soporta `expectedUpdatedAt` para `/api/app-documents` y responde 409 sin pisar el estado.
- `saveVersioned` ya está probado en el cliente; falta integrarlo en los editores.
- Hoja de cálculo ignora `ok` al cargar. Un fallo de red puede parecer una hoja nueva y habilitar un guardado destructivo.
- Tarjetas y otros editores también tratan un estado nulo como documento inicial; cada uno necesita una decisión explícita.
- Blockly ya conserva un respaldo local, pero el guardado remoto sigue siendo incondicional.
- Aula Documentos no debe perder su autosave, su recuperación por documento ni su diálogo de conflicto.
- No hay un componente común de conflicto para las apps; el piloto debe decidir si basta con estado y una acción de recarga.

## 4. Decisiones para el piloto

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
- Blockly conserva su respaldo local y su estado de workspace.
- Mapas, Líneas y Tarjetas conservan sus modelos, permisos y recuperación particular hasta que el piloto demuestre equivalencia.
- Ningún editor debe usar `expectedUpdatedAt: null` para actualizar un documento existente.

## 7. Pruebas que faltan

- Carga correcta seguida de guardado con la versión recibida.
- Segunda sesión que adelanta el guardado y provoca 409.
- Fallo de carga que no se interpreta como hoja nueva.
- Fallo de red al guardar con el borrador intacto.
- Reintento tras conflicto y recarga explícita.
- Invitado sin capacidad de guardado.

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
