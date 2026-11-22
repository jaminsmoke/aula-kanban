# Modelo de vista de Aula Documentos

> **Estado:** ARC-12 cerrado · **Fecha:** 2026-11-22
> **Alcance:** `useAulaDocumentosModel`, el contexto de Aula Documentos y sus consumidores.
> **Roadmap:** [`roadmap.md`](roadmap.md)

## 1. Resultado del inventario

- `useAulaDocumentosModel` declara **182 propiedades explícitas** y **8 spreads**, es decir, **190 entradas de nivel superior**.
- Al expandir los spreads, el contrato expone **285 nombres únicos**. El backlog registraba 190 porque contaba las entradas del objeto de retorno, no los campos expandidos.
- Hay **11 archivos de producto** que consumen el contexto; **234 campos** tienen consumidor directo y **51 no lo tienen**.
- Tres nombres (`content`, `notes`, `selection`) salen de un objeto interno del hook de estructura de diapositivas, no de su retorno público; se excluyen de la tabla.
- Ningún cambio de producto en esta fase.

## 2. Método

- Se analizó el objeto devuelto por `useAulaDocumentosModel` con TypeScript AST.
- Se mapeó cada campo a la llamada de hook que lo produce.
- Se recorrieron los archivos de producto que llaman a `useAulaDocumentosView()` y se extrajeron sus desestructuraciones; las pruebas y el proveedor de contexto no cuentan como consumidores.
- Un campo sin consumidor directo es un **candidato a revisión**, no una retirada automática: puede usarlo otro hook dentro del modelo o un consumidor que no desestructure el contexto.

## 3. Consumidores

| Etiqueta | Archivo | Campos |
|---|---|---:|
| copy-import | `app/board/apps/aula-documentos/components/dialogs/document-copy-import-dialogs.tsx` | 58 |
| overlay | `app/board/apps/aula-documentos/components/dialogs/document-overlay-dialogs.tsx` | 26 |
| state | `app/board/apps/aula-documentos/components/dialogs/document-state-dialogs.tsx` | 38 |
| comments-panel | `app/board/apps/aula-documentos/components/document-comments-panel.tsx` | 12 |
| history-panel | `app/board/apps/aula-documentos/components/document-history-panel.tsx` | 12 |
| navigator | `app/board/apps/aula-documentos/components/document-navigator.tsx` | 17 |
| search-bar | `app/board/apps/aula-documentos/components/document-search-bar.tsx` | 18 |
| status-bar | `app/board/apps/aula-documentos/components/document-status-bar.tsx` | 19 |
| suite-panel | `app/board/apps/aula-documentos/components/document-suite-panel.tsx` | 12 |
| toolbar | `app/board/apps/aula-documentos/components/document-toolbar.tsx` | 29 |
| workspace | `app/board/apps/aula-documentos/components/document-workspace.tsx` | 35 |

Los diálogos de copia/importación, overlay y estado se cargan bajo demanda desde `document-workspace`; el resto de consumidores participa en la apertura o en la barra principal.

## 4. Origen y saldo

| Origen | Campos expandidos | Con consumidor | Sin consumidor directo |
|---|---:|---:|---:|
| `model` | 2 | 1 | 1 |
| `useAulaSession` | 23 | 15 | 8 |
| `useAulaImages` | 5 | 1 | 4 |
| `useAulaLink` | 9 | 8 | 1 |
| `useAulaPresentation` | 23 | 20 | 3 |
| `useAulaExports` | 9 | 2 | 7 |
| `useAulaPersistence` | 23 | 22 | 1 |
| `useAulaRecovery` | 12 | 12 | 0 |
| `useAulaCopies` | 26 | 24 | 2 |
| `useAulaNewDocument` | 9 | 8 | 1 |
| `useAulaImport` | 28 | 25 | 3 |
| `useAulaMigration` | 9 | 8 | 1 |
| `useAulaDocumentSuite` | 4 | 4 | 0 |
| `suiteActions` | 7 | 7 | 0 |
| `search` | 19 | 18 | 1 |
| `view` | 6 | 4 | 2 |
| `navigation` | 6 | 6 | 0 |
| `slideStructure` | 6 | 5 | 1 |
| `comments` | 11 | 10 | 1 |
| `versions` | 14 | 14 | 0 |
| `toolbarModel` | 34 | 20 | 14 |
| **Total** | **285** | **234** | **51** |

## 5. Candidatos a revisar

Estos campos no tienen una desestructuración directa en los consumidores de producto. La Fase 2 debe comprobar si los usa otro hook del modelo; si no, no deben reenviarse por el contexto.

| Campo | Origen | Nota |
|---|---|---|
| `projectId` | `model` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `setTitle` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `lastSavedAt` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `status` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `wordCount` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `diagramCount` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `setPresentationTheme` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `setPresentationNotes` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `setPresentationPage` | `useAulaSession` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `imageUploading` | `useAulaImages` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openImagePicker` | `useAulaImages` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `insertMermaid` | `useAulaImages` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `insertSlideBreak` | `useAulaImages` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openLinkPanel` | `useAulaLink` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openMigration` | `useAulaMigration` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportingPresentation` | `useAulaPresentation` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `startPresentation` | `useAulaPresentation` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportPresentation` | `useAulaPresentation` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exporting` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `printing` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportingOffice` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportHtml` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `printDocument` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportMarkdown` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportOffice` | `useAulaExports` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `error` | `useAulaPersistence` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openCopies` | `useAulaCopies` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openCopyImportPicker` | `useAulaCopies` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openNewDocument` | `useAulaNewDocument` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openImport` | `useAulaImport` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `importMarkdown` | `useAulaImport` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `importOffice` | `useAulaImport` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `activeMatch` | `search` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `enterFocus` | `view` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exitFocus` | `view` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `structureHistoryLength` | `slideStructure` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `refreshComments` | `comments` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `savedLabel` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportHtmlAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `printAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportMarkdownAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportDocxAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportPptxAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `exportPresentationAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `newDocumentAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `copiesAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `importDocumentAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `importCopyAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `openOfficeAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `migrationAction` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |
| `directFormatActions` | `toolbarModel` | Sin consumidor directo; verificar uso interno antes de retirar. |

## 6. Inventario completo

Los consumidores se abrevian con las etiquetas de la sección 3.

| Campo | Origen | Consumidores |
|---|---|---|
| `projectId` | `model` | — |
| `readOnly` | `model` | copy-import, navigator, overlay, search-bar, status-bar, suite-panel, toolbar, workspace |
| `editor` | `useAulaSession` | comments-panel, navigator, toolbar, workspace |
| `toolbar` | `useAulaSession` | toolbar |
| `title` | `useAulaSession` | workspace |
| `setTitle` | `useAulaSession` | — |
| `dirty` | `useAulaSession` | overlay, state, status-bar |
| `saving` | `useAulaSession` | copy-import, overlay, state |
| `saveFailed` | `useAulaSession` | copy-import, workspace |
| `lastSavedAt` | `useAulaSession` | — |
| `status` | `useAulaSession` | — |
| `wordCount` | `useAulaSession` | — |
| `diagramCount` | `useAulaSession` | — |
| `actionsOpen` | `useAulaSession` | toolbar |
| `setActionsOpen` | `useAulaSession` | toolbar |
| `presentationTheme` | `useAulaSession` | overlay, workspace |
| `setPresentationTheme` | `useAulaSession` | — |
| `presentationNotes` | `useAulaSession` | overlay |
| `setPresentationNotes` | `useAulaSession` | — |
| `presentationPage` | `useAulaSession` | workspace |
| `setPresentationPage` | `useAulaSession` | — |
| `titleRef` | `useAulaSession` | workspace |
| `actionsRef` | `useAulaSession` | toolbar |
| `actionsToggleRef` | `useAulaSession` | toolbar |
| `updateTitle` | `useAulaSession` | workspace |
| `imageUploading` | `useAulaImages` | — |
| `openImagePicker` | `useAulaImages` | — |
| `insertImageFiles` | `useAulaImages` | toolbar |
| `insertMermaid` | `useAulaImages` | — |
| `insertSlideBreak` | `useAulaImages` | — |
| `linkOpen` | `useAulaLink` | toolbar |
| `setLinkOpen` | `useAulaLink` | toolbar |
| `linkUrl` | `useAulaLink` | toolbar |
| `setLinkUrl` | `useAulaLink` | toolbar |
| `linkError` | `useAulaLink` | toolbar |
| `setLinkError` | `useAulaLink` | toolbar |
| `openLinkPanel` | `useAulaLink` | — |
| `applyLink` | `useAulaLink` | toolbar |
| `removeLink` | `useAulaLink` | toolbar |
| `migrationOpen` | `useAulaMigration` | overlay, workspace |
| `setMigrationOpen` | `useAulaMigration` | overlay |
| `migrationStatus` | `useAulaMigration` | overlay |
| `migrationLoading` | `useAulaMigration` | overlay |
| `migrationError` | `useAulaMigration` | overlay |
| `migrationNotice` | `useAulaMigration` | overlay |
| `migrationRef` | `useAulaMigration` | overlay |
| `openMigration` | `useAulaMigration` | — |
| `runMigration` | `useAulaMigration` | overlay |
| `preparingPresentation` | `useAulaPresentation` | navigator, workspace |
| `presentation` | `useAulaPresentation` | overlay, workspace |
| `exportingPresentation` | `useAulaPresentation` | — |
| `slidePreview` | `useAulaPresentation` | overlay, workspace |
| `setSlidePreview` | `useAulaPresentation` | overlay |
| `markdownSourceOpen` | `useAulaPresentation` | overlay, workspace |
| `setMarkdownSourceOpen` | `useAulaPresentation` | overlay |
| `markdownSourceDraft` | `useAulaPresentation` | overlay |
| `setMarkdownSourceDraft` | `useAulaPresentation` | overlay |
| `markdownSourceError` | `useAulaPresentation` | overlay |
| `slidePreviewRef` | `useAulaPresentation` | overlay |
| `markdownSourceRef` | `useAulaPresentation` | overlay |
| `startPresentation` | `useAulaPresentation` | — |
| `openSlidePreview` | `useAulaPresentation` | navigator, workspace |
| `openMarkdownSource` | `useAulaPresentation` | workspace |
| `applyMarkdownSource` | `useAulaPresentation` | overlay |
| `changePresentationTheme` | `useAulaPresentation` | workspace |
| `changePresentationPage` | `useAulaPresentation` | workspace |
| `changeSlideNote` | `useAulaPresentation` | overlay |
| `exportPresentation` | `useAulaPresentation` | — |
| `printingPresentation` | `useAulaPresentation` | workspace |
| `printPresentation` | `useAulaPresentation` | workspace |
| `closePresentation` | `useAulaPresentation` | overlay |
| `exporting` | `useAulaExports` | — |
| `printing` | `useAulaExports` | — |
| `exportingOffice` | `useAulaExports` | — |
| `includeCommentsInExport` | `useAulaExports` | comments-panel |
| `setIncludeCommentsInExport` | `useAulaExports` | comments-panel |
| `exportHtml` | `useAulaExports` | — |
| `printDocument` | `useAulaExports` | — |
| `exportMarkdown` | `useAulaExports` | — |
| `exportOffice` | `useAulaExports` | — |
| `recoveryOpen` | `useAulaRecovery` | state, workspace |
| `recoveryCopies` | `useAulaRecovery` | state |
| `recoveryCount` | `useAulaRecovery` | workspace |
| `recoveryRestoreId` | `useAulaRecovery` | state |
| `setRecoveryRestoreId` | `useAulaRecovery` | state |
| `recoveryNotice` | `useAulaRecovery` | state |
| `setRecoveryNotice` | `useAulaRecovery` | state |
| `recoveryRef` | `useAulaRecovery` | state |
| `openRecoveryCopies` | `useAulaRecovery` | workspace |
| `closeRecoveryCopies` | `useAulaRecovery` | state |
| `downloadRecoveryCopy` | `useAulaRecovery` | state |
| `restoreRecoveryCopy` | `useAulaRecovery` | state |
| `loading` | `useAulaPersistence` | copy-import |
| `error` | `useAulaPersistence` | — |
| `closePromptOpen` | `useAulaPersistence` | copy-import, workspace |
| `setClosePromptOpen` | `useAulaPersistence` | copy-import |
| `invalidDocument` | `useAulaPersistence` | copy-import, state, workspace |
| `invalidDocumentRef` | `useAulaPersistence` | state |
| `invalidResetConfirm` | `useAulaPersistence` | state |
| `setInvalidResetConfirm` | `useAulaPersistence` | state |
| `saveConflict` | `useAulaPersistence` | state, status-bar, workspace |
| `setSaveConflict` | `useAulaPersistence` | state |
| `conflictNotice` | `useAulaPersistence` | state |
| `setConflictNotice` | `useAulaPersistence` | state |
| `closePromptRef` | `useAulaPersistence` | copy-import |
| `conflictRef` | `useAulaPersistence` | state |
| `loadSavedDocument` | `useAulaPersistence` | state |
| `downloadInvalidDocument` | `useAulaPersistence` | state |
| `resetInvalidDocument` | `useAulaPersistence` | state |
| `closeWithoutSaving` | `useAulaPersistence` | copy-import |
| `saveAndClose` | `useAulaPersistence` | copy-import |
| `saveCurrent` | `useAulaPersistence` | workspace |
| `downloadConflictCopy` | `useAulaPersistence` | state |
| `reloadServerVersion` | `useAulaPersistence` | state |
| `keepMineVersion` | `useAulaPersistence` | state |
| `copiesOpen` | `useAulaCopies` | copy-import, workspace |
| `copies` | `useAulaCopies` | copy-import |
| `copiesLoading` | `useAulaCopies` | copy-import |
| `copiesError` | `useAulaCopies` | copy-import |
| `copyNotice` | `useAulaCopies` | copy-import |
| `copySaving` | `useAulaCopies` | copy-import |
| `copyDeleteId` | `useAulaCopies` | copy-import |
| `setCopyDeleteId` | `useAulaCopies` | copy-import |
| `copyImport` | `useAulaCopies` | copy-import |
| `copyImportOpen` | `useAulaCopies` | copy-import, workspace |
| `copyImportConfirm` | `useAulaCopies` | copy-import |
| `setCopyImportConfirm` | `useAulaCopies` | copy-import |
| `copyImportBusy` | `useAulaCopies` | copy-import |
| `copyImportError` | `useAulaCopies` | copy-import |
| `copiesRef` | `useAulaCopies` | copy-import |
| `copyImportRef` | `useAulaCopies` | copy-import |
| `openCopies` | `useAulaCopies` | — |
| `closeCopies` | `useAulaCopies` | copy-import |
| `saveCurrentCopy` | `useAulaCopies` | copy-import |
| `downloadLocalCopy` | `useAulaCopies` | copy-import |
| `downloadStoredCopy` | `useAulaCopies` | copy-import |
| `removeStoredCopy` | `useAulaCopies` | copy-import |
| `openCopyImportPicker` | `useAulaCopies` | — |
| `prepareCopyImport` | `useAulaCopies` | toolbar |
| `closeCopyImport` | `useAulaCopies` | copy-import |
| `applyCopyImport` | `useAulaCopies` | copy-import |
| `newDocumentOpen` | `useAulaNewDocument` | state, workspace |
| `newDocumentPreview` | `useAulaNewDocument` | state |
| `setNewDocumentPreview` | `useAulaNewDocument` | state |
| `newDocumentError` | `useAulaNewDocument` | state |
| `newDocumentRef` | `useAulaNewDocument` | state |
| `openNewDocument` | `useAulaNewDocument` | — |
| `closeNewDocument` | `useAulaNewDocument` | state |
| `selectNewDocumentTemplate` | `useAulaNewDocument` | state |
| `applyNewDocument` | `useAulaNewDocument` | state |
| `importOpen` | `useAulaImport` | copy-import, workspace |
| `importPreview` | `useAulaImport` | copy-import |
| `setImportPreview` | `useAulaImport` | copy-import |
| `importOfficeSource` | `useAulaImport` | copy-import |
| `officeOpenSource` | `useAulaImport` | copy-import |
| `officePreviewOpen` | `useAulaImport` | copy-import, workspace |
| `setOfficePreviewOpen` | `useAulaImport` | copy-import |
| `officePreviewTitle` | `useAulaImport` | copy-import |
| `setOfficePreviewTitle` | `useAulaImport` | copy-import |
| `importLoading` | `useAulaImport` | copy-import |
| `importError` | `useAulaImport` | copy-import |
| `setImportError` | `useAulaImport` | copy-import |
| `importConfirm` | `useAulaImport` | copy-import |
| `setImportConfirm` | `useAulaImport` | copy-import |
| `pasteText` | `useAulaImport` | copy-import |
| `setPasteText` | `useAulaImport` | copy-import |
| `importFile` | `useAulaImport` | copy-import |
| `importPasted` | `useAulaImport` | copy-import |
| `importRef` | `useAulaImport` | copy-import |
| `officePreviewRef` | `useAulaImport` | copy-import |
| `officeOpenInputRef` | `useAulaImport` | toolbar |
| `openImport` | `useAulaImport` | — |
| `closeImport` | `useAulaImport` | copy-import |
| `closeOfficePreview` | `useAulaImport` | copy-import |
| `openOfficeViewer` | `useAulaImport` | toolbar |
| `importMarkdown` | `useAulaImport` | — |
| `importOffice` | `useAulaImport` | — |
| `applyImport` | `useAulaImport` | copy-import |
| `suite` | `useAulaDocumentSuite` | suite-panel |
| `suiteDocumentId` | `useAulaDocumentSuite` | suite-panel |
| `suiteLoading` | `useAulaDocumentSuite` | suite-panel |
| `suiteError` | `useAulaDocumentSuite` | suite-panel |
| `openSuiteDocument` | `suiteActions` | suite-panel |
| `createSuiteDocument` | `suiteActions` | suite-panel |
| `duplicateSuiteDocument` | `suiteActions` | suite-panel |
| `renameSuiteDocument` | `suiteActions` | suite-panel |
| `archiveSuiteDocument` | `suiteActions` | suite-panel |
| `deleteSuiteDocument` | `suiteActions` | suite-panel |
| `restoreSuiteDocument` | `suiteActions` | suite-panel |
| `searchOpen` | `search` | search-bar |
| `replaceOpen` | `search` | search-bar |
| `query` | `search` | search-bar |
| `setQuery` | `search` | search-bar |
| `replacement` | `search` | search-bar |
| `setReplacement` | `search` | search-bar |
| `caseSensitive` | `search` | search-bar |
| `setCaseSensitive` | `search` | search-bar |
| `diacriticsSensitive` | `search` | search-bar |
| `setDiacriticsSensitive` | `search` | search-bar |
| `matches` | `search` | search-bar |
| `activeIndex` | `search` | search-bar |
| `activeMatch` | `search` | — |
| `openSearch` | `search` | workspace |
| `closeSearch` | `search` | search-bar |
| `goNext` | `search` | search-bar |
| `goPrevious` | `search` | search-bar |
| `replaceCurrent` | `search` | search-bar |
| `replaceAll` | `search` | search-bar |
| `focusMode` | `view` | status-bar, workspace |
| `outlineOpen` | `view` | navigator |
| `enterFocus` | `view` | — |
| `exitFocus` | `view` | — |
| `toggleFocus` | `view` | status-bar |
| `toggleOutline` | `view` | navigator |
| `outline` | `navigation` | navigator, status-bar |
| `slides` | `navigation` | navigator |
| `activeOutlineIndex` | `navigation` | navigator, status-bar |
| `activeSlideIndex` | `navigation` | navigator |
| `jumpToOutline` | `navigation` | navigator |
| `jumpToSlide` | `navigation` | navigator |
| `canUndoStructure` | `slideStructure` | navigator |
| `structureHistoryLength` | `slideStructure` | — |
| `moveSlide` | `slideStructure` | navigator |
| `duplicateSlide` | `slideStructure` | navigator |
| `deleteSlide` | `slideStructure` | navigator |
| `undoStructure` | `slideStructure` | navigator |
| `commentsOpen` | `comments` | comments-panel, status-bar |
| `commentCount` | `comments` | comments-panel, status-bar |
| `comments` | `comments` | comments-panel |
| `commentsLoading` | `comments` | comments-panel |
| `commentsError` | `comments` | comments-panel |
| `openComments` | `comments` | status-bar |
| `closeComments` | `comments` | comments-panel, status-bar |
| `refreshComments` | `comments` | — |
| `createComment` | `comments` | comments-panel |
| `updateComment` | `comments` | comments-panel |
| `canComment` | `comments` | comments-panel |
| `historyOpen` | `versions` | history-panel, status-bar |
| `versions` | `versions` | history-panel |
| `versionCount` | `versions` | history-panel, status-bar |
| `versionsLoading` | `versions` | history-panel |
| `versionsError` | `versions` | history-panel |
| `versionPreview` | `versions` | history-panel |
| `versionPreviewLoading` | `versions` | history-panel |
| `canManageHistory` | `versions` | status-bar |
| `openHistory` | `versions` | status-bar |
| `closeHistory` | `versions` | history-panel, status-bar |
| `createVersion` | `versions` | history-panel |
| `previewVersion` | `versions` | history-panel |
| `restoreVersion` | `versions` | history-panel |
| `clearVersionPreview` | `versions` | history-panel |
| `statusText` | `toolbarModel` | workspace |
| `savedLabel` | `toolbarModel` | — |
| `chipText` | `toolbarModel` | status-bar |
| `wordLabel` | `toolbarModel` | status-bar |
| `diagramLabel` | `toolbarModel` | status-bar |
| `slideLabel` | `toolbarModel` | workspace |
| `importExcerpt` | `toolbarModel` | copy-import |
| `importSourceDate` | `toolbarModel` | copy-import |
| `newDocumentExcerpt` | `toolbarModel` | state |
| `newDocumentWordCount` | `toolbarModel` | state |
| `newDocumentDiagramCount` | `toolbarModel` | state |
| `saveDocumentAction` | `toolbarModel` | toolbar |
| `exportHtmlAction` | `toolbarModel` | — |
| `printAction` | `toolbarModel` | — |
| `exportMarkdownAction` | `toolbarModel` | — |
| `exportDocxAction` | `toolbarModel` | — |
| `exportPptxAction` | `toolbarModel` | — |
| `presentAction` | `toolbarModel` | toolbar |
| `exportPresentationAction` | `toolbarModel` | — |
| `newDocumentAction` | `toolbarModel` | — |
| `copiesAction` | `toolbarModel` | — |
| `importDocumentAction` | `toolbarModel` | — |
| `importCopyAction` | `toolbarModel` | — |
| `openOfficeAction` | `toolbarModel` | — |
| `migrationAction` | `toolbarModel` | — |
| `archiveMenuActions` | `toolbarModel` | toolbar |
| `importMenuActions` | `toolbarModel` | toolbar |
| `formatMenuActions` | `toolbarModel` | toolbar |
| `insertMenuActions` | `toolbarModel` | toolbar |
| `mobileActionGroups` | `toolbarModel` | toolbar |
| `exportMenuActions` | `toolbarModel` | toolbar |
| `directFormatActions` | `toolbarModel` | — |
| `groups` | `toolbarModel` | toolbar |
| `mobileFormatMenuActions` | `toolbarModel` | toolbar |

## 7. Prioridades para la Fase 2

- Empezar por `useAulaCopies`, `useAulaImport` y `useAulaToolbarModel`, que concentran campos y reenvíos.
- Revisar primero los 51 candidatos sin consumidor directo; separar los que se usan dentro del modelo de los que pueden dejar de exponerse.
- Mantener en el modelo la coordinación que cruza capacidades: guardado antes de cambiar de documento, copia de recuperación y estado de conflicto.
- No tocar la carga diferida ni convertir los diálogos en consumidores del modelo completo.

## 8. Baseline

- Arquitectura: **461 archivos / 1.154 imports**.
- Suite: **268 archivos / 1.774 pruebas**.
- Aula Documentos: **386.778 / 387.000 B**.
- Hoja de cálculo: **312.861 / 315.000 B**.
- Site: `1.1.39`.

## 9. Aplicado en la Fase 2

- Se retiraron del valor de contexto cinco propiedades que no tenían consumidor directo: `openCopies`, `openCopyImportPicker`, `openImport`, `importMarkdown` e `importOffice`.
- Las tres primeras siguen disponibles dentro del modelo para construir las acciones de la toolbar; las dos últimas dejan de exponerse también desde `useAulaImport`.
- El modelo pasa de **594 a 586 líneas** y `useAulaImport` de **373 a 372**: **9 líneas netas menos**.
- El contrato expandido baja de **285 a 280 campos**; el retorno declarado queda en **181 entradas** (173 explícitas + 8 spreads) y los candidatos sin consumidor directo bajan de **51 a 46**.
- Suite de Aula enfocada: **36 archivos / 181 pruebas**; suite completa: **268 archivos / 1.774 pruebas**. Sin cambios de comportamiento.

## 10. Aplicado en la Fase 3

- Se retiraron del contexto **46 campos**: 27 entradas del modelo, 14 del modelo de toolbar y 5 campos de hooks que entraban por spread (`activeMatch`, `enterFocus`, `exitFocus`, `structureHistoryLength` y `refreshComments`).
- Las acciones y etiquetas retiradas siguen existiendo dentro de sus hooks para construir menús y grupos; solo dejan de reenviarse por el contexto.
- El retorno declarado queda en **154 entradas** (146 explícitas + 8 spreads); el contrato expandido baja de **280 a 234 campos** y los candidatos sin consumidor directo pasan de **46 a 0**.
- Saldo: modelo **587 → 560 líneas**, toolbar **392 → 378** y hooks de spread **-5**: **46 líneas netas menos**.
- Suite completa **268 / 1.774**; Aula **36 / 181**; build Aula **386.670 / 387.000 B**; Hoja **312.870 / 315.000 B**.
- Editor, guardado, conflicto, solo lectura y presentación conservan su comportamiento; la carga diferida no cambia.

## 11. Cierre

- El contexto de Aula Documentos conserva solo campos con consumidor directo; las acciones internas siguen en sus hooks.
- No se cambió el comportamiento, el guardado, los permisos, las URLs ni el esquema.
- Suite **268 archivos / 1.774 pruebas**; Aula **36 / 181**; build Aula **386.658 / 387.000 B**; Hoja **312.862 / 315.000 B**.
- El Site permanece en `1.1.39`; roadmap archivado en [`historial/roadmap-arc-12.md`](../historial/roadmap-arc-12.md).
