"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import type { AulaDocumentComment } from "../../../../../lib/domain/aula-documentos/revision";
import { formatDateTime } from "../../../shared/ui/date";
import { resolveAulaCommentAnchor } from "../../../shared/aula-documentos/comment-anchor";
import { useAulaDocumentosView } from "../aula-documentos-context";

/**
 * Panel lateral de comentarios y respuestas del documento.
 * @returns El panel o `null` si está cerrado.
 */
export function DocumentCommentsPanel() {
  const {
    editor,
    commentsOpen,
    comments,
    commentCount,
    commentsLoading,
    commentsError,
    closeComments,
    createComment,
    updateComment,
    canComment,
  } = useAulaDocumentosView();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (commentsOpen) inputRef.current?.focus();
  }, [commentsOpen]);

  if (!commentsOpen) return null;

  const visible = filter === "open" ? comments.filter((thread) => thread.status === "open") : comments;

  async function submitComment() {
    if (await createComment(draft)) setDraft("");
  }

  async function submitReply(parentId: string) {
    if (await createComment(replyDraft, parentId)) {
      setReplyDraft("");
      setReplyTo(null);
    }
  }

  async function saveEdit(comment: AulaDocumentComment) {
    if (await updateComment(comment, "edit", editDraft)) {
      setEditingId(null);
      setEditDraft("");
    }
  }

  function confirmDelete(comment: AulaDocumentComment) {
    if (!window.confirm("¿Borrar este comentario? Se conservará el hilo para auditoría.")) return;
    void updateComment(comment, "delete");
  }

  function commentDate(comment: AulaDocumentComment): string {
    return formatDateTime(comment.createdAt) ?? "Sin fecha";
  }

  function commentActions(comment: AulaDocumentComment) {
    return (
      <div className="aula-documentos-comment-actions">
        {comment.capabilities.canEdit ? (
          <button type="button" onClick={() => { setEditingId(comment.id); setEditDraft(comment.body); }}>
            Editar
          </button>
        ) : null}
        {comment.capabilities.canResolve && !comment.parentId ? (
          <button
            type="button"
            onClick={() => { void updateComment(comment, comment.status === "resolved" ? "reopen" : "resolve"); }}
          >
            {comment.status === "resolved" ? "Reabrir" : "Resolver"}
          </button>
        ) : null}
        {comment.capabilities.canDelete ? (
          <button type="button" onClick={() => confirmDelete(comment)}>Borrar</button>
        ) : null}
      </div>
    );
  }

  function renderComment(comment: AulaDocumentComment, isReply = false) {
    return (
      <article className={`aula-documentos-comment${isReply ? " is-reply" : ""}`} key={comment.id}>
        <header className="aula-documentos-comment-head">
          <strong>{comment.authorName}</strong>
          <time dateTime={new Date(comment.createdAt).toISOString()}>{commentDate(comment)}</time>
          {comment.status === "resolved" ? <span className="aula-documentos-comment-status">Resuelto</span> : null}
        </header>
        {editingId === comment.id ? (
          <div className="aula-documentos-comment-edit">
            <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} aria-label="Editar comentario" />
            <div>
              <button type="button" onClick={() => { void saveEdit(comment); }}>Guardar</button>
              <button type="button" onClick={() => setEditingId(null)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <p>{comment.body}</p>
        )}
        {commentActions(comment)}
        {!isReply && canComment && comment.status === "open" ? (
          replyTo === comment.id ? (
            <div className="aula-documentos-comment-reply">
              <textarea
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                aria-label="Responder al comentario"
                autoFocus
              />
              <div>
                <button type="button" onClick={() => { void submitReply(comment.id); }}>Responder</button>
                <button type="button" onClick={() => { setReplyTo(null); setReplyDraft(""); }}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="aula-documentos-comment-reply-button"
              onClick={() => { setReplyTo(comment.id); setReplyDraft(""); }}
            >
              Responder
            </button>
          )
        ) : null}
      </article>
    );
  }

  return (
    <aside className="aula-documentos-comments" aria-label="Comentarios del documento">
      <header className="aula-documentos-comments-head">
        <div>
          <h2><MessageSquare size={15} aria-hidden /> Comentarios</h2>
          <span>{commentCount} en total</span>
        </div>
        <button type="button" className="aula-documentos-comments-close" onClick={closeComments} aria-label="Cerrar comentarios">
          <X size={15} aria-hidden />
        </button>
      </header>

      {canComment ? (
        <form
          className="aula-documentos-comment-form"
          onSubmit={(event) => { event.preventDefault(); void submitComment(); }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Comenta la selección o el bloque actual."
            aria-label="Nuevo comentario"
          />
          <button type="submit" disabled={!draft.trim()} aria-label="Publicar comentario">
            <Send size={13} aria-hidden />
            Comentar
          </button>
        </form>
      ) : (
        <p className="aula-documentos-comments-readonly">Puedes leer los comentarios, pero no escribir en ellos.</p>
      )}

      <div className="aula-documentos-comments-filters" role="group" aria-label="Filtrar comentarios">
        <button type="button" aria-pressed={filter === "open"} onClick={() => setFilter("open")}>Abiertos</button>
        <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todos</button>
      </div>

      {commentsLoading ? <p className="aula-documentos-comments-message">Cargando comentarios…</p> : null}
      {commentsError ? <p className="aula-documentos-comments-error" role="alert">{commentsError}</p> : null}
      {!commentsLoading && !commentsError && visible.length === 0 ? (
        <p className="aula-documentos-comments-message">
          {filter === "open" ? "No hay comentarios abiertos." : "Todavía no hay comentarios."}
        </p>
      ) : null}

      <div className="aula-documentos-comments-list">
        {visible.map((thread) => {
          const resolved = resolveAulaCommentAnchor(editor, thread.anchor);
          return (
            <section className="aula-documentos-comment-thread" key={thread.id}>
              <div className="aula-documentos-comment-quote">
                <span>{thread.anchor.quote || "Comentario de bloque"}</span>
                {resolved.orphan ? (
                  <small className="is-orphan">Ancla no encontrada</small>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (resolved.from === null || resolved.to === null) return;
                      editor?.chain().focus().setTextSelection({ from: resolved.from, to: resolved.to }).scrollIntoView().run();
                    }}
                  >
                    Ir al texto
                  </button>
                )}
              </div>
              {renderComment(thread)}
              {thread.replies.map((reply) => renderComment(reply, true))}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
