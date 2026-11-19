"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Code,
  Code2,
  Download,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Save,
  Underline,
  Undo2,
} from "lucide-react";
import type { StoreRole } from "../types";
import { useVersionedDraft } from "../use-versioned-draft";
import { useWindowClose } from "../../store/window-close-guard";
import { aulaFileName } from "../../../../lib/domain/aula-documentos/filename";
import VersionConflictDialog from "../version-conflict-dialog";
import UnsavedChangesDialog from "../unsaved-changes-dialog";
import { createDocumentExtensions } from "./documentos-editor";
import { buildNotesHtml } from "./documentos-export";
import {
  NOTE_TITLE_MAX_LENGTH,
  countWords,
  createStarterDocument,
  normalizeLinkUrl,
  parseNotesDocument,
  type NotesDocument,
} from "./documentos-model";
import "./documentos.css";

type ToolbarAction = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
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

/**
 * Botón de la barra de formato.
 * @param props - Acción, estado y contenido del botón.
 * @returns El botón accesible de la barra.
 */
function ToolButton({ action }: { action: ToolbarAction }) {
  return (
    <button
      type="button"
      className={`documentos-tool${action.active ? " is-active" : ""}`}
      onClick={action.onClick}
      onMouseDown={(event) => event.preventDefault()}
      aria-label={action.label}
      aria-pressed={action.active === undefined ? undefined : action.active}
      title={action.label}
      disabled={action.disabled}
    >
      {action.icon}
    </button>
  );
}

/**
 * Notas y documentos: editor de texto enriquecido y guardado por proyecto.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana con el editor y la barra de formato.
 */
export default function DocumentosApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const [initialDocument] = useState(createStarterDocument);
  const [title, setTitle] = useState(initialDocument.title);
  const [wordCount, setWordCount] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [closePromptOpen, setClosePromptOpen] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const pendingDocumentRef = useRef<NotesDocument | null>(null);
  const applyingDocumentRef = useRef(false);
  const readOnly = role === "guest";
  const forceClose = useWindowClose();

  /**
   * Aplica un documento validado al editor y al título.
   * @param document - Documento que se muestra.
   */
  const applyDocument = useCallback((document: NotesDocument) => {
    pendingDocumentRef.current = document;
    setTitle(document.title);
    const current = editorRef.current;
    if (current) {
      applyingDocumentRef.current = true;
      current.commands.setContent(document.content, { emitUpdate: false });
      setWordCount(countWords(current.getText()));
      window.setTimeout(() => { applyingDocumentRef.current = false; }, 0);
    }
  }, []);

  const draft = useVersionedDraft<NotesDocument>({
    projectId,
    appId: "documentos",
    getValue: () => {
      const current = editorRef.current;
      if (!current) return null;
      return parseNotesDocument({ title, content: current.getJSON() });
    },
    applyLoaded: (loaded) => {
      const parsed = parseNotesDocument(loaded);
      if (!parsed) return false;
      applyDocument(parsed);
      return true;
    },
    readOnly,
    formatCopy: (document) => ({
      contents: JSON.stringify(document, null, 2),
      type: "application/json;charset=utf-8",
      fileName: aulaFileName(document.title, "json", "notas"),
    }),
    onCloseBlocked: () => setClosePromptOpen(true),
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: createDocumentExtensions(),
    content: initialDocument.content,
    editorProps: {
      attributes: {
        class: "documentos-prose",
        "aria-label": "Contenido de la nota",
        spellcheck: "true",
      },
    },
    onCreate: ({ editor: current }) => {
      editorRef.current = current;
      current.setEditable(!readOnly);
      setWordCount(countWords(current.getText()));
      const pending = pendingDocumentRef.current;
      if (pending) {
        applyingDocumentRef.current = true;
        current.commands.setContent(pending.content, { emitUpdate: false });
        setWordCount(countWords(current.getText()));
        window.setTimeout(() => { applyingDocumentRef.current = false; }, 0);
      }
    },
    onTransaction: ({ editor: current, transaction }) => {
      if (!transaction.docChanged) return;
      setWordCount(countWords(current.getText()));
      if (applyingDocumentRef.current) return;
      draft.markDirty();
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

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus();
  }, [linkOpen]);

  /**
   * Cambia el título y marca el documento como modificado.
   * @param value - Nuevo título.
   */
  function updateTitle(value: string) {
    setTitle(value);
    draft.markDirty("Título actualizado.");
  }

  /**
   * Abre el panel de enlace y carga el enlace activo si existe.
   */
  function openLinkPanel() {
    if (!editor || readOnly) return;
    const current = editor.getAttributes("link").href;
    setLinkUrl(typeof current === "string" ? current : "");
    setLinkError(null);
    setLinkOpen(true);
  }

  /**
   * Aplica el enlace escrito a la selección actual.
   */
  function applyLink() {
    if (!editor || readOnly) return;
    const href = normalizeLinkUrl(linkUrl);
    if (!href) {
      setLinkError("Escribe un enlace http, https o un correo válido.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setLinkUrl("");
    setLinkError(null);
    draft.markDirty("Enlace aplicado.");
  }

  /**
   * Quita el enlace de la selección actual.
   */
  function removeLink() {
    if (!editor || readOnly) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setLinkUrl("");
    setLinkError(null);
    draft.markDirty("Enlace retirado.");
  }

  /**
   * Obtiene el documento actual ya validado para guardar o exportar.
   * @returns El documento o `null` si el editor no está disponible.
   */
  function currentDocument(): NotesDocument | null {
    if (!editor) return null;
    return parseNotesDocument({ title, content: editor.getJSON() });
  }

  /**
   * Guarda el documento en el proyecto.
   */
  async function saveDocument() {
    if (readOnly) return;
    await draft.save(false);
  }

  /**
   * Guarda y cierra la ventana, o mantiene el aviso si falla.
   */
  async function saveAndClose() {
    setClosePromptOpen(false);
    if (await draft.save(false)) forceClose();
  }

  /**
   * Descarga el documento como HTML autónomo.
   */
  function exportHtml() {
    const note = currentDocument();
    if (!note) {
      draft.setStatus("No se pudo preparar el HTML del documento.");
      return;
    }
    try {
      const blob = new Blob([buildNotesHtml(note)], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = aulaFileName(note.title, "html", "notas");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      draft.setStatus("HTML descargado.");
    } catch {
      draft.setStatus("No se pudo preparar el HTML del documento.");
    }
  }

  const statusText = draft.loading
    ? "Cargando documento…"
    : draft.error ?? (
      draft.ready && draft.updatedAt === null && !draft.dirty && !draft.saveFailed
        ? "Documento de ejemplo listo. Guarda para conservarlo."
        : draft.dirty
          ? `${draft.status} Cambios sin guardar.`
          : draft.status
    );
  const chipText = readOnly
    ? "Solo lectura"
    : draft.conflict
      ? "Conflicto sin resolver"
      : draft.saving
        ? "Guardando…"
        : draft.saveFailed
          ? "Error al guardar"
          : draft.dirty
            ? "Cambios sin guardar"
            : draft.lastSavedAt
              ? "Documento guardado"
              : "Documento local";
  const fileActions: ToolbarAction[] = [
    {
      label: "Guardar documento",
      disabled: readOnly || draft.saving || draft.loading || !editor || Boolean(draft.conflict),
      onClick: () => { void saveDocument(); },
      icon: <Save size={15} aria-hidden />,
    },
    {
      label: "Exportar HTML",
      disabled: !editor,
      onClick: exportHtml,
      icon: <Download size={15} aria-hidden />,
    },
  ];

  const groups: ToolbarAction[][] = editor && !readOnly ? [
    [
      {
        label: "Párrafo",
        active: toolbar.paragraph,
        onClick: () => editor.chain().focus().setParagraph().run(),
        icon: <Pilcrow size={15} aria-hidden />,
      },
      {
        label: "Título 1",
        active: toolbar.heading1,
        onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        icon: <Heading1 size={15} aria-hidden />,
      },
      {
        label: "Título 2",
        active: toolbar.heading2,
        onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        icon: <Heading2 size={15} aria-hidden />,
      },
      {
        label: "Título 3",
        active: toolbar.heading3,
        onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        icon: <Heading3 size={15} aria-hidden />,
      },
    ],
    [
      {
        label: "Negrita",
        active: toolbar.bold,
        onClick: () => editor.chain().focus().toggleBold().run(),
        icon: <Bold size={15} aria-hidden />,
      },
      {
        label: "Cursiva",
        active: toolbar.italic,
        onClick: () => editor.chain().focus().toggleItalic().run(),
        icon: <Italic size={15} aria-hidden />,
      },
      {
        label: "Subrayado",
        active: toolbar.underline,
        onClick: () => editor.chain().focus().toggleUnderline().run(),
        icon: <Underline size={15} aria-hidden />,
      },
    ],
    [
      {
        label: "Lista con viñetas",
        active: toolbar.bulletList,
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        icon: <List size={15} aria-hidden />,
      },
      {
        label: "Lista numerada",
        active: toolbar.orderedList,
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        icon: <ListOrdered size={15} aria-hidden />,
      },
    ],
    [
      {
        label: "Cita",
        active: toolbar.blockquote,
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
        icon: <Quote size={15} aria-hidden />,
      },
      {
        label: "Código en línea",
        active: toolbar.code,
        onClick: () => editor.chain().focus().toggleCode().run(),
        icon: <Code size={15} aria-hidden />,
      },
      {
        label: "Bloque de código",
        active: toolbar.codeBlock,
        onClick: () => editor.chain().focus().toggleCodeBlock().run(),
        icon: <Code2 size={15} aria-hidden />,
      },
    ],
    [
      {
        label: "Insertar o editar enlace",
        active: toolbar.link,
        disabled: !toolbar.canLink,
        onClick: openLinkPanel,
        icon: <Link2 size={15} aria-hidden />,
      },
    ],
    [
      {
        label: "Deshacer",
        disabled: !toolbar.canUndo,
        onClick: () => editor.chain().focus().undo().run(),
        icon: <Undo2 size={15} aria-hidden />,
      },
      {
        label: "Rehacer",
        disabled: !toolbar.canRedo,
        onClick: () => editor.chain().focus().redo().run(),
        icon: <Redo2 size={15} aria-hidden />,
      },
    ],
  ] : [];

  return (
    <div className="documentos-app">
      <header className="documentos-top">
        <div className="documentos-heading">
          <span className="documentos-mark" aria-hidden>
            <FileText size={18} strokeWidth={2} />
          </span>
          <span>
            <strong>Notas y documentos</strong>
            <small>Editor de texto</small>
          </span>
        </div>
        <div className="documentos-meta" aria-label="Estado del documento">
          <span className={draft.dirty && !readOnly ? "documentos-chip is-dirty" : "documentos-chip"}>
            {chipText}
          </span>
          <span className="documentos-words">{wordCount} palabras</span>
        </div>
      </header>

      <div className="documentos-toolbar" role="toolbar" aria-label="Formato del documento">
        {groups.map((group, index) => (
          <div className="documentos-tool-group" key={index}>
            {group.map((action) => <ToolButton action={action} key={action.label} />)}
          </div>
        ))}
        <div className="documentos-tool-group documentos-file-actions">
          {fileActions.map((action) => <ToolButton action={action} key={action.label} />)}
        </div>
        {!editor ? <span className="documentos-loading">Preparando editor…</span> : null}
      </div>

      {readOnly ? (
        <p className="documentos-readonly" role="note">
          Modo lectura: puedes consultar y exportar el documento, pero no editarlo ni guardarlo.
        </p>
      ) : null}

      {linkOpen && !readOnly ? (
        <form
          className="documentos-link-bar"
          onSubmit={(event) => {
            event.preventDefault();
            applyLink();
          }}
        >
          <label className="documentos-link-label" htmlFor="documentos-link-url">Enlace</label>
          <input
            ref={linkInputRef}
            id="documentos-link-url"
            className="documentos-link-input"
            type="text"
            inputMode="url"
            value={linkUrl}
            onChange={(event) => {
              setLinkUrl(event.target.value);
              setLinkError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://ejemplo.com o nombre@correo.com"
            aria-describedby={linkError ? "documentos-link-error" : undefined}
          />
          <button type="submit" className="documentos-link-action" disabled={!linkUrl.trim()}>Aplicar</button>
          {toolbar.link ? (
            <button type="button" className="documentos-link-action secondary" onClick={removeLink}>Quitar</button>
          ) : null}
          <button type="button" className="documentos-link-close" onClick={() => setLinkOpen(false)} aria-label="Cerrar enlace">
            Cerrar
          </button>
          {linkError ? (
            <span id="documentos-link-error" className="documentos-link-error" role="alert">{linkError}</span>
          ) : (
            <span className="documentos-link-hint">Solo http, https o correo.</span>
          )}
        </form>
      ) : null}

      <div className="documentos-layout">
        <section className="documentos-stage" aria-label="Documento">
          <article className="documentos-paper">
            <input
              className="documentos-title"
              value={title}
              maxLength={NOTE_TITLE_MAX_LENGTH}
              onChange={(event) => updateTitle(event.target.value)}
              aria-label="Título del documento"
              placeholder="Título del documento"
              spellCheck
              readOnly={readOnly}
            />
            <div className="documentos-divider" aria-hidden />
            <EditorContent editor={editor} className="documentos-editor" />
            {!editor ? <p className="documentos-editor-loading">Preparando el editor…</p> : null}
          </article>
        </section>

        <aside className="documentos-side">
          <section className="documentos-info">
            <h3>Documento de ejemplo</h3>
            <p>Escribe una nota, aplica formato y revisa cómo se lee. Los cambios se guardan en el proyecto.</p>
            <p className="documentos-status" role="status">{statusText}</p>
          </section>
          <section className="documentos-help">
            <h3>Atajos</h3>
            <ul>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>B</kbd> negrita</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>I</kbd> cursiva</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd> enlace</li>
              <li>Selecciona texto para enlazarlo.</li>
            </ul>
          </section>
        </aside>
      </div>

      <UnsavedChangesDialog
        open={closePromptOpen}
        busy={draft.saving}
        notice={draft.saveFailed ? draft.status : null}
        onStay={() => setClosePromptOpen(false)}
        onDiscard={() => {
          setClosePromptOpen(false);
          forceClose();
        }}
        onSave={() => { void saveAndClose(); }}
      />

      <VersionConflictDialog
        open={Boolean(draft.conflict)}
        serverUpdatedAt={draft.conflict?.serverUpdatedAt ?? null}
        notice={draft.conflictNotice}
        busy={draft.saving}
        onDownload={() => { draft.downloadCopy(); }}
        onReload={() => { void draft.reloadServerVersion(); }}
        onKeepMine={() => { void draft.keepMineVersion(); }}
      />
    </div>
  );
}
