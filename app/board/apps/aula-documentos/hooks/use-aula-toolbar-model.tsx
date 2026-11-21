import type { Editor } from "@tiptap/core";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Archive,
  Bold,
  Code,
  Code2,
  Download,
  Eraser,
  FileDown,
  FilePlus2,
  FileText,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  History,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Minus,
  MonitorPlay,
  Pilcrow,
  Presentation,
  Printer,
  Quote,
  Redo2,
  Save,
  SeparatorHorizontal,
  Strikethrough,
  Underline,
  Undo2,
  Upload,
} from "lucide-react";
import { buildPresentationSlides } from "../../../../../lib/domain/aula-documentos/presentation";
import { countMermaidBlocks } from "../exportacion/export-html";
import type { AulaMenuAction } from "../aula-documentos-menu";
import type { ToolbarAction } from "../aula-documentos-types";
import { countWords, contentText } from "../../../../../lib/domain/aula-documentos/text";
import { formatSavedTime } from "../utils/document-view";
import { formatDateTime } from "../../../shared/ui/date";

type ToolbarModelDeps = {
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveFailed: boolean;
  status: string;
  dirty: boolean;
  readOnly: boolean;
  saveConflict: unknown;
  lastSavedAt: number | null;
  wordCount: number;
  diagramCount: number;
  editor: Editor | null;
  toolbar: { canUndo: boolean; canRedo: boolean; bold: boolean; italic: boolean; underline: boolean; link: boolean; canLink: boolean; paragraph: boolean; heading1: boolean; heading2: boolean; heading3: boolean; bulletList: boolean; orderedList: boolean; taskList: boolean; blockquote: boolean; code: boolean; codeBlock: boolean; strike: boolean; alignLeft: boolean; alignCenter: boolean; alignRight: boolean; alignJustify: boolean };
  invalidDocument: unknown;
  importPreview: { document: { content: unknown }; source: string; sourceUpdatedAt: number | null } | null;
  newDocumentPreview: { document: { content: unknown } } | null;
  presentation: unknown;
  preparingPresentation: boolean;
  exporting: boolean;
  printing: boolean;
  exportingPresentation: boolean;
  exportingOffice: boolean;
  imageUploading: boolean;
  officeOpenInputRef: { current: HTMLInputElement | null };
  saveCurrent: (automatic: boolean) => Promise<boolean>;
  exportHtml: () => Promise<void>;
  printDocument: () => Promise<void>;
  exportMarkdown: () => void;
  exportOffice: (format: "docx" | "pptx") => Promise<void>;
  startPresentation: () => Promise<void>;
  exportPresentation: () => Promise<void>;
  openNewDocument: () => void;
  openCopies: () => void;
  openImport: () => void;
  openCopyImportPicker: () => void;
  openMigration: () => void;
  openImagePicker: () => void;
  insertMermaid: () => void;
  insertSlideBreak: () => void;
  openLinkPanel: () => void;
};

/**
 * Construye etiquetas y acciones de la barra de Aula Documentos.
 * @param deps - Estado y acciones que consume la barra.
 * @returns Modelo listo para el toolbar.
 */
export function useAulaToolbarModel(deps: ToolbarModelDeps) {
  const {
    loading,
    error,
    saving,
    saveFailed,
    status,
    dirty,
    readOnly,
    saveConflict,
    lastSavedAt,
    wordCount,
    diagramCount,
    editor,
    toolbar,
    invalidDocument,
    importPreview,
    newDocumentPreview,
    presentation,
    preparingPresentation,
    exporting,
    printing,
    exportingPresentation,
    exportingOffice,
    imageUploading,
    officeOpenInputRef,
    saveCurrent,
    exportHtml,
    printDocument,
    exportMarkdown,
    exportOffice,
    startPresentation,
    exportPresentation,
    openNewDocument,
    openCopies,
    openImport,
    openCopyImportPicker,
    openMigration,
    openImagePicker,
    insertMermaid,
    insertSlideBreak,
    openLinkPanel,
  } = deps;

  const statusText = loading
    ? "Cargando documento…"
    : error ?? (saving || saveFailed ? status : dirty ? `${status} Cambios sin guardar.` : status);
  const savedLabel = lastSavedAt === null ? "Sin guardar" : `Guardado ${formatSavedTime(lastSavedAt)}`;
  const chipText = readOnly
    ? "Solo lectura"
    : saveConflict
      ? "Conflicto sin resolver"
      : saving
        ? "Guardando…"
        : saveFailed
          ? "Error al guardar"
          : dirty
            ? "Cambios sin guardar"
            : savedLabel;
  const wordLabel = wordCount === 1 ? "1 palabra" : `${wordCount} palabras`;
  const diagramLabel = diagramCount === 1 ? "1 diagrama" : `${diagramCount} diagramas`;
  const slideCount = editor ? buildPresentationSlides(editor.getJSON()).length : 0;
  const slideLabel = slideCount === 1 ? "1 diapositiva" : `${slideCount} diapositivas`;
  const importExcerpt = importPreview
    ? contentText(importPreview.document.content).replace(/\s+/g, " ").trim().slice(0, 260)
    : "";
  const importSourceUpdatedLabel = importPreview ? formatDateTime(importPreview.sourceUpdatedAt) : null;
  const importSourceDate = importPreview
    ? importPreview.source === "markdown" || importPreview.source === "office"
      ? "Archivo local"
      : importSourceUpdatedLabel
        ? `Actualizado en el origen: ${importSourceUpdatedLabel}`
        : "Fecha de origen no disponible."
    : "";
  const newDocumentText = newDocumentPreview ? contentText(newDocumentPreview.document.content) : "";
  const newDocumentExcerpt = newDocumentText.replace(/\s+/g, " ").trim().slice(0, 260);
  const newDocumentWordCount = countWords(newDocumentText);
  const newDocumentDiagramCount = newDocumentPreview
    ? countMermaidBlocks(newDocumentPreview.document.content as never)
    : 0;

  const saveDocumentAction: ToolbarAction = {
    id: "save-document",
    label: "Guardar documento",
    icon: <Save size={15} aria-hidden />,
    onClick: () => { void saveCurrent(false); },
    disabled: readOnly || saving || loading || !editor || Boolean(invalidDocument) || Boolean(saveConflict),
  };
  const exportHtmlAction: ToolbarAction = {
    id: "export-html",
    label: "Exportar HTML",
    icon: exporting ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Download size={15} aria-hidden />,
    onClick: () => { void exportHtml(); },
    disabled: !editor || exporting || Boolean(invalidDocument),
  };
  const printAction: ToolbarAction = {
    id: "print-document",
    label: "Imprimir o guardar PDF",
    icon: printing ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Printer size={15} aria-hidden />,
    onClick: () => { void printDocument(); },
    disabled: !editor || printing || Boolean(invalidDocument),
  };
  const exportMarkdownAction: ToolbarAction = {
    id: "export-markdown",
    label: "Exportar Markdown",
    icon: <FileDown size={15} aria-hidden />,
    onClick: exportMarkdown,
    disabled: !editor || Boolean(invalidDocument),
  };
  const exportDocxAction: ToolbarAction = {
    id: "export-docx",
    label: "Exportar DOCX",
    icon: exportingOffice ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <FileText size={15} aria-hidden />,
    onClick: () => { void exportOffice("docx"); },
    disabled: !editor || exportingOffice || Boolean(invalidDocument),
  };
  const exportPptxAction: ToolbarAction = {
    id: "export-pptx",
    label: "Exportar PPTX",
    icon: exportingOffice ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Presentation size={15} aria-hidden />,
    onClick: () => { void exportOffice("pptx"); },
    disabled: !editor || exportingOffice || Boolean(invalidDocument),
  };
  const presentAction: ToolbarAction = {
    id: "present-document",
    label: "Presentar documento",
    icon: <MonitorPlay size={15} aria-hidden />,
    onClick: () => { void startPresentation(); },
    disabled: preparingPresentation || Boolean(presentation),
  };
  const exportPresentationAction: ToolbarAction = {
    id: "export-presentation",
    label: "Exportar presentación",
    icon: exportingPresentation ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Presentation size={15} aria-hidden />,
    onClick: () => { void exportPresentation(); },
    disabled: !editor || exportingPresentation,
  };
  const newDocumentAction: ToolbarAction = {
    id: "new-document",
    label: "Nuevo documento",
    icon: <FilePlus2 size={15} aria-hidden />,
    onClick: openNewDocument,
    disabled: readOnly || !editor || Boolean(invalidDocument) || saving || loading,
  };
  const copiesAction: ToolbarAction = {
    id: "document-copies",
    label: "Copias portables",
    icon: <Archive size={15} aria-hidden />,
    onClick: openCopies,
    disabled: loading || Boolean(invalidDocument),
  };
  const importDocumentAction: ToolbarAction = {
    id: "import-document",
    label: "Importar documento",
    icon: <Upload size={15} aria-hidden />,
    onClick: openImport,
    disabled: readOnly || !editor || Boolean(invalidDocument),
  };
  const importCopyAction: ToolbarAction = {
    id: "import-copy",
    label: "Importar copia",
    icon: <Archive size={15} aria-hidden />,
    onClick: openCopyImportPicker,
    disabled: readOnly || !editor || Boolean(invalidDocument) || loading,
  };
  const openOfficeAction: ToolbarAction = {
    id: "open-office",
    label: "Abrir Office",
    icon: <FileText size={15} aria-hidden />,
    onClick: () => officeOpenInputRef.current?.click(),
    disabled: loading,
  };
  const migrationAction: ToolbarAction = {
    id: "migrate-legacy-apps",
    label: "Migrar apps antiguas",
    icon: <History size={15} aria-hidden />,
    onClick: openMigration,
    disabled: loading || Boolean(invalidDocument),
  };

  const archiveMenuActions: AulaMenuAction[] = [
    { id: newDocumentAction.id, label: newDocumentAction.label, icon: newDocumentAction.icon, onSelect: newDocumentAction.onClick, disabled: newDocumentAction.disabled },
    { id: copiesAction.id, label: copiesAction.label, icon: copiesAction.icon, onSelect: copiesAction.onClick, disabled: copiesAction.disabled },
  ];
  const importMenuActions: AulaMenuAction[] = [
    { id: importDocumentAction.id, label: importDocumentAction.label, icon: importDocumentAction.icon, onSelect: importDocumentAction.onClick, disabled: importDocumentAction.disabled },
    { id: importCopyAction.id, label: importCopyAction.label, icon: importCopyAction.icon, onSelect: importCopyAction.onClick, disabled: importCopyAction.disabled },
    { id: openOfficeAction.id, label: openOfficeAction.label, icon: openOfficeAction.icon, onSelect: openOfficeAction.onClick, disabled: openOfficeAction.disabled },
    { id: migrationAction.id, label: migrationAction.label, icon: migrationAction.icon, onSelect: migrationAction.onClick, disabled: migrationAction.disabled },
  ];
  const formatMenuActions: AulaMenuAction[] = editor && !readOnly ? [
    { id: "paragraph", label: "Párrafo", icon: <Pilcrow size={15} aria-hidden />, active: toolbar.paragraph, onSelect: () => editor.chain().focus().setParagraph().run() },
    { id: "heading-1", label: "Título 1", icon: <Heading1 size={15} aria-hidden />, active: toolbar.heading1, shortcut: "Ctrl+Alt+1", onSelect: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: "heading-2", label: "Título 2", icon: <Heading2 size={15} aria-hidden />, active: toolbar.heading2, shortcut: "Ctrl+Alt+2", onSelect: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: "heading-3", label: "Título 3", icon: <Heading3 size={15} aria-hidden />, active: toolbar.heading3, shortcut: "Ctrl+Alt+3", onSelect: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: "bullet-list", label: "Lista con viñetas", icon: <List size={15} aria-hidden />, active: toolbar.bulletList, onSelect: () => editor.chain().focus().toggleBulletList().run() },
    { id: "ordered-list", label: "Lista numerada", icon: <ListOrdered size={15} aria-hidden />, active: toolbar.orderedList, onSelect: () => editor.chain().focus().toggleOrderedList().run() },
    { id: "task-list", label: "Lista de tareas", icon: <ListChecks size={15} aria-hidden />, active: toolbar.taskList, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).toggleTaskList().run() },
    { id: "blockquote", label: "Cita", icon: <Quote size={15} aria-hidden />, active: toolbar.blockquote, onSelect: () => editor.chain().focus().toggleBlockquote().run() },
    { id: "inline-code", label: "Código en línea", icon: <Code size={15} aria-hidden />, active: toolbar.code, onSelect: () => editor.chain().focus().toggleCode().run() },
    { id: "code-block", label: "Bloque de código", icon: <Code2 size={15} aria-hidden />, active: toolbar.codeBlock, onSelect: () => editor.chain().focus().toggleCodeBlock().run() },
    { id: "strike", label: "Tachado", icon: <Strikethrough size={15} aria-hidden />, active: toolbar.strike, onSelect: () => editor.chain().focus().toggleStrike().run() },
    { id: "align-left", label: "Alinear a la izquierda", icon: <AlignLeft size={15} aria-hidden />, active: toolbar.alignLeft, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("left").run() },
    { id: "align-center", label: "Centrar", icon: <AlignCenter size={15} aria-hidden />, active: toolbar.alignCenter, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("center").run() },
    { id: "align-right", label: "Alinear a la derecha", icon: <AlignRight size={15} aria-hidden />, active: toolbar.alignRight, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("right").run() },
    { id: "align-justify", label: "Justificar", icon: <AlignJustify size={15} aria-hidden />, active: toolbar.alignJustify, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).setTextAlign("justify").run() },
    { id: "horizontal-rule", label: "Línea horizontal", icon: <Minus size={15} aria-hidden />, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).setHorizontalRule().run() },
    { id: "clear-format", label: "Limpiar formato", icon: <Eraser size={15} aria-hidden />, onSelect: () => editor.chain().focus(undefined, { scrollIntoView: false }).unsetAllMarks().clearNodes().run() },
  ] : [];
  const insertMenuActions: AulaMenuAction[] = editor && !readOnly ? [
    { id: "insert-table", label: "Insertar tabla", icon: <List size={15} aria-hidden />, onSelect: () => window.dispatchEvent(new Event("aula-documentos:insert-table")) },
    { id: "insert-image", label: "Insertar imagen", icon: <ImagePlus size={15} aria-hidden />, onSelect: openImagePicker, disabled: imageUploading },
    { id: "insert-mermaid", label: "Insertar diagrama Mermaid", icon: <GitBranch size={15} aria-hidden />, onSelect: insertMermaid },
    { id: "insert-slide-break", label: "Insertar salto de diapositiva", icon: <SeparatorHorizontal size={15} aria-hidden />, onSelect: insertSlideBreak },
  ] : [];
  const exportMenuActions: AulaMenuAction[] = [
    { id: exportHtmlAction.id, label: exportHtmlAction.label, icon: exportHtmlAction.icon, onSelect: exportHtmlAction.onClick, disabled: exportHtmlAction.disabled },
    { id: printAction.id, label: printAction.label, icon: printAction.icon, onSelect: printAction.onClick, disabled: printAction.disabled },
    { id: exportMarkdownAction.id, label: exportMarkdownAction.label, icon: exportMarkdownAction.icon, onSelect: exportMarkdownAction.onClick, disabled: exportMarkdownAction.disabled },
    { id: exportDocxAction.id, label: exportDocxAction.label, icon: exportDocxAction.icon, onSelect: exportDocxAction.onClick, disabled: exportDocxAction.disabled },
    { id: exportPptxAction.id, label: exportPptxAction.label, icon: exportPptxAction.icon, onSelect: exportPptxAction.onClick, disabled: exportPptxAction.disabled },
    { id: exportPresentationAction.id, label: exportPresentationAction.label, icon: exportPresentationAction.icon, onSelect: exportPresentationAction.onClick, disabled: exportPresentationAction.disabled },
  ];
  const directFormatActions: ToolbarAction[] = editor && !readOnly ? [
    { id: "undo", label: "Deshacer", icon: <Undo2 size={15} aria-hidden />, disabled: !toolbar.canUndo, onClick: () => editor.chain().focus().undo().run() },
    { id: "redo", label: "Rehacer", icon: <Redo2 size={15} aria-hidden />, disabled: !toolbar.canRedo, onClick: () => editor.chain().focus().redo().run() },
    { id: "bold", label: "Negrita", icon: <Bold size={15} aria-hidden />, active: toolbar.bold, onClick: () => editor.chain().focus().toggleBold().run() },
    { id: "italic", label: "Cursiva", icon: <Italic size={15} aria-hidden />, active: toolbar.italic, onClick: () => editor.chain().focus().toggleItalic().run() },
    { id: "underline", label: "Subrayado", icon: <Underline size={15} aria-hidden />, active: toolbar.underline, onClick: () => editor.chain().focus().toggleUnderline().run() },
    { id: "link", label: "Insertar o editar enlace", icon: <Link2 size={15} aria-hidden />, active: toolbar.link, disabled: !toolbar.canLink, onClick: openLinkPanel },
  ] : [];
  const groups: ToolbarAction[][] = editor && !readOnly ? [
    directFormatActions.slice(0, 2),
    directFormatActions.slice(2),
  ] : [];
  const mobileFormatMenuActions: AulaMenuAction[] = [
    ...directFormatActions.map((action) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      active: action.active,
      disabled: action.disabled,
      onSelect: action.onClick,
    })),
    ...formatMenuActions,
  ];
  const documentMenuActions: AulaMenuAction[] = [
    { id: presentAction.id, label: presentAction.label, icon: presentAction.icon, onSelect: presentAction.onClick, disabled: presentAction.disabled },
    { id: saveDocumentAction.id, label: saveDocumentAction.label, icon: saveDocumentAction.icon, shortcut: "Ctrl/Cmd+S", onSelect: saveDocumentAction.onClick, disabled: saveDocumentAction.disabled },
  ];
  const mobileActionGroups: Array<{ id: string; label: string; actions: AulaMenuAction[] }> = [
    { id: "file", label: "Archivo", actions: archiveMenuActions },
    { id: "import", label: "Importar", actions: importMenuActions },
    { id: "export", label: "Exportar", actions: exportMenuActions },
    { id: "insert", label: "Insertar", actions: insertMenuActions },
    { id: "document", label: "Documento", actions: documentMenuActions },
  ];

  return {
    statusText,
    savedLabel,
    chipText,
    wordLabel,
    diagramLabel,
    slideLabel,
    importExcerpt,
    importSourceDate,
    newDocumentExcerpt,
    newDocumentWordCount,
    newDocumentDiagramCount,
    saveDocumentAction,
    exportHtmlAction,
    printAction,
    exportMarkdownAction,
    exportDocxAction,
    exportPptxAction,
    presentAction,
    exportPresentationAction,
    newDocumentAction,
    copiesAction,
    importDocumentAction,
    importCopyAction,
    openOfficeAction,
    migrationAction,
    archiveMenuActions,
    importMenuActions,
    formatMenuActions,
    insertMenuActions,
    mobileActionGroups,
    exportMenuActions,
    directFormatActions,
    groups,
    mobileFormatMenuActions,
  };
}
