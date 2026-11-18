"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Code,
  Code2,
  Download,
  FilePenLine,
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Redo2,
  Save,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AULA_DOCUMENT_SCHEMA_VERSION,
  AULA_DOCUMENT_TITLE_MAX_LENGTH,
  normalizeAulaLink,
  parseAulaDocument,
  type AulaDocument,
} from "../../../../lib/domain/aula-documentos/document";
import { createStarterAulaDocument } from "../../../../lib/domain/aula-documentos/starter";
import { MERMAID_TEMPLATES } from "../../../../lib/domain/mermaid/templates";
import { useAppDocument } from "../use-app-document";
import type { StoreRole } from "../types";
import { createAulaDocumentExtensions } from "../../shared/aula-documentos/document-extensions";
import { buildAulaDocumentHtml, collectMermaidCodes, countMermaidBlocks, renderMermaidSvgs } from "../../shared/aula-documentos/export-html";
import { getMermaidRenderer } from "../../shared/aula-documentos/mermaid-renderer";
import "./aula-documentos.css";

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
 * Cuenta palabras de texto plano.
 * @param text - Texto del editor.
 * @returns Número de palabras.
 */
function countWords(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.split(" ").length : 0;
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
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("Cargando documento…");
  const [wordCount, setWordCount] = useState(0);
  const [diagramCount, setDiagramCount] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const pendingDocumentRef = useRef<AulaDocument | null>(null);
  const applyingDocumentRef = useRef(false);
  const readOnly = role === "guest";
  const { load, save, loading, error } = useAppDocument<AulaDocument>(projectId, "aula-documentos");

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
      setDirty(true);
      setStatus("Documento modificado.");
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
    const current = editorRef.current;
    if (current) {
      applyingDocumentRef.current = true;
      current.commands.setContent(document.content, { emitUpdate: false });
      setWordCount(countWords(current.getText()));
      setDiagramCount(countMermaidBlocks(current.getJSON()));
      window.setTimeout(() => { applyingDocumentRef.current = false; }, 0);
    }
    setDirty(false);
    setStatus("Documento guardado cargado.");
  }, []);

  useEffect(() => {
    let active = true;
    void load().then(({ state }) => {
      if (!active) return;
      if (state === null) {
        setStatus("Documento de ejemplo listo. Guarda para conservarlo.");
        return;
      }
      const parsed = parseAulaDocument(state);
      if (parsed.ok) {
        applyDocument(parsed.document);
      } else {
        setStatus(parsed.message);
      }
    });
    return () => { active = false; };
  }, [applyDocument, load]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  /**
   * Obtiene el documento actual validado.
   * @returns El documento o `null` si no cumple el esquema.
   */
  function currentDocument(): AulaDocument | null {
    if (!editor) return null;
    const parsed = parseAulaDocument({
      schemaVersion: AULA_DOCUMENT_SCHEMA_VERSION,
      title,
      content: editor.getJSON(),
    });
    if (!parsed.ok) {
      setStatus(parsed.message);
      return null;
    }
    return parsed.document;
  }

  /**
   * Guarda el documento en el proyecto.
   */
  async function saveDocument() {
    if (readOnly) return;
    const document = currentDocument();
    if (!document) return;
    setSaving(true);
    const ok = await save(document);
    setSaving(false);
    if (ok) {
      setTitle(document.title);
      setDirty(false);
      setStatus("Documento guardado en el proyecto.");
    } else {
      setStatus("No se pudo guardar el documento. Revisa la conexión.");
    }
  }

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
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `aula-documentos-${projectId}.html`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatus("HTML descargado.");
    } catch {
      setStatus("No se pudo preparar el HTML del documento.");
    } finally {
      setExporting(false);
    }
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
    setDirty(true);
    setStatus("Título actualizado.");
  }

  const statusText = loading
    ? "Cargando documento…"
    : error ?? (dirty ? `${status} Cambios sin guardar.` : status);
  const wordLabel = wordCount === 1 ? "1 palabra" : `${wordCount} palabras`;
  const diagramLabel = diagramCount === 1 ? "1 diagrama" : `${diagramCount} diagramas`;

  const fileActions: ToolbarAction[] = [
    {
      label: "Guardar documento",
      icon: <Save size={15} aria-hidden />,
      onClick: () => { void saveDocument(); },
      disabled: readOnly || saving || loading || !editor,
    },
    {
      label: "Exportar HTML",
      icon: exporting ? <Loader2 size={15} className="aula-documentos-spin" aria-hidden /> : <Download size={15} aria-hidden />,
      onClick: () => { void exportHtml(); },
      disabled: !editor || exporting,
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
            {readOnly ? "Solo lectura" : saving ? "Guardando…" : dirty ? "Cambios sin guardar" : "Documento local"}
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
        <div className="aula-documentos-tool-group aula-documentos-file-actions">
          {fileActions.map((action) => <ToolButton action={action} key={action.label} />)}
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
              readOnly={readOnly}
            />
            <div className="aula-documentos-divider" aria-hidden />
            <EditorContent editor={editor} className="aula-documentos-editor" />
            {!editor ? <p className="aula-documentos-editor-loading">Preparando el editor…</p> : null}
          </article>
        </section>

        <aside className="aula-documentos-side">
          <section className="aula-documentos-info">
            <h3>Texto y diagramas juntos</h3>
            <p>Escribe el documento y usa <strong>Diagrama</strong> para insertar un bloque Mermaid. El bloque se mueve con el contenido y se exporta como SVG.</p>
            <p className="aula-documentos-status" role="status">{statusText}</p>
          </section>
          <section className="aula-documentos-help">
            <h3>Atajos</h3>
            <ul>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>B</kbd> negrita</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>I</kbd> cursiva</li>
              <li><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd> enlace</li>
              <li>En un diagrama, <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Intro</kbd> aplica el código.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
