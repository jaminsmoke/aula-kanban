"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { BOOK_LEVELS } from "../../../../lib/books";
import type { BookMeta } from "../../../../lib/books";

type BookToolItem = BookMeta & { enabled: boolean };

/**
 * Panel de herramientas de libros (STORE-04): qué libros del catálogo
 * son herramienta en la mochila del alumnado y el maletín docente de
 * este proyecto. Toggle maestro para todos y selección individual.
 * @param props - Proyecto activo.
 * @returns El panel de libros de la pestaña «Herramientas».
 */
export default function BooksToolsPanel({ projectId }: { projectId: string }) {
  const [books, setBooks] = useState<BookToolItem[] | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/project-books?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { books: BookToolItem[] };
      setBooks(data.books);
      setDraft(new Set(data.books.filter((book) => book.enabled).map((book) => book.id)));
      setError("");
      setSaved(false);
    } catch {
      setBooks(null);
      setError("No se pudieron consultar los libros del proyecto.");
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const toggle = (id: string, checked: boolean) => {
    setSaved(false);
    setDraft((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setSaved(false);
    setDraft(checked && books ? new Set(books.map((book) => book.id)) : new Set());
  };

  async function save() {
    if (!books || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/project-books?project=${encodeURIComponent(projectId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookIds: [...draft] }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "No se pudieron guardar los libros.");
      }
      setSaved(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!books) {
    return error
      ? <div role="alert" className="alert">{error} <button type="button" className="text-button" onClick={() => void load()}>Reintentar</button></div>
      : <p role="status">Cargando libros…</p>;
  }

  const allOn = books.length > 0 && draft.size === books.length;
  const unchanged = draft.size === books.filter((book) => book.enabled).length
    && books.every((book) => book.enabled === draft.has(book.id));

  return (
    <section className="tools-panel" aria-label="Herramientas de libros">
      <header className="tools-panel-head">
        <span className="tools-head-icon" aria-hidden><BookOpen size={22} strokeWidth={2} /></span>
        <div>
          <h3>Libros</h3>
          <p>Los libros seleccionados aparecen como herramienta en la mochila del alumnado y en el maletín docente.</p>
        </div>
      </header>

      <label className="tools-toggle-row">
        <input type="checkbox" checked={allOn} onChange={(event) => toggleAll(event.target.checked)} />
        <span>Todos los libros</span>
        <span className="tools-count">{draft.size} de {books.length}</span>
      </label>

      {BOOK_LEVELS.map((level) => {
        const levelBooks = books.filter((book) => book.level === level);
        if (!levelBooks.length) return null;
        return (
          <fieldset key={level} className="tools-group">
            <legend>{level}</legend>
            {levelBooks.map((book) => (
              <label key={book.id} className="tools-book-row">
                <input
                  type="checkbox"
                  checked={draft.has(book.id)}
                  onChange={(event) => toggle(book.id, event.target.checked)}
                />
                <span className="tools-book-title">{book.title}</span>
                <span className="tools-book-meta">{book.course} · {book.subject} · {(book.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
              </label>
            ))}
          </fieldset>
        );
      })}

      {error && <div role="alert" className="alert">{error}</div>}
      <div className="tools-actions">
        <button type="button" className="primary" disabled={busy || unchanged} onClick={() => void save()}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
        {saved && <span role="status" className="tools-saved">Guardado</span>}
      </div>
    </section>
  );
}
