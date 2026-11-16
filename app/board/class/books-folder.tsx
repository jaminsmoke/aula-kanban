"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, TriangleAlert } from "lucide-react";
import type { StoreTool } from "../store/tools";
import "./books-folder.css";
import type { BookWithAvailability } from "../../../lib/server/books";
import { BOOK_LEVELS } from "../../../lib/books";

/**
 * Adapta un libro a la forma de herramienta que usa la ventana del
 * desktop (solo importan id, nombre, descripción e icono; el tamaño cae
 * al de ventana estándar).
 * @param book - Libro del catálogo con su disponibilidad y URL.
 * @returns La herramienta simulada para abrir la ventana del visor.
 */
export function bookTool(book: BookWithAvailability): StoreTool {
  return {
    id: `book-${book.id}`,
    name: book.title,
    tagline: book.tagline,
    description: book.description,
    categories: ["Educación"],
    subcategory: "Herramientas",
    cover: "",
    features: [],
    appVersion: "1.0.0",
    versionLabel: book.title,
    upstream: { name: book.source.name, version: book.version ?? "" },
    window: { width: 920, height: 640 },
    icon: BookOpen,
    roles: ["owner", "admin", "teacher", "student", "guest"],
  } as StoreTool;
}

/**
 * Carpeta «Libros» del escritorio personal (STORE-04): los libros
 * habilitados en el proyecto por el docente, agrupados por nivel, para
 * abrirlos en ventana con visor de solo lectura. No es la carpeta
 * general de la mochila (APP-03B): es una carpeta independiente.
 * @param props - Proyecto activo y apertura del visor de un libro.
 * @returns La carpeta con los libros habilitados.
 */
export default function BooksFolder({ projectId, onOpen }: {
  projectId: string;
  onOpen: (book: BookWithAvailability) => void;
}) {
  const [available, setAvailable] = useState<Map<string, BookWithAvailability>>(new Map());
  const [enabled, setEnabled] = useState<string[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [catalog, assignment] = await Promise.all([
        fetch(`/api/books?project=${encodeURIComponent(projectId)}`, { cache: "no-store" }),
        fetch(`/api/project-books?project=${encodeURIComponent(projectId)}`, { cache: "no-store" }),
      ]);
      if (!catalog.ok || !assignment.ok) throw new Error();
      const catalogData = (await catalog.json()) as { books: BookWithAvailability[] };
      const assignmentData = (await assignment.json()) as { books: { id: string; enabled: boolean }[] };
      setAvailable(new Map(catalogData.books.map((book) => [book.id, book])));
      setEnabled(assignmentData.books.filter((book) => book.enabled).map((book) => book.id));
      setConfigured(true);
      setError("");
    } catch {
      setConfigured(false);
      setError("No se pudieron consultar tus libros.");
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  if (configured === null) return <p className="store-loading">Cargando libros…</p>;
  if (error) {
    return (
      <p role="alert" className="store-alert">
        <TriangleAlert size={16} aria-hidden /> {error}{" "}
        <button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button>
      </p>
    );
  }

  const books = enabled.map((id) => available.get(id)).filter((book): book is BookWithAvailability => Boolean(book));
  if (!books.length) return <p className="store-empty">El docente todavía no ha habilitado libros en este proyecto.</p>;

  return (
    <div className="books-folder">
      {BOOK_LEVELS.map((level) => {
        const levelBooks = books.filter((book) => book.level === level);
        if (!levelBooks.length) return null;
        return (
          <section key={level} className="books-folder-group" aria-label={`Libros de ${level}`}>
            <h3>{level}</h3>
            {levelBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                className="books-folder-row"
                disabled={!book.available}
                onClick={() => onOpen(book)}
              >
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Portadas servidas desde R2 con la sesión del proyecto
                  <img src={book.coverUrl} alt="" className="books-folder-cover" />
                ) : (
                  <span className="books-folder-icon" aria-hidden><BookOpen size={16} strokeWidth={2} /></span>
                )}
                <span className="books-folder-title">{book.title}</span>
                <span className="books-folder-meta">{book.course} · {book.subject}{book.available ? "" : " · pendiente de ingesta"}</span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
