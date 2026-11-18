"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Code,
  Code2,
  Download,
  Ellipsis,
  FileDown,
  FilePenLine,
  FilePlus2,
  FileText,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MonitorPlay,
  NotebookPen,
  Pilcrow,
  Presentation,
  Printer,
  Quote,
  Redo2,
  Save,
  SeparatorHorizontal,
  Underline,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  AULA_DOCUMENT_TITLE_MAX_LENGTH,
  AULA_PRESENTATION_THEMES,
  DEFAULT_AULA_PRESENTATION,
  createEmptyAulaDocument,
  normalizeAulaLink,
  parseAulaDocument,
  type AulaDocument,
  type AulaPresentationTheme,
} from "../../../../lib/domain/aula-documentos/document";
import {
  importLegacyDocument,
  type AulaDocumentImportPreview,
  type AulaDocumentImportSource,
} from "../../../../lib/domain/aula-documentos/importers";
import { aulaFileName, aulaRecoveryFileName } from "../../../../lib/domain/aula-documentos/filename";
import {
  AULA_DOCUMENT_MARKDOWN_MAX_LENGTH,
  documentToMarkdown,
  markdownToDocument,
} from "../../../../lib/domain/aula-documentos/markdown";
import { buildPresentationSlides } from "../../../../lib/domain/aula-documentos/presentation";
import { createStarterAulaDocument } from "../../../../lib/domain/aula-documentos/starter";
import {
  AULA_DOCUMENT_TEMPLATES,
  type AulaDocumentTemplate,
} from "../../../../lib/domain/aula-documentos/templates";
import { MERMAID_TEMPLATES } from "../../../../lib/domain/mermaid/templates";
import { useAppDocument } from "../use-app-document";
import { useWindowClose, useWindowCloseGuard } from "../../store/window-close-guard";
import type { StoreRole } from "../types";
import { createAulaDocumentExtensions } from "../../shared/aula-documentos/document-extensions";
import { buildAulaDocumentHtml, buildAulaPresentationHtml, collectMermaidCodes, countMermaidBlocks, renderAulaContentHtml, renderMermaidSvgs } from "../../shared/aula-documentos/export-html";
import { flushMermaidDrafts, setMermaidDraftChangeHandler } from "../../shared/aula-documentos/mermaid-block";
import { getMermaidRenderer } from "../../shared/aula-documentos/mermaid-renderer";
import { printHtmlDocument } from "../../shared/aula-documentos/print-html";
import "./aula-documentos.css";

const PresentationView = lazy(() => import("../../shared/aula-documentos/presentation-view").then((module) => ({
  default: module.PresentationView,
})));

/** Espera antes de guardar automáticamente tras una edición. */
export const AUTOSAVE_DELAY_MS = 1_600;

type ToolbarAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

type ToolbarState = {
  paragraph: boolean;
  heading1: boolean;
  heading2: boolean;
  heading3: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  orderedList: boolean;
  blockquote: boolean;
  code: boolean;
  codeBlock: boolean;
  link: boolean;
  canLink: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

const EMPTY_TOOLBAR_STATE: ToolbarState = {
  paragraph: false,
  heading1: false,
  heading2: false,
  heading3: false,
  bold: false,
  italic: false,
  underline: false,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  code: false,
  codeBlock: false,
  link: false,
  canLink: false,
  canUndo: false,
  canRedo: false,
};

const IMPORT_LABELS: Record<AulaDocumentImportSource | "markdown", string> = {
  documentos: "Notas y documentos",
  mermaid: "Diagramas",
  presentaciones: "Presentaciones",
  markdown: "Markdown",
};

type ImportPreviewState = AulaDocumentImportPreview & {
  sourceUpdatedAt: number | null;
};

/**
 * Botón de la barra de formato.
 * @param props - Acción y estado del botón.
 * @returns El botón accesible.
 */
function ToolButton({ action }: { action: ToolbarAction }) {
  return (
    <button
      type="button"
      className={`aula-documentos-tool${action.active ? " is-active" : ""}`}
      onClick={action.onClick}
      aria-label={action.label}
      title={action.label}
      aria-pressed={action.active === undefined ? undefined : action.active}
      disabled={action.disabled}
    >
      {action.icon}
    </button>
  );
}

/**
 * Acciones de archivo de la barra de formato.
 * @param props - Acciones disponibles.
 * @returns Los botones en orden.
 */
function FileActions({ actions }: { actions: ToolbarAction[] }) {
  return <>{actions.map((action) => <ToolButton action={action} key={action.label} />)}</>;
}

/**
 * Menú de acciones con etiquetas visibles en pantallas estrechas.
 * @param props - Acciones y selector.
 * @returns Los elementos del menú.
 */
function MobileActions({
  actions,
  onSelect,
}: {
  actions: ToolbarAction[];
  onSelect: (action: ToolbarAction) => void;
}) {
  return (
    <>
      {actions.map((action) => (
        <button
          type="button"
          role="menuitem"
          key={action.label}
          disabled={action.disabled}
          onClick={() => onSelect(action)}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </>
  );
}

/**
 * Cuenta palabras de texto plano.
 * @param text - Texto del editor.
 * @returns Número de palabras.
 */
function countWords(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.split(" ").length : 0;
}

/**
 * Formatea una marca de tiempo como hora local corta.
 * @param timestamp - Milisegundos desde época o `null`.
 * @returns La hora `HH:MM` o una cadena vacía.
 */
function formatSavedTime(timestamp: number | null): string {
  if (timestamp === null) return "";
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * Formatea la fecha de actualización del documento de origen.
 * @param timestamp - Milisegundos desde época o `null`.
 * @returns Fecha legible o `null` si no está disponible.
 */
function formatSourceDate(timestamp: number | null): string | null {
  if (timestamp === null || !Number.isFinite(timestamp)) return null;
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

/**
 * Descarga un contenido de texto.
 * @param contents - Contenido del archivo.
 * @param type - Tipo MIME.
 * @param name - Nombre de descarga.
 */
function downloadTextFile(contents: string, type: string, name: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

/**
 * Extrae el texto visible de un contenido para la vista previa.
 * @param value - Nodo Tiptap.
 * @returns Texto plano.
 */
function contentText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: string; text?: string; content?: unknown[] };
  if (node.type === "text" && typeof node.text === "string") return node.text;
  return (node.content ?? []).map((child) => contentText(child)).join(" ");
}

/**
 * Aula Documentos: texto enriquecido con bloques Mermaid en un único documento.
 * @param props - Proyecto activo y rol.
 * @returns La ventana de edición y exportación.
 */
export default function AulaDocumentosApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const [initialDocument] = useState(createStarterAulaDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [editVersion, setEditVersion] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("Cargando documento…");
  const [wordCount, setWordCount] = useState(0);
  const [diagramCount, setDiagramCount] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewState | null>(null);
  const [importLoading, setImportLoading] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [newDocumentPreview, setNewDocumentPreview] = useState<{ template: AulaDocumentTemplate; document: AulaDocument } | null>(null);
  const [newDocumentError, setNewDocumentError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [preparingPresentation, setPreparingPresentation] = useState(false);
  const [presentation, setPresentation] = useState<{ title: string; slides: string[] } | null>(null);
  const [presentationTheme, setPresentationTheme] = useState<AulaPresentationTheme>(DEFAULT_AULA_PRESENTATION.theme);
  const [presentationNotes, setPresentationNotes] = useState<Record<string, string>>({});
  const [exportingPresentation, setExportingPresentation] = useState(false);
  const [slidePreview, setSlidePreview] = useState<{ title: string; slides: string[]; index: number } | null>(null);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const [invalidDocument, setInvalidDocument] = useState<{ raw: unknown; message: string } | null>(null);
  const [invalidResetConfirm, setInvalidResetConfirm] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const pendingDocumentRef = useRef<AulaDocument | null>(null);
  const applyingDocumentRef = useRef(false);
  const editVersionRef = useRef(0);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const actionsRef = useRef<HTMLDivElement>(null);
  const readOnly = role === "guest";
  const { load, save, loading, error } = useAppDocument<AulaDocument>(projectId, "aula-documentos");
  const notesStore = useAppDocument<unknown>(projectId, "documentos");
  const mermaidStore = useAppDocument<unknown>(projectId, "mermaid");
  const presentationsStore = useAppDocument<unknown>(projectId, "presentaciones");

  /**
   * Marca el documento como modificado y reinicia el debounce de autosave.
   * @param message - Mensaje de estado opcional.
   */
  const markChanged = useCallback((message = "Documento modificado.") => {
    editVersionRef.current += 1;
    setEditVersion((version) => version + 1);
    setDirty(true);
    setSaveFailed(false);
    setStatus(message);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!actionsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) setActionsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [actionsOpen]);

  const requestWindowClose = useWindowClose();
  const closeGuard = useCallback(() => {
    if (readOnly || !dirty) return true;
    setClosePromptOpen(true);
    return false;
  }, [dirty, readOnly]);
  useWindowCloseGuard(closeGuard);

  useEffect(() => {
    if (readOnly || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, readOnly]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: createAulaDocumentExtensions(),
    content: initialDocument.content,
    editorProps: {
      attributes: {
        class: "aula-documentos-prose",
        "aria-label": "Contenido del documento",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor: current }) => {
      editorRef.current = current;
      current.setEditable(!readOnly);
      setWordCount(countWords(current.getText()));
      setDiagramCount(countMermaidBlocks(current.getJSON()));
      const pending = pendingDocumentRef.current;
      if (pending) {
        applyingDocumentRef.current = true;
        current.commands.setContent(pending.content, { emitUpdate: false });
        setWordCount(countWords(current.getText()));
        setDiagramCount(countMermaidBlocks(current.getJSON()));
        setDirty(false);
        window.setTimeout(() => { applyingDocumentRef.current = false; }, 0);
      }
    },
    onTransaction: ({ editor: current, transaction }) => {
      if (!transaction.docChanged) return;
      setWordCount(countWords(current.getText()));
      setDiagramCount(countMermaidBlocks(current.getJSON()));
      if (applyingDocumentRef.current) return;
      markChanged();
    },
  });

  const toolbar = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return EMPTY_TOOLBAR_STATE;
      return {
        paragraph: current.isActive("paragraph"),
        heading1: current.isActive("heading", { level: 1 }),
        heading2: current.isActive("heading", { level: 2 }),
        heading3: current.isActive("heading", { level: 3 }),
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        blockquote: current.isActive("blockquote"),
        code: current.isActive("code"),
        codeBlock: current.isActive("codeBlock"),
        link: current.isActive("link"),
        canLink: !current.state.selection.empty || current.isActive("link"),
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
      };
    },
  }) ?? EMPTY_TOOLBAR_STATE;

  /**
   * Aplica un documento validado al editor y al título.
   * @param document - Documento que se muestra.
   */
  const applyDocument = useCallback((document: AulaDocument) => {
    pendingDocumentRef.current = document;
    setTitle(document.title);
    setPresentationTheme(document.presentation?.theme ?? DEFAULT_AULA_PRESENTATION.theme);
    setPresentationNotes(document.presentation?.notes ?? {});
    const current = editorRef.current;
    if (current) {
      applyingDocumentRef.current = true;
      current.commands.setContent(document.content, { emitUpdate: false });
      setWordCount(countWords(current.getText()));
      setDiagramCount(countMermaidBlocks(current.getJSON()));
      window.setTimeout(() => { applyingDocumentRef.current = false; }, 0);
    }
    setDirty(false);
    setSaveFailed(false);
    setStatus("Documento guardado cargado.");
  }, []);

  const closePresentation = useCallback(() => {
    setPresentation(null);
    setStatus("Presentación cerrada.");
  }, []);

  /**
   * Descarga el JSON original de un documento que no se pudo validar.
   */
  function downloadInvalidDocument() {
    if (!invalidDocument) return;
    try {
      downloadTextFile(
        JSON.stringify(invalidDocument.raw, null, 2),
        "application/json;charset=utf-8",
        aulaRecoveryFileName(title),
      );
      setStatus("JSON original descargado.");
    } catch {
      setStatus("No se pudo descargar el JSON original.");
    }
  }

  /**
   * Sustituye un documento inválido por un documento vacío, con confirmación.
   */
  function resetInvalidDocument() {
    applyDocument(createEmptyAulaDocument("Documento sin título"));
    setInvalidDocument(null);
    setInvalidResetConfirm(false);
    setLastSavedAt(null);
    markChanged("Documento reiniciado. Guárdalo para conservarlo.");
  }

  /**
   * Cierra la ventana sin guardar los cambios pendientes.
   */
  function closeWithoutSaving() {
    setClosePromptOpen(false);
    requestWindowClose();
  }

  /**
   * Guarda y cierra la ventana si el guardado termina bien.
   */
  async function saveAndClose() {
    const ok = await saveCurrent(false);
    if (!ok) return;
    setClosePromptOpen(false);
    requestWindowClose();
  }

  const applyLoadedState = useCallback((state: unknown, updatedAt: number | null) => {
    if (state === null) {
      setInvalidDocument(null);
      setLastSavedAt(null);
      setStatus("Documento de ejemplo listo. Guarda para conservarlo.");
      return;
    }
    const parsed = parseAulaDocument(state);
    if (parsed.ok) {
      setInvalidDocument(null);
      setLastSavedAt(typeof updatedAt === "number" ? updatedAt : null);
      applyDocument(parsed.document);
    } else {
      setInvalidDocument({ raw: state, message: parsed.message });
      setInvalidResetConfirm(false);
      setLastSavedAt(null);
      setStatus("El documento guardado no se pudo leer.");
    }
  }, [applyDocument]);

  const loadSavedDocument = useCallback(async () => {
    const { state, updatedAt } = await load();
    if (!mountedRef.current) return;
    applyLoadedState(state, updatedAt);
  }, [applyLoadedState, load]);

  useEffect(() => {
    let active = true;
    void load().then(({ state, updatedAt }) => {
      if (!active || !mountedRef.current) return;
      applyLoadedState(state, updatedAt);
    });
    return () => { active = false; };
  }, [applyLoadedState, load]);

  useEffect(() => {
    editor?.setEditable(!readOnly && !invalidDocument);
  }, [editor, invalidDocument, readOnly]);

  useEffect(() => {
    if (!editor) return;
    setMermaidDraftChangeHandler(editor, () => markChanged("Diagrama modificado."));
    return () => setMermaidDraftChangeHandler(editor, null);
  }, [editor, markChanged]);

  /**
   * Obtiene el documento actual validado.
   * @returns El documento o `null` si no cumple el esquema.
   */
  const currentDocument = useCallback((): AulaDocument | null => {
    if (!editor) return null;
    flushMermaidDrafts(editor);
    const parsed = parseAulaDocument({
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title,
      content: editor.getJSON(),
      presentation: {
        theme: presentationTheme,
        ...(Object.keys(presentationNotes).length ? { notes: presentationNotes } : {}),
      },
    });
    if (!parsed.ok) {
      setStatus(parsed.message);
      return null;
    }
    return parsed.document;
  }, [editor, presentationNotes, presentationTheme, title]);

  /**
   * Persiste un documento y actualiza el estado de guardado.
   * @param document - Documento validado.
   * @param automatic - Indica si el guardado lo inició el autosave.
   * @returns `true` si se guardó correctamente.
   */
  const persistDocument = useCallback(async (document: AulaDocument, automatic: boolean): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveFailed(false);
    setStatus(automatic ? "Guardando automáticamente…" : "Guardando documento…");
    const versionAtSave = editVersionRef.current;
    let ok = false;
    try {
      ok = await save(document);
    } catch {
      ok = false;
    }
    savingRef.current = false;
    if (!mountedRef.current) return ok;
    setSaving(false);
    if (ok) {
      setLastSavedAt(Date.now());
      if (editVersionRef.current === versionAtSave) {
        setTitle(document.title);
        setDirty(false);
      }
      setStatus(automatic ? "Documento guardado automáticamente." : "Documento guardado en el proyecto.");
    } else {
      setSaveFailed(true);
      setDirty(true);
      setStatus("No se pudo guardar el documento. Revisa la conexión.");
    }
    return ok;
  }, [save]);

  /**
   * Construye y persiste el documento actual.
   * @param automatic - Indica si el guardado lo inició el autosave.
   * @returns `true` si se guardó correctamente.
   */
  const saveCurrent = useCallback(async (automatic: boolean): Promise<boolean> => {
    if (readOnly) return false;
    const document = currentDocument();
    if (!document) return false;
    return persistDocument(document, automatic);
  }, [currentDocument, persistDocument, readOnly]);

  /**
   * Guarda el documento manualmente.
   */
  const saveDocument = useCallback(() => {
    void saveCurrent(false);
  }, [saveCurrent]);

  useEffect(() => {
    if (readOnly || loading || !editor || !dirty || saving || saveFailed || invalidDocument) return;
    const timer = window.setTimeout(() => { void saveCurrent(true); }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, editVersion, editor, invalidDocument, loading, readOnly, saveCurrent, saveFailed, saving]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveCurrent(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveCurrent]);

  /**
   * Inserta un bloque Mermaid con la plantilla de flujo.
   */
  function insertMermaid() {
    if (!editor || readOnly) return;
    editor.chain().focus(undefined, { scrollIntoView: false }).insertContent({
      type: "mermaidBlock",
      attrs: { code: MERMAID_TEMPLATES[0].code },
    }).run();
    setStatus("Diagrama insertado. Edita el código si lo necesitas.");
  }

  /**
   * Inserta un salto de diapositiva en el documento.
   */
  function insertSlideBreak() {
    if (!editor || readOnly) return;
    editor.chain().focus(undefined, { scrollIntoView: false }).insertContent({ type: "slideBreak" }).run();
    setStatus("Salto de diapositiva insertado.");
  }

  /**
   * Construye el HTML de cada diapositiva con sus diagramas.
   * @param document - Documento validado.
   * @returns Diapositivas listas para presentar o previsualizar.
   */
  async function buildPresentationHtml(document: AulaDocument): Promise<string[]> {
    const slides = buildPresentationSlides(document.content);
    const svgByCode = await renderMermaidSvgs(
      collectMermaidCodes({ type: "doc", content: slides.flatMap((slide) => slide.content) }),
      (code) => getMermaidRenderer().render(code),
    );
    return slides.map((slide) => renderAulaContentHtml(
      { type: "doc", content: slide.content },
      svgByCode,
    ));
  }

  /**
   * Construye y abre la presentación del documento actual.
   */
  async function startPresentation() {
    const document = currentDocument();
    if (!document) return;
    setPreparingPresentation(true);
    setStatus("Preparando presentación…");
    try {
      const html = await buildPresentationHtml(document);
      setPresentation({
        title: document.title.trim() || "Aula Documentos",
        slides: html,
      });
      setStatus("Presentación abierta.");
    } catch {
      setStatus("No se pudo preparar la presentación.");
    } finally {
      setPreparingPresentation(false);
    }
  }

  /**
   * Abre una vista previa con navegación entre diapositivas.
   */
  async function openSlidePreview() {
    const document = currentDocument();
    if (!document) return;
    setPreparingPresentation(true);
    setStatus("Preparando vista previa…");
    try {
      const html = await buildPresentationHtml(document);
      setSlidePreview({
        title: document.title.trim() || "Aula Documentos",
        slides: html,
        index: 0,
      });
      setStatus(`Vista previa abierta: ${html.length} ${html.length === 1 ? "diapositiva" : "diapositivas"}.`);
    } catch {
      setStatus("No se pudo preparar la vista previa.");
    } finally {
      setPreparingPresentation(false);
    }
  }

  /**
   * Cambia el tema de la presentación y lo guarda con el documento.
   * @param theme - Nuevo tema.
   */
  function changePresentationTheme(theme: AulaPresentationTheme) {
    setPresentationTheme(theme);
    markChanged("Tema de presentación actualizado.");
  }

  /**
   * Actualiza las notas de una diapositiva.
   * @param index - Índice de la diapositiva.
   * @param value - Texto de la nota.
   */
  function changeSlideNote(index: number, value: string) {
    setPresentationNotes((current) => {
      const next = { ...current };
      if (value) next[String(index)] = value;
      else delete next[String(index)];
      return next;
    });
    markChanged("Notas de presentación actualizadas.");
  }

  /**
   * Prepara y descarga el HTML autónomo del documento.
   */
  async function exportHtml() {
    const document = currentDocument();
    if (!document) return;
    setExporting(true);
    setStatus("Preparando HTML y diagramas…");
    try {
      const svgByCode = await renderMermaidSvgs(
        collectMermaidCodes(document.content),
        (code) => getMermaidRenderer().render(code),
      );
      const html = buildAulaDocumentHtml(document, svgByCode);
      downloadTextFile(html, "text/html;charset=utf-8", aulaFileName(document.title, "html"));
      setStatus("HTML descargado.");
    } catch {
      setStatus("No se pudo preparar el HTML del documento.");
    } finally {
      setExporting(false);
    }
  }

  /**
   * Prepara y abre la impresión o el PDF del documento.
   */
  async function printDocument() {
    const document = currentDocument();
    if (!document) return;
    setPrinting(true);
    setStatus("Preparando impresión y diagramas…");
    try {
      const svgByCode = await renderMermaidSvgs(
        collectMermaidCodes(document.content),
        (code) => getMermaidRenderer().render(code),
      );
      printHtmlDocument(buildAulaDocumentHtml(document, svgByCode));
      setStatus("Vista de impresión abierta.");
    } catch {
      setStatus("No se pudo preparar la impresión del documento.");
    } finally {
      setPrinting(false);
    }
  }

  /**
   * Exporta una presentación HTML estática con tema y notas.
   */
  async function exportPresentation() {
    const document = currentDocument();
    if (!document) return;
    setExportingPresentation(true);
    setStatus("Preparando la presentación exportada…");
    try {
      const slides = await buildPresentationHtml(document);
      const html = buildAulaPresentationHtml(document, slides, {
        theme: presentationTheme,
        notes: presentationNotes,
        includeNotes: true,
      });
      downloadTextFile(
        html,
        "text/html;charset=utf-8",
        aulaFileName(`${document.title} presentación`, "html"),
      );
      setStatus("Presentación exportada.");
    } catch {
      setStatus("No se pudo exportar la presentación.");
    } finally {
      setExportingPresentation(false);
    }
  }

  /**
   * Exporta el documento al subconjunto Markdown.
   */
  function exportMarkdown() {
    const document = currentDocument();
    if (!document) return;
    downloadTextFile(
      documentToMarkdown(document),
      "text/markdown;charset=utf-8",
      aulaFileName(document.title, "md"),
    );
    setStatus("Markdown descargado.");
  }

  /**
   * Abre el selector de plantillas para un documento nuevo.
   */
  function openNewDocument() {
    setNewDocumentPreview(null);
    setNewDocumentError(null);
    setNewDocumentOpen(true);
  }

  /**
   * Cierra el selector de plantillas y limpia su estado.
   */
  function closeNewDocument() {
    setNewDocumentOpen(false);
    setNewDocumentPreview(null);
    setNewDocumentError(null);
  }

  /**
   * Prepara la vista previa de una plantilla antes de reemplazar el documento.
   * @param template - Plantilla elegida.
   */
  function selectNewDocumentTemplate(template: AulaDocumentTemplate) {
    const parsed = parseAulaDocument(template.create());
    if (!parsed.ok) {
      setNewDocumentPreview(null);
      setNewDocumentError(parsed.message);
      return;
    }
    setNewDocumentPreview({ template, document: parsed.document });
    setNewDocumentError(null);
  }

  /**
   * Sustituye el documento actual por la plantilla confirmada.
   */
  function applyNewDocument() {
    if (!newDocumentPreview) return;
    const { template, document } = newDocumentPreview;
    applyDocument(document);
    markChanged(`Documento creado desde «${template.name}». Guárdalo para conservarlo.`);
    closeNewDocument();
    window.setTimeout(() => {
      if (template.focus === "title") {
        titleRef.current?.focus();
        titleRef.current?.scrollIntoView?.({ block: "nearest" });
      } else {
        editorRef.current?.commands.focus("end", { scrollIntoView: false });
        editorRef.current?.view.dom.scrollIntoView?.({ block: "nearest" });
      }
    }, 0);
  }

  /**
   * Abre el diálogo de importación y limpia su estado.
   */
  function openImport() {
    setImportPreview(null);
    setImportError(null);
    setImportLoading(null);
    setImportConfirm(false);
    setImportOpen(true);
  }

  /**
   * Cierra el diálogo de importación.
   */
  function closeImport() {
    setImportOpen(false);
    setImportPreview(null);
    setImportError(null);
    setImportLoading(null);
    setImportConfirm(false);
  }

  /**
   * Carga una app antigua y prepara su vista previa.
   * @param source - App de origen.
   */
  async function importFrom(source: "documentos" | "mermaid" | "presentaciones") {
    setImportLoading(source);
    setImportError(null);
    setImportPreview(null);
    setImportConfirm(false);
    try {
      const store = source === "documentos"
        ? notesStore
        : source === "mermaid"
          ? mermaidStore
          : presentationsStore;
      const { state, updatedAt } = await store.load();
      if (state === null) {
        setImportError(`No hay ningún documento guardado en ${IMPORT_LABELS[source]}.`);
        return;
      }
      const result = importLegacyDocument(source, state);
      if (!result.ok) {
        setImportError(result.message);
        return;
      }
      setImportPreview({
        ...result.preview,
        sourceUpdatedAt: typeof updatedAt === "number" ? updatedAt : null,
      });
    } catch {
      setImportError("No se pudo leer el documento de origen.");
    } finally {
      setImportLoading(null);
    }
  }

  /**
   * Lee un archivo Markdown y prepara su vista previa.
   * @param file - Archivo elegido.
   */
  async function importMarkdown(file: File | undefined) {
    if (!file) return;
    setImportLoading("markdown");
    setImportError(null);
    setImportPreview(null);
    setImportConfirm(false);
    try {
      const source = await file.text();
      if (source.length > AULA_DOCUMENT_MARKDOWN_MAX_LENGTH) {
        setImportError("El Markdown supera el tamaño permitido.");
        return;
      }
      const converted = markdownToDocument(source, {
        stripTitleHeading: true,
        titleFallback: file.name.replace(/\.[^.]+$/, "") || "Documento importado",
      });
      const parsed = parseAulaDocument({
        schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
        title: converted.title,
        content: converted.content,
      });
      if (!parsed.ok) {
        setImportError(parsed.message);
        return;
      }
      setImportPreview({
        source: "markdown",
        document: parsed.document,
        stats: parsed.stats,
        warnings: converted.warnings,
        sourceUpdatedAt: null,
      });
    } catch {
      setImportError("No se pudo leer el archivo Markdown.");
    } finally {
      setImportLoading(null);
    }
  }

  /**
   * Sustituye el documento actual por la vista previa confirmada.
   */
  function applyImport() {
    if (!importPreview || !importConfirm) return;
    applyDocument(importPreview.document);
    markChanged(`Documento importado desde ${IMPORT_LABELS[importPreview.source]}. Guárdalo para conservarlo.`);
    closeImport();
  }

  /**
   * Abre el panel de enlaces.
   */
  function openLinkPanel() {
    if (!editor || readOnly) return;
    const current = editor.getAttributes("link").href;
    setLinkUrl(typeof current === "string" ? current : "");
    setLinkError(null);
    setLinkOpen(true);
  }

  /**
   * Aplica el enlace escrito al texto seleccionado.
   */
  function applyLink() {
    if (!editor || readOnly) return;
    const href = normalizeAulaLink(linkUrl);
    if (!href) {
      setLinkError("Escribe un enlace http, https o un correo válido.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setStatus("Enlace aplicado.");
  }

  /**
   * Quita el enlace del texto seleccionado.
   */
  function removeLink() {
    if (!editor || readOnly) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setStatus("Enlace quitado.");
  }

  /**
   * Actualiza el título y marca cambios.
   * @param value - Nuevo título.
   */
  function updateTitle(value: string) {
    setTitle(value);
    markChanged("Título actualizado.");
  }

  const statusText = loading
    ? "Cargando documento…"
    : error ?? (saving || saveFailed ? status : dirty ? `${status} Cambios sin guardar.` : status);
  const savedLabel = lastSavedAt === null ? "Sin guardar" : `Guardado ${formatSavedTime(lastSavedAt)}`;
  const chipText = readOnly
    ? "Solo lectura"
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
  const importSourceUpdatedLabel = importPreview ? formatSourceDate(importPreview.sourceUpdatedAt) : null;
  const importSourceDate = importPreview
    ? importPreview.source === "markdown"
      ? "Archivo local"
      : importSourceUpdatedLabel
        ? `Actualizado en el origen: ${importSourceUpdatedLabel}`
        : "Fecha de origen no disponible."
    : "";
  const newDocumentText = newDocumentPreview ? contentText(newDocumentPreview.document.content) : "";
  const newDocumentExcerpt = newDocumentText.replace(/\s+/g, " ").trim().slice(0, 260);
  const newDocumentWordCount = countWords(newDocumentText);
  const newDocumentDiagramCount = newDocumentPreview
    ? countMermaidBlocks(newDocumentPreview.document.content)
    : 0;

  const documentFileActions: ToolbarAction[] = [
    {
      label: "Nuevo documento",
      icon: <FilePlus2 size={15} aria-hidden />,
      onClick: openNewDocument,
      disabled: readOnly || !editor || Boolean(invalidDocument) || saving || loading,
    },
    {
      label: "Importar documento",
      icon: <Upload size={15} aria-hidden />,
      onClick: openImport,
      disabled: readOnly || !editor || Boolean(invalidDocument),
    },
    {
      label: "Guardar documento",
      icon: <Save size={15} aria-hidden />,
      onClick: () => { void saveDocument(); },
      disabled: readOnly || saving || loading || !editor || Boolean(invalidDocument),
    },
    {
      label: "Exportar HTML",
      icon: exporting ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Download size={15} aria-hidden />,
      onClick: () => { void exportHtml(); },
      disabled: !editor || exporting || Boolean(invalidDocument),
    },
    {
      label: "Imprimir o guardar PDF",
      icon: printing ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Printer size={15} aria-hidden />,
      onClick: () => { void printDocument(); },
      disabled: !editor || printing || Boolean(invalidDocument),
    },
    {
      label: "Exportar Markdown",
      icon: <FileDown size={15} aria-hidden />,
      onClick: exportMarkdown,
      disabled: !editor || Boolean(invalidDocument),
    },
  ];

  const mobileActions: ToolbarAction[] = [
    ...documentFileActions,
    {
      label: "Presentar documento",
      icon: <MonitorPlay size={15} aria-hidden />,
      onClick: () => { void startPresentation(); },
      disabled: preparingPresentation || Boolean(presentation),
    },
    {
      label: "Exportar presentación",
      icon: exportingPresentation ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Presentation size={15} aria-hidden />,
      onClick: () => { void exportPresentation(); },
      disabled: !editor || exportingPresentation,
    },
  ];

  const groups: ToolbarAction[][] = editor && !readOnly ? [
    [
      { label: "Párrafo", icon: <Pilcrow size={15} aria-hidden />, active: toolbar.paragraph, onClick: () => editor.chain().focus().setParagraph().run() },
      { label: "Título 1", icon: <Heading1 size={15} aria-hidden />, active: toolbar.heading1, onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
      { label: "Título 2", icon: <Heading2 size={15} aria-hidden />, active: toolbar.heading2, onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: "Título 3", icon: <Heading3 size={15} aria-hidden />, active: toolbar.heading3, onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    ],
    [
      { label: "Negrita", icon: <Bold size={15} aria-hidden />, active: toolbar.bold, onClick: () => editor.chain().focus().toggleBold().run() },
      { label: "Cursiva", icon: <Italic size={15} aria-hidden />, active: toolbar.italic, onClick: () => editor.chain().focus().toggleItalic().run() },
      { label: "Subrayado", icon: <Underline size={15} aria-hidden />, active: toolbar.underline, onClick: () => editor.chain().focus().toggleUnderline().run() },
    ],
    [
      { label: "Lista con viñetas", icon: <List size={15} aria-hidden />, active: toolbar.bulletList, onClick: () => editor.chain().focus().toggleBulletList().run() },
      { label: "Lista numerada", icon: <ListOrdered size={15} aria-hidden />, active: toolbar.orderedList, onClick: () => editor.chain().focus().toggleOrderedList().run() },
    ],
    [
      { label: "Cita", icon: <Quote size={15} aria-hidden />, active: toolbar.blockquote, onClick: () => editor.chain().focus().toggleBlockquote().run() },
      { label: "Código en línea", icon: <Code size={15} aria-hidden />, active: toolbar.code, onClick: () => editor.chain().focus().toggleCode().run() },
      { label: "Bloque de código", icon: <Code2 size={15} aria-hidden />, active: toolbar.codeBlock, onClick: () => editor.chain().focus().toggleCodeBlock().run() },
    ],
    [
      { label: "Insertar o editar enlace", icon: <Link2 size={15} aria-hidden />, active: toolbar.link, disabled: !toolbar.canLink, onClick: openLinkPanel },
    ],
    [
      { label: "Insertar diagrama Mermaid", icon: <GitBranch size={15} aria-hidden />, onClick: insertMermaid },
      { label: "Insertar salto de diapositiva", icon: <SeparatorHorizontal size={15} aria-hidden />, onClick: insertSlideBreak },
    ],
    [
      { label: "Deshacer", icon: <Undo2 size={15} aria-hidden />, disabled: !toolbar.canUndo, onClick: () => editor.chain().focus().undo().run() },
      { label: "Rehacer", icon: <Redo2 size={15} aria-hidden />, disabled: !toolbar.canRedo, onClick: () => editor.chain().focus().redo().run() },
    ],
  ] : [];

  return (
    <div className="aula-documentos-app">
      <header className="aula-documentos-top">
        <div className="aula-documentos-heading">
          <span className="aula-documentos-mark" aria-hidden>
            <FilePenLine size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Aula Documentos</strong>
            <small>Texto y diagramas</small>
          </span>
        </div>
        <div className="aula-documentos-meta" aria-label="Estado del documento">
          <span className={dirty && !readOnly ? "aula-documentos-chip is-dirty" : "aula-documentos-chip"}>
            {chipText}
          </span>
          <span className="aula-documentos-count">{wordLabel}</span>
          <span className="aula-documentos-count">{diagramLabel}</span>
        </div>
      </header>

      <div className="aula-documentos-toolbar" role="toolbar" aria-label="Formato del documento">
        {groups.map((group, index) => (
          <div className="aula-documentos-tool-group" key={index}>
            {group.map((action) => <ToolButton action={action} key={action.label} />)}
          </div>
        ))}
        {editor ? (
          <div className="aula-documentos-tool-group aula-documentos-present-action">
            <ToolButton
              action={{
                label: "Presentar documento",
                icon: <MonitorPlay size={15} aria-hidden />,
                onClick: () => { void startPresentation(); },
                disabled: preparingPresentation || Boolean(presentation),
              }}
            />
          </div>
        ) : null}
        <div className="aula-documentos-tool-group aula-documentos-file-actions">
          <FileActions actions={documentFileActions} />
        </div>
        <div className="aula-documentos-mobile-actions" ref={actionsRef}>
          <button
            type="button"
            className="aula-documentos-mobile-toggle"
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
            aria-label="Acciones del documento"
            onClick={() => setActionsOpen((current) => !current)}
          >
            <Ellipsis size={16} aria-hidden />
            <span>Acciones</span>
          </button>
          {actionsOpen ? (
            <div className="aula-documentos-mobile-menu" role="menu" aria-label="Acciones del documento">
              <MobileActions
                actions={mobileActions}
                onSelect={(action) => {
                  setActionsOpen(false);
                  action.onClick();
                }}
              />
            </div>
          ) : null}
        </div>
        {!editor ? <span className="aula-documentos-loading">Preparando editor…</span> : null}
      </div>

      {readOnly ? (
        <p className="aula-documentos-readonly" role="note">
          Modo lectura: puedes consultar y exportar el documento, pero no editarlo ni guardarlo.
        </p>
      ) : null}

      {linkOpen && !readOnly ? (
        <form
          className="aula-documentos-link-bar"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <label className="aula-documentos-link-label" htmlFor="aula-documentos-link-url">Enlace</label>
          <input
            id="aula-documentos-link-url"
            className="aula-documentos-link-input"
            type="text"
            inputMode="url"
            autoFocus
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setLinkError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://ejemplo.com o nombre@correo.com"
            aria-describedby={linkError ? "aula-documentos-link-error" : undefined}
          />
          <button type="submit" className="aula-documentos-link-action" disabled={!linkUrl.trim()}>Aplicar</button>
          {toolbar.link ? (
            <button type="button" className="aula-documentos-link-action secondary" onClick={removeLink}>Quitar</button>
          ) : null}
          <button type="button" className="aula-documentos-link-close" onClick={() => setLinkOpen(false)} aria-label="Cerrar enlace">
            <X size={14} aria-hidden />
          </button>
          {linkError ? (
            <span id="aula-documentos-link-error" className="aula-documentos-link-error" role="alert">{linkError}</span>
          ) : (
            <span className="aula-documentos-link-hint">Solo http, https o correo.</span>
          )}
        </form>
      ) : null}

      {newDocumentOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeNewDocument();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeNewDocument();
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-new-title"
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-new-title">Nuevo documento</h2>
              <button type="button" className="aula-documentos-modal-close" onClick={closeNewDocument} aria-label="Cerrar nuevo documento" autoFocus>
                <X size={16} aria-hidden />
              </button>
            </header>

            {newDocumentPreview ? (
              <div className="aula-documentos-import-preview">
                <p className="aula-documentos-import-kicker">{newDocumentPreview.template.name}</p>
                <h3>{newDocumentPreview.document.title}</h3>
                <p className="aula-documentos-import-meta">
                  {newDocumentWordCount === 1 ? "1 palabra" : `${newDocumentWordCount} palabras`}
                  {newDocumentDiagramCount === 1 ? " · 1 diagrama" : ` · ${newDocumentDiagramCount} diagramas`}
                </p>
                <p className="aula-documentos-import-excerpt">
                  {newDocumentExcerpt || "Documento vacío, listo para escribir."}
                </p>
                {dirty ? (
                  <p className="aula-documentos-import-warning">
                    Hay cambios sin guardar. Se sustituirán por el contenido de esta plantilla.
                  </p>
                ) : null}
                <div className="aula-documentos-import-actions">
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => setNewDocumentPreview(null)}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={applyNewDocument}
                  >
                    {dirty ? "Reemplazar documento" : "Crear documento"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="aula-documentos-import-menu">
                <p className="aula-documentos-import-intro">
                  Elige una plantilla para empezar. El documento actual no cambia hasta que confirmes.
                </p>
                {dirty ? (
                  <p className="aula-documentos-import-warning">
                    Hay cambios sin guardar en el documento actual.
                  </p>
                ) : null}
                {AULA_DOCUMENT_TEMPLATES.map((template) => (
                  <button
                    type="button"
                    className="aula-documentos-import-option"
                    key={template.id}
                    onClick={() => selectNewDocumentTemplate(template)}
                  >
                    <FileText size={18} aria-hidden />
                    <span><strong>{template.name}</strong><small>{template.description}</small></span>
                  </button>
                ))}
                {newDocumentError ? <p className="aula-documentos-import-error" role="alert">{newDocumentError}</p> : null}
                <div className="aula-documentos-import-actions">
                  <button type="button" className="aula-documentos-import-secondary" onClick={closeNewDocument}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {invalidDocument ? (
        <div className="aula-documentos-modal-backdrop">
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-invalid-title"
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-invalid-title">Documento guardado inválido</h2>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">{invalidDocument.message}</p>
              <p className="aula-documentos-import-intro">
                El documento original sigue guardado. Descárgalo antes de decidir si lo reintentas o empiezas de cero.
              </p>
              {invalidResetConfirm ? (
                <>
                  <p className="aula-documentos-import-warning">
                    Se sustituirá el documento inválido por uno vacío. Si no has descargado el JSON, perderás esta copia.
                  </p>
                  <div className="aula-documentos-import-actions">
                    <button
                      type="button"
                      className="aula-documentos-import-secondary"
                      onClick={() => setInvalidResetConfirm(false)}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="aula-documentos-import-primary"
                      onClick={resetInvalidDocument}
                    >
                      Confirmar y empezar de cero
                    </button>
                  </div>
                </>
              ) : (
                <div className="aula-documentos-import-actions">
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={downloadInvalidDocument}
                  >
                    <Download size={14} aria-hidden />
                    Descargar JSON original
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => { void loadSavedDocument(); }}
                  >
                    Reintentar
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    onClick={() => setInvalidResetConfirm(true)}
                  >
                    Empezar de cero
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {closePromptOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setClosePromptOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setClosePromptOpen(false);
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-close-title"
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-close-title">Cerrar Aula Documentos</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={() => setClosePromptOpen(false)}
                aria-label="Cancelar cierre"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="aula-documentos-import-menu">
              <p className="aula-documentos-import-intro">
                Hay cambios sin guardar. Puedes guardarlos antes de cerrar o descartarlos.
              </p>
              {saveFailed ? (
                <p className="aula-documentos-import-error" role="alert">
                  No se pudo guardar el documento. Revisa la conexión e inténtalo de nuevo.
                </p>
              ) : null}
              <div className="aula-documentos-import-actions">
                <button
                  type="button"
                  className="aula-documentos-import-secondary"
                  onClick={() => setClosePromptOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="aula-documentos-import-secondary"
                  onClick={closeWithoutSaving}
                >
                  Cerrar sin guardar
                </button>
                <button
                  type="button"
                  className="aula-documentos-import-primary"
                  onClick={() => { void saveAndClose(); }}
                  disabled={saving}
                >
                  {saving ? "Guardando…" : "Guardar y cerrar"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {importOpen ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeImport();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeImport();
          }}
        >
          <section
            className="aula-documentos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-import-title"
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-import-title">Importar documento</h2>
              <button type="button" className="aula-documentos-modal-close" onClick={closeImport} aria-label="Cerrar importación" autoFocus>
                <X size={16} aria-hidden />
              </button>
            </header>

            {importPreview ? (
              <div className="aula-documentos-import-preview">
                <p className="aula-documentos-import-kicker">{IMPORT_LABELS[importPreview.source]}</p>
                <h3>{importPreview.document.title || "Documento sin título"}</h3>
                <p className="aula-documentos-import-meta">
                  {importPreview.stats.textLength} caracteres de texto · {importPreview.stats.mermaidBlocks === 1 ? "1 diagrama" : `${importPreview.stats.mermaidBlocks} diagramas`}
                  {importPreview.stats.slideBreaks ? ` · ${importPreview.stats.slideBreaks} ${importPreview.stats.slideBreaks === 1 ? "salto" : "saltos"} de diapositiva` : ""}
                </p>
                <p className="aula-documentos-import-meta">{importSourceDate}</p>
                <p className="aula-documentos-import-excerpt">
                  {importExcerpt || "El documento no contiene texto."}
                </p>
                {importPreview.warnings.length ? (
                  <ul className="aula-documentos-import-warnings">
                    {importPreview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                ) : null}
                <p className="aula-documentos-import-warning">
                  Se sustituirá el documento abierto. El documento de la app original no se modifica.
                </p>
                <label className="aula-documentos-import-confirm">
                  <input
                    type="checkbox"
                    checked={importConfirm}
                    onChange={(event) => setImportConfirm(event.target.checked)}
                  />
                  Entiendo que se reemplaza el documento actual.
                </label>
                <div className="aula-documentos-import-actions">
                  <button
                    type="button"
                    className="aula-documentos-import-secondary"
                    onClick={() => {
                      setImportPreview(null);
                      setImportConfirm(false);
                      setImportError(null);
                    }}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    className="aula-documentos-import-primary"
                    disabled={!importConfirm}
                    onClick={applyImport}
                  >
                    Importar y reemplazar
                  </button>
                </div>
              </div>
            ) : (
              <div className="aula-documentos-import-menu">
                <p className="aula-documentos-import-intro">
                  Elige una app del proyecto o un archivo Markdown. La vista previa no cambia el origen.
                </p>
                <button type="button" className="aula-documentos-import-option" onClick={() => { void importFrom("documentos"); }}>
                  <FileText size={18} aria-hidden />
                  <span><strong>Notas y documentos</strong><small>Texto enriquecido guardado en el proyecto</small></span>
                </button>
                <button type="button" className="aula-documentos-import-option" onClick={() => { void importFrom("mermaid"); }}>
                  <GitBranch size={18} aria-hidden />
                  <span><strong>Diagramas</strong><small>Un diagrama Mermaid como bloque</small></span>
                </button>
                <button type="button" className="aula-documentos-import-option" onClick={() => { void importFrom("presentaciones"); }}>
                  <Presentation size={18} aria-hidden />
                  <span><strong>Presentaciones</strong><small>Diapositivas Markdown con saltos</small></span>
                </button>
                <label className="aula-documentos-import-option" htmlFor="aula-documentos-markdown-file">
                  <NotebookPen size={18} aria-hidden />
                  <span><strong>Archivo Markdown</strong><small>Importa .md o .markdown con vista previa</small></span>
                </label>
                <input
                  id="aula-documentos-markdown-file"
                  className="aula-documentos-file-input"
                  type="file"
                  accept=".md,.markdown,text/markdown,text/plain"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    void importMarkdown(file);
                  }}
                />
                {importLoading ? (
                  <p className="aula-documentos-import-status" role="status">
                    <Loader2 size={15} className="aula-documentos-spin" aria-hidden />
                    Leyendo {IMPORT_LABELS[importLoading as keyof typeof IMPORT_LABELS] ?? "documento"}…
                  </p>
                ) : null}
                {importError ? <p className="aula-documentos-import-error" role="alert">{importError}</p> : null}
                <div className="aula-documentos-import-actions">
                  <button type="button" className="aula-documentos-import-secondary" onClick={closeImport}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      <div className="aula-documentos-layout">
        <section className="aula-documentos-stage" aria-label="Documento">
          <article className="aula-documentos-paper">
            <input
              className="aula-documentos-title"
              value={title}
              maxLength={AULA_DOCUMENT_TITLE_MAX_LENGTH}
              onChange={(event) => updateTitle(event.target.value)}
              aria-label="Título del documento"
              placeholder="Título del documento"
              spellCheck
              readOnly={readOnly || Boolean(invalidDocument)}
              ref={titleRef}
            />
            <div className="aula-documentos-divider" aria-hidden />
            <EditorContent editor={editor} className="aula-documentos-editor" />
            {!editor ? <p className="aula-documentos-editor-loading">Preparando el editor…</p> : null}
          </article>
        </section>

        <aside className="aula-documentos-side">
          <section className="aula-documentos-info">
            <h3>Texto y diagramas juntos</h3>
            <p>Escribe el documento y usa <strong>Diagrama</strong> para insertar un bloque Mermaid. El bloque se mueve con el contenido y se exporta como SVG. El documento se guarda automáticamente tras una pausa.</p>
            <p className="aula-documentos-status" role="status">{statusText}</p>
            {saveFailed && !readOnly ? (
              <button
                type="button"
                className="aula-documentos-retry"
                onClick={() => { void saveCurrent(false); }}
              >
                Reintentar guardado
              </button>
            ) : null}
          </section>
          <section className="aula-documentos-info">
            <h3>Presentación</h3>
            <label className="aula-documentos-theme" htmlFor="aula-documentos-theme">
              <span>Tema</span>
              <select
                id="aula-documentos-theme"
                aria-label="Tema de la presentación"
                value={presentationTheme}
                onChange={(event) => changePresentationTheme(event.target.value as AulaPresentationTheme)}
                disabled={readOnly}
              >
                {AULA_PRESENTATION_THEMES.map((theme) => (
                  <option value={theme} key={theme}>
                    {theme === "aula" ? "Aula" : theme === "claro" ? "Claro" : "Oscuro"}
                  </option>
                ))}
              </select>
            </label>
            <p className="aula-documentos-slide-count">{slideLabel}</p>
            <button
              type="button"
              className="aula-documentos-preview-button"
              onClick={() => { void openSlidePreview(); }}
              disabled={!editor || preparingPresentation}
            >
              {preparingPresentation ? "Preparando…" : "Vista previa"}
            </button>
            <button
              type="button"
              className="aula-documentos-preview-button"
              onClick={() => { void exportPresentation(); }}
              disabled={!editor || exportingPresentation}
            >
              {exportingPresentation ? "Exportando…" : "Exportar presentación"}
            </button>
          </section>
          <section className="aula-documentos-help">
            <h3>Atajos</h3>
            <ul>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>B</kbd> negrita</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>I</kbd> cursiva</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd> enlace</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd> guardar</li>
              <li>En un diagrama, <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Intro</kbd> aplica el código.</li>
            </ul>
          </section>
        </aside>
      </div>

      {slidePreview ? (
        <div
          className="aula-documentos-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSlidePreview(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setSlidePreview(null);
          }}
        >
          <section
            className="aula-documentos-modal aula-slide-preview-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aula-documentos-preview-title"
          >
            <header className="aula-documentos-modal-head">
              <h2 id="aula-documentos-preview-title">Vista previa: {slidePreview.title}</h2>
              <button
                type="button"
                className="aula-documentos-modal-close"
                onClick={() => setSlidePreview(null)}
                aria-label="Cerrar vista previa"
                autoFocus
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div
              className={`aula-slide-preview aula-presentation-theme-${presentationTheme}`}
              dangerouslySetInnerHTML={{ __html: slidePreview.slides[slidePreview.index] ?? "" }}
            />
            <label className="aula-slide-preview-notes" htmlFor="aula-slide-preview-notes">
              <span>Notas del orador · diapositiva {slidePreview.index + 1}</span>
              <textarea
                id="aula-slide-preview-notes"
                value={presentationNotes[String(slidePreview.index)] ?? ""}
                onChange={(event) => changeSlideNote(slidePreview.index, event.target.value)}
                placeholder="Solo visibles para quien presenta."
                readOnly={readOnly}
              />
            </label>
            <div className="aula-slide-preview-nav">
              <button
                type="button"
                className="aula-documentos-import-secondary"
                onClick={() => setSlidePreview((current) => current ? { ...current, index: current.index - 1 } : current)}
                disabled={slidePreview.index <= 0}
              >
                Anterior
              </button>
              <span>Diapositiva {slidePreview.index + 1} de {slidePreview.slides.length}</span>
              <button
                type="button"
                className="aula-documentos-import-secondary"
                onClick={() => setSlidePreview((current) => current ? { ...current, index: current.index + 1 } : current)}
                disabled={slidePreview.index >= slidePreview.slides.length - 1}
              >
                Siguiente
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {presentation ? (
        <Suspense fallback={<div className="aula-documentos-presentation-fallback" role="status">Cargando presentación…</div>}>
          <PresentationView
            title={presentation.title}
            slides={presentation.slides}
            theme={presentationTheme}
            notes={presentationNotes}
            onExit={closePresentation}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
