"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { StoreRole } from "../../types";
import type {
  AulaDocumentComment,
  AulaDocumentCommentThread,
} from "../../../../../lib/domain/aula-documentos/revision";
import { createAulaCommentAnchor } from "../revision/comment-anchor";
import { matchesAulaShortcut } from "../atajos/shortcuts";

type CommentsDeps = {
  projectId: string;
  documentId: string | null;
  editor: Editor | null;
  role: StoreRole;
  setStatus: (message: string) => void;
};

/** Respuesta paginada de comentarios. */
type CommentsResponse = {
  threads?: AulaDocumentCommentThread[];
  total?: number;
  comment?: AulaDocumentComment;
  message?: string;
};

/**
 * Gestiona los comentarios del documento activo.
 * @param deps - Proyecto, documento, editor y rol.
 * @returns Estado, panel y acciones de comentarios.
 */
export function useAulaComments({ projectId, documentId, editor, role, setStatus }: CommentsDeps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [threads, setThreads] = useState<AulaDocumentCommentThread[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousDocumentId = useRef(documentId);
  const focusOriginRef = useRef<HTMLElement | null>(null);
  const commentsPath = documentId
    ? `/api/aula-documentos/${encodeURIComponent(documentId)}/comments`
    : null;
  const endpoint = commentsPath
    ? `${commentsPath}?project=${encodeURIComponent(projectId)}`
    : null;

  useEffect(() => {
    if (previousDocumentId.current === documentId) return;
    previousDocumentId.current = documentId;
    queueMicrotask(() => setCommentsOpen(false));
  }, [documentId]);

  const refresh = useCallback(async () => {
    if (!endpoint) {
      setThreads([]);
      setCommentCount(0);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as CommentsResponse;
      setThreads(data.threads ?? []);
      setCommentCount(data.total ?? 0);
      setError(null);
    } catch {
      setError("No se pudieron cargar los comentarios.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    queueMicrotask(() => {
      setThreads([]);
      setCommentCount(0);
      setError(null);
    });
  }, [endpoint]);

  const openComments = useCallback((origin?: HTMLElement) => {
    focusOriginRef.current = origin ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setCommentsOpen(true);
    void refresh();
  }, [refresh]);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
    const origin = focusOriginRef.current;
    focusOriginRef.current = null;
    queueMicrotask(() => {
      if (origin?.isConnected) origin.focus();
      else editor?.commands.focus();
    });
  }, [editor]);

  const createComment = useCallback(async (body: string, parentId: string | null = null) => {
    if (!endpoint || role === "guest") return false;
    const anchor = createAulaCommentAnchor(editor);
    if (!anchor) {
      setStatus("Selecciona texto o coloca el cursor en un bloque para comentar.");
      return false;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body, parentId, anchor }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as CommentsResponse;
        setStatus(data.message ?? "No se pudo crear el comentario.");
        return false;
      }
      await refresh();
      setStatus(parentId ? "Respuesta añadida." : "Comentario añadido.");
      return true;
    } catch {
      setStatus("No se pudo crear el comentario.");
      return false;
    }
  }, [editor, endpoint, refresh, role, setStatus]);

  const updateComment = useCallback(async (
    comment: AulaDocumentComment,
    action: "edit" | "resolve" | "reopen" | "delete",
    body?: string,
  ) => {
    if (!endpoint || role === "guest") return false;
    try {
      const response = await fetch(`${commentsPath}/${encodeURIComponent(comment.id)}?project=${encodeURIComponent(projectId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          ...(body === undefined ? {} : { body }),
          expectedUpdatedAt: comment.updatedAt,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as CommentsResponse;
        setStatus(data.message ?? "No se pudo actualizar el comentario.");
        return false;
      }
      await refresh();
      setStatus(
        action === "delete" ? "Comentario borrado."
          : action === "resolve" ? "Comentario resuelto."
            : action === "reopen" ? "Comentario reabierto."
              : "Comentario actualizado.",
      );
      return true;
    } catch {
      setStatus("No se pudo actualizar el comentario.");
      return false;
    }
  }, [commentsPath, endpoint, projectId, refresh, role, setStatus]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const app = document.querySelector(".aula-documentos-app");
      if (!app || !(event.target instanceof Node) || !app.contains(event.target)) return;
      if (matchesAulaShortcut(event, "comments")) {
        event.preventDefault();
        setCommentsOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return {
    commentsOpen,
    commentCount,
    comments: threads,
    commentsLoading: loading,
    commentsError: error,
    openComments,
    closeComments,
    refreshComments: refresh,
    createComment,
    updateComment,
    canComment: role !== "guest",
  };
}
