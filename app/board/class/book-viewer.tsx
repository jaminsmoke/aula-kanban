"use client";

import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { BookWithAvailability } from "../../../lib/server/books/books";

/**
 * Visor embebido de solo lectura (STORE-04): el PDF del libro en
 * ventana propia, sin botón de descarga, con la atribución visible.
 * @param props - Proyecto activo e identificador del libro.
 * @returns El visor del libro.
 */
export default function BookViewer({ projectId, bookId }: { projectId: string; bookId: string }) {
  const [book, setBook] = useState<BookWithAvailability | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`/api/books?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { books: BookWithAvailability[] };
        if (active) setBook(data.books.find((item) => item.id === bookId) ?? null);
      } catch {
        if (active) setError("No se pudo consultar el libro.");
      }
    })();
    return () => { active = false; };
  }, [projectId, bookId]);

  if (error) return <p role="alert" className="store-alert"><TriangleAlert size={16} aria-hidden /> {error}</p>;
  if (!book) return <p className="store-loading">Cargando libro…</p>;

  return (
    <div className="book-viewer">
      <p className="book-viewer-note">{book.attribution} · {book.license}</p>
      {book.url
        ? <iframe title={`Lector de ${book.title}`} src={book.url} className="book-viewer-frame" />
        : <p className="store-loading">Pendiente de ingesta.</p>}
    </div>
  );
}
