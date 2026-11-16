"use client";
/* eslint-disable @next/next/no-img-element -- Portadas servidas desde R2 con la sesión del proyecto; next/image no puede optimizar rutas autenticadas */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { BookOpen, Download, Play, TriangleAlert, X } from "lucide-react";
import StoreWindow from "../store-window";
import { useDesktopWindows } from "../use-desktop-windows";
import type { BookWithAvailability } from "../../../../lib/server/books";
import { BOOK_LEVELS, type BookLevel } from "../../../../lib/books";
import type { StoreTool } from "../tools";

/**
 * Adapta un libro a la forma de herramienta que usa la ventana del
 * desktop (solo importan id, nombre, descripción e icono; el tamaño cae
 * al de ventana estándar). Lo comparten la vista Libros y la carpeta
 * «Libros» del escritorio personal (STORE-04).
 * @param book - Libro del catálogo con su disponibilidad y URL.
 * @returns La herramienta simulada para abrir la ventana del visor.
 */
export function bookTool(book: BookWithAvailability): StoreTool {
  return {
    id: `book-${book.id}`,
    name: book.title,
    tagline: book.tagline,
    description: book.description,
    category: book.subject as StoreTool["category"],
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
 * Vista «Libros» de Aula Store (STORE-02): libros escolares persistidos
 * en R2, seccionados por nivel, con ficha de procedencia y visor PDF en
 * ventana propia. Sin instalación: son contenido de lectura.
 * @param props - Proyecto activo, para consultar el catálogo y el archivo.
 * @returns La vista de libros dentro de la tienda.
 */
export default function BooksView({ projectId }: { projectId: string }) {
  const [books, setBooks] = useState<BookWithAvailability[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { desktopRef, desktopSize, windows, open, focus, close, minimize, restore, move, resize, zoom } = useDesktopWindows();

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/books?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { books: BookWithAvailability[] };
      setBooks(data.books);
      setConfigured(true);
      setError("");
    } catch {
      setConfigured(false);
      setError("No se pudieron consultar los libros.");
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  // Cerrar la ficha con Escape.
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  const openBook = (book: BookWithAvailability) => open(bookTool(book));
  const selected = books.find((book) => book.id === selectedId) ?? null;
  const byId = new Map(books.map((book) => [`book-${book.id}`, book]));
  const shownWindows = configured === null ? windows : windows.filter((item) => byId.has(item.tool.id));

  /**
   * Una tarjeta de libro: portada, título, datos y acciones.
   * @param book - Libro con su disponibilidad y URL.
   * @returns La tarjeta.
   */
  const renderCard = (book: BookWithAvailability) => (
    <article key={book.id} className="book-card">
      <button type="button" className="book-card-cover" onClick={() => setSelectedId(book.id)} aria-label={`Ver detalles de ${book.title}`}>
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={`Portada de ${book.title}`} className="book-card-img" />
        ) : (
          <span className="book-card-icon" aria-hidden><BookOpen size={28} strokeWidth={2} /></span>
        )}
        <span className="store-card-category">{book.level} · {book.course}</span>
      </button>
      <div className="store-card-body">
        <h3>{book.title}</h3>
        <p className="store-card-tagline">{book.tagline}</p>
        <p className="store-meta">
          <span className="store-chip store-chip--pending">{book.subject}</span>
          <span className="store-chip store-chip--pending">{(book.sizeBytes / (1024 * 1024)).toFixed(1)} MB · PDF</span>
          {!book.available && <span className="store-chip store-chip--working">Pendiente de ingesta</span>}
        </p>
      </div>
      <div className="store-card-footer">
        {book.available && book.url ? (
          <>
            <button type="button" className="store-primary" onClick={() => openBook(book)}><Play size={16} aria-hidden /> Leer</button>
            <a className="store-secondary" href={book.url} download={`${book.id}.pdf`}><Download size={16} aria-hidden /> Descargar</a>
          </>
        ) : null}
        <button type="button" className="store-secondary store-details" onClick={() => setSelectedId(book.id)}>Detalles</button>
      </div>
    </article>
  );

  return (
    <MotionConfig reducedMotion="user">
    <LazyMotion features={domAnimation}>
    <div className="books-desktop" ref={desktopRef} aria-label="Vista de libros">
      {error && <p role="alert" className="store-alert"><TriangleAlert size={16} aria-hidden /> {error} <button type="button" className="text-button" onClick={() => void refresh()}>Reintentar</button></p>}
      {configured === null ? (
        <p className="store-results-empty">Cargando libros…</p>
      ) : !error && books.length === 0 ? (
        <p className="store-results-empty">Todavía no hay libros en el catálogo.</p>
      ) : (
        BOOK_LEVELS.map((level: BookLevel) => {
          const levelBooks = books.filter((book) => book.level === level);
          if (!levelBooks.length) return null;
          return (
            <section key={level} className="store-section" aria-label={`Libros de ${level}`}>
              <h3 className="store-section-title"><BookOpen size={18} aria-hidden /> {level}<span className="store-section-count">{levelBooks.length}</span></h3>
              <div className="store-grid">
                <AnimatePresence mode="popLayout">
                  {levelBooks.map((book, index) => (
                    <BookCardWithMotion key={book.id} index={index} card={renderCard(book)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          );
        })
      )}

      <nav className="store-dock" aria-label="Ventanas minimizadas">
        {shownWindows.filter((item) => item.minimized).map((item) => {
          const Icon = item.tool.icon;
          return (
            <button key={item.tool.id} type="button" className="store-minimized-icon" title={`${item.tool.name} (minimizada)`} aria-label={`Restaurar ${item.tool.name}`} onClick={() => restore(item.tool.id)}>
              <Icon size={18} strokeWidth={2} />
            </button>
          );
        })}
      </nav>

      <AnimatePresence>
      {shownWindows.map((item) => {
        const book = byId.get(item.tool.id)!;
        return (
          <StoreWindow
            key={item.tool.id}
            title={item.tool.name}
            position={item.maximized ? { x: 0, y: 0 } : item.position}
            size={item.maximized && desktopSize.width && desktopSize.height ? desktopSize : item.size}
            bounds={desktopSize}
            zIndex={item.zIndex}
            maximized={item.maximized}
            minimized={item.minimized}
            onMove={(position) => move(item.tool.id, position)}
            onResize={(size) => resize(item.tool.id, size)}
            onFocus={() => focus(item.tool.id)}
            onClose={() => close(item.tool.id)}
            onMinimize={() => minimize(item.tool.id)}
            onZoom={() => zoom(item.tool.id)}
          >
            <div className="book-viewer">
              <p className="book-viewer-note">{book.attribution} · {book.license}</p>
              {book.url ? <iframe title={`Lector de ${book.title}`} src={book.url} className="book-viewer-frame" /> : <p className="store-loading">Pendiente de ingesta.</p>}
            </div>
          </StoreWindow>
        );
      })}
      </AnimatePresence>

      {selected ? (
        <div className="store-detail" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}>
          <div className="store-detail-card" role="dialog" aria-modal="true" aria-label={selected.title}>
            <button type="button" className="store-detail-close" aria-label="Cerrar detalles" onClick={() => setSelectedId(null)} autoFocus><X size={18} aria-hidden /></button>
            <div className="store-detail-body">
              <div className="store-detail-head">
                <span className="store-card-icon store-card-icon--static" aria-hidden><BookOpen size={24} strokeWidth={2} /></span>
                <div className="store-detail-title">
                  <h3>{selected.title}</h3>
                  <p>{selected.level} · {selected.course} · {selected.subject}</p>
                </div>
              </div>
              <p className="store-detail-description">{selected.description}</p>
              {(selected.coverUrl || selected.backUrl) ? (
                <div className="book-detail-covers" aria-label="Portada y contraportada">
                  {selected.coverUrl ? (
                    <figure>
                      <img src={selected.coverUrl} alt={`Portada de ${selected.title}`} />
                      <figcaption>Portada</figcaption>
                    </figure>
                  ) : null}
                  {selected.backUrl ? (
                    <figure>
                      <img src={selected.backUrl} alt={`Contraportada de ${selected.title}`} />
                      <figcaption>Contraportada</figcaption>
                    </figure>
                  ) : null}
                </div>
              ) : null}
              <dl className="store-detail-tech" aria-label="Procedencia y licencia">
                <div>
                  <dt>Fuente</dt>
                  <dd>{selected.source.name} ({selected.source.url})</dd>
                </div>
                <div>
                  <dt>Licencia</dt>
                  <dd>{selected.license}</dd>
                </div>
                <div>
                  <dt>Atribución</dt>
                  <dd>{selected.attribution}</dd>
                </div>
                <div>
                  <dt>Tamaño</dt>
                  <dd>{(selected.sizeBytes / (1024 * 1024)).toFixed(1)} MB · PDF{selected.version ? ` · versión ${selected.version}` : ""}</dd>
                </div>
              </dl>
              {!selected.available && (
                <p className="store-detail-note">Este libro está pendiente de ingesta: aún no se puede leer ni descargar.</p>
              )}
              <div className="store-detail-actions">
                {selected.available && selected.url ? (
                  <>
                    <button type="button" className="store-primary" onClick={() => openBook(selected)}><Play size={16} aria-hidden /> Leer</button>
                    <a className="store-secondary" href={selected.url} download={`${selected.id}.pdf`}><Download size={16} aria-hidden /> Descargar</a>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </LazyMotion>
    </MotionConfig>
  );
}

// La tarjeta se anima al entrar, como las de Aplicaciones.
/**
 * Envoltorio animado de una tarjeta de libro.
 * @param props - Índice para el retardo y la tarjeta ya renderizada.
 * @returns La tarjeta con animación de entrada.
 */
function BookCardWithMotion({ index, card }: { index: number; card: ReactNode }) {
  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.24, ease: "easeOut", delay: index * 0.04 }}
      className="book-card-motion"
    >
      {card}
    </m.div>
  );
}
