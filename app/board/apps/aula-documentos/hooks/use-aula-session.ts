import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  DEFAULT_AULA_PRESENTATION,
  DEFAULT_AULA_PRINT_PAGE,
  isAulaPrintPageDefault,
  parseAulaDocument,
  type AulaDocument,
  type AulaPresentationTheme,
  type AulaPrintPage,
} from "../../../../../lib/domain/aula-documentos/document";
import { createStarterAulaDocument } from "../../../../../lib/domain/aula-documentos/starter";
import { createAulaDocumentExtensions } from "../editor/document-extensions";
import { countMermaidBlocks } from "../exportacion/export-html";
import { flushMermaidDrafts, setMermaidDraftChangeHandler } from "../editor/diagramas/mermaid-block";
import { imageFilesFromDataTransfer } from "../editor/image-upload";
import { countWords } from "../../../../../lib/domain/aula-documentos/text";
import { EMPTY_TOOLBAR_STATE } from "../aula-documentos-types";

type SessionDeps = {
  projectId: string;
  readOnly: boolean;
  editorRef: MutableRefObject<Editor | null>;
  insertImageRef: MutableRefObject<(files: File[], position?: number) => Promise<void>>;
};

/**
 * Mantiene el editor, el documento activo y el estado base de la ventana.
 * @param deps - Proyecto, permisos y referencias compartidas.
 * @returns Estado y acciones del documento.
 */
export function useAulaSession({ projectId, readOnly, editorRef, insertImageRef }: SessionDeps) {
  const [initialDocument] = useState(createStarterAulaDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [editVersion, setEditVersion] = useState(0);
  const [status, setStatus] = useState("Cargando documento…");
  const [wordCount, setWordCount] = useState(0);
  const [diagramCount, setDiagramCount] = useState(0);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [presentationTheme, setPresentationTheme] = useState<AulaPresentationTheme>(DEFAULT_AULA_PRESENTATION.theme);
  const [presentationNotes, setPresentationNotes] = useState<Record<string, string>>({});
  const [presentationPage, setPresentationPage] = useState<AulaPrintPage>(DEFAULT_AULA_PRINT_PAGE);
  const titleRef = useRef<HTMLInputElement>(null);
  const pendingDocumentRef = useRef<AulaDocument | null>(null);
  const applyingDocumentRef = useRef(false);
  const editVersionRef = useRef(0);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const documentVersionRef = useRef<number | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const actionsToggleRef = useRef<HTMLButtonElement>(null);

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
      if (event.key === "Escape") {
        setActionsOpen(false);
        actionsToggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [actionsOpen]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: createAulaDocumentExtensions(projectId),
    content: initialDocument.content,
    editorProps: {
      attributes: {
        class: "aula-documentos-prose",
        "aria-label": "Contenido del documento",
        spellcheck: "true",
      },
      handlePaste: (view, event) => {
        if (readOnly) return false;
        const files = imageFilesFromDataTransfer(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        void insertImageRef.current(files, view.state.selection.from);
        return true;
      },
      handleDrop: (view, event) => {
        if (readOnly) return false;
        const files = imageFilesFromDataTransfer(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertImageRef.current(files, position);
        return true;
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
        strike: current.isActive("strike"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        taskList: current.isActive("taskList"),
        blockquote: current.isActive("blockquote"),
        code: current.isActive("code"),
        codeBlock: current.isActive("codeBlock"),
        link: current.isActive("link"),
        alignLeft: current.isActive({ textAlign: "left" }),
        alignCenter: current.isActive({ textAlign: "center" }),
        alignRight: current.isActive({ textAlign: "right" }),
        alignJustify: current.isActive({ textAlign: "justify" }),
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
    setPresentationPage(document.presentation?.page ?? DEFAULT_AULA_PRINT_PAGE);
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
  }, [editorRef]);

  useEffect(() => {
    editor?.setEditable(!readOnly && !false);
  }, [editor, readOnly]);

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
        ...(isAulaPrintPageDefault(presentationPage) ? {} : { page: presentationPage }),
      },
    });
    if (!parsed.ok) {
      setStatus(parsed.message);
      return null;
    }
    return parsed.document;
  }, [editor, presentationNotes, presentationPage, presentationTheme, title]);

  /**
   * Actualiza el título y marca cambios.
   * @param value - Nuevo título.
   */
  function updateTitle(value: string) {
    setTitle(value);
    markChanged("Título actualizado.");
  }

  return {
    initialDocument,
    title,
    setTitle,
    dirty,
    setDirty,
    saving,
    setSaving,
    saveFailed,
    setSaveFailed,
    lastSavedAt,
    setLastSavedAt,
    editVersion,
    setEditVersion,
    status,
    setStatus,
    wordCount,
    diagramCount,
    actionsOpen,
    setActionsOpen,
    presentationTheme,
    setPresentationTheme,
    presentationNotes,
    setPresentationNotes,
    presentationPage,
    setPresentationPage,
    titleRef,
    editVersionRef,
    savingRef,
    mountedRef,
    documentVersionRef,
    actionsRef,
    actionsToggleRef,
    editor,
    toolbar,
    markChanged,
    applyDocument,
    currentDocument,
    updateTitle,
  };
}
