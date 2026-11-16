"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BookOpen, Layers3, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { DefaultScheduler, Rating, type Grade } from "ts-fsrs";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  createCard,
  createDeck,
  emptyDocument,
  emptyProgress,
  parseDocument,
  parseProgress,
  removeCard,
  upsertCard,
  type ReviewCard,
  type TarjetasDocument,
  type TarjetasProgress,
} from "./tarjetas-model";
import { dueCards, RATING_OPTIONS, serializeSchedule, toSchedulerCard, type Scheduler, type SchedulerCard } from "./tarjetas-review";
import "./tarjetas.css";

type SessionStats = {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
};

const EMPTY_SESSION: SessionStats = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

/**
 * Tarjetas de repaso: mazos compartidos por proyecto y editor de tarjetas.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana de la app.
 */
export default function TarjetasApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const [doc, setDoc] = useState<TarjetasDocument>(emptyDocument);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const storageKey = `aula-kanban-tarjetas:${projectId}`;
  const [progress, setProgress] = useState<TarjetasProgress>(() => {
    if (typeof window === "undefined") return emptyProgress();
    try {
      return parseProgress(JSON.parse(window.localStorage.getItem(storageKey) ?? "null"));
    } catch {
      return emptyProgress();
    }
  });
  const [scheduler, setScheduler] = useState<Scheduler | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ReviewCard[]>([]);
  const [reviewCard, setReviewCard] = useState<ReviewCard | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [session, setSession] = useState<SessionStats>(EMPTY_SESSION);
  const [summary, setSummary] = useState<SessionStats | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const { load, save, loading, error } = useAppDocument<TarjetasDocument>(projectId, "tarjetas");
  const readOnly = role === "guest";
  const selectedDeck = doc.decks.find((deck) => deck.id === selectedId) ?? null;
  const dueCount = selectedDeck ? dueCards(selectedDeck.cards, progress).length : 0;

  useEffect(() => {
    let active = true;
    void load().then(({ state }) => {
      if (!active) return;
      const next = parseDocument(state);
      setDoc(next);
      setSelectedId(next.decks[0]?.id ?? null);
      setDirty(false);
    });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    let active = true;
    void DefaultScheduler({ version: "FSRS-7" }).then((value) => {
      if (active) setScheduler(value);
    }).catch(() => {
      if (active) setStatus("No se pudo preparar el repaso.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (reviewMode && reviewCard) reviewRef.current?.focus();
  }, [reviewCard, reviewMode]);

  function markDirty() {
    setDirty(true);
    setStatus("");
  }

  function updateDeck(nextDeck: NonNullable<typeof selectedDeck>) {
    setDoc((current) => ({
      ...current,
      decks: current.decks.map((deck) => deck.id === nextDeck.id ? nextDeck : deck),
    }));
    markDirty();
  }

  function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newDeckName.trim();
    if (!name || readOnly) return;
    const deck = createDeck(name);
    setDoc((current) => ({ ...current, decks: [...current.decks, deck] }));
    setSelectedId(deck.id);
    setNewDeckName("");
    setEditingId(null);
    setFront("");
    setBack("");
    markDirty();
  }

  function handleSelectDeck(id: string) {
    if (reviewMode) return;
    setSelectedId(id);
    setEditingId(null);
    setFront("");
    setBack("");
  }

  function handleSubmitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeck || readOnly) return;
    const nextFront = front.trim();
    const nextBack = back.trim();
    if (!nextFront || !nextBack) return;
    const existing = editingId ? selectedDeck.cards.find((card) => card.id === editingId) : undefined;
    const card: ReviewCard = existing
      ? { ...existing, front: nextFront, back: nextBack }
      : createCard(nextFront, nextBack);
    updateDeck(upsertCard(selectedDeck, card));
    setEditingId(null);
    setFront("");
    setBack("");
  }

  function handleEditCard(card: ReviewCard) {
    setEditingId(card.id);
    setFront(card.front);
    setBack(card.back);
  }

  function handleDeleteCard(cardId: string) {
    if (!selectedDeck || readOnly) return;
    updateDeck(removeCard(selectedDeck, cardId));
    if (editingId === cardId) {
      setEditingId(null);
      setFront("");
      setBack("");
    }
  }

  function handleDeleteDeck() {
    if (!selectedDeck || readOnly) return;
    const remaining = doc.decks.filter((deck) => deck.id !== selectedDeck.id);
    setDoc((current) => ({ ...current, decks: remaining }));
    setSelectedId(remaining[0]?.id ?? null);
    setEditingId(null);
    setFront("");
    setBack("");
    markDirty();
  }

  async function handleSave() {
    if (readOnly || saving) return;
    setSaving(true);
    const ok = await save(doc);
    setSaving(false);
    setDirty(!ok);
    setStatus(ok ? "Guardado en el proyecto." : "No se pudo guardar. Inténtalo de nuevo.");
  }

  const saveProgress = useCallback((next: TarjetasProgress) => {
    setProgress(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setStatus("El progreso no se pudo guardar en este navegador.");
    }
  }, [storageKey]);

  function startReview() {
    if (!selectedDeck || !scheduler) {
      setStatus("Preparando el repaso…");
      return;
    }
    const queue = dueCards(selectedDeck.cards, progress);
    if (!queue.length) {
      setStatus("No hay tarjetas pendientes en este mazo.");
      return;
    }
    setReviewMode(true);
    setReviewQueue(queue);
    setReviewCard(queue[0]);
    setRevealed(false);
    setSession(EMPTY_SESSION);
    setSummary(null);
  }

  function exitReview() {
    setReviewMode(false);
    setReviewQueue([]);
    setReviewCard(null);
    setRevealed(false);
    setSummary(null);
  }

  const handleRate = useCallback((grade: Grade) => {
    if (!reviewCard || !scheduler) return;
    const result = scheduler.review({ card: toSchedulerCard(scheduler, reviewCard), grade, now: new Date() });
    saveProgress({
      ...progress,
      schedules: { ...progress.schedules, [reviewCard.id]: serializeSchedule(result.card as SchedulerCard) },
    });
    const nextStats: SessionStats = { ...session, reviewed: session.reviewed + 1 };
    if (grade === Rating.Again) nextStats.again += 1;
    else if (grade === Rating.Hard) nextStats.hard += 1;
    else if (grade === Rating.Good) nextStats.good += 1;
    else nextStats.easy += 1;
    setSession(nextStats);
    const remaining = reviewQueue.slice(1);
    setReviewQueue(remaining);
    setReviewCard(remaining[0] ?? null);
    setRevealed(false);
    if (!remaining.length) setSummary(nextStats);
  }, [progress, reviewCard, reviewQueue, saveProgress, scheduler, session]);

  useEffect(() => {
    if (!reviewMode || !reviewCard || summary) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!revealed && (event.code === "Space" || event.key === "Enter")) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (!revealed) return;
      const option = RATING_OPTIONS.find((item) => item.shortcut === event.key);
      if (option) {
        event.preventDefault();
        handleRate(option.grade);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRate, revealed, reviewCard, reviewMode, summary]);

  return (
    <div className="tarjetas-app">
      <header className="tarjetas-toolbar">
        <div className="tarjetas-heading">
          <span className="tarjetas-mark" aria-hidden><Layers3 size={18} strokeWidth={2} /></span>
          <span>
            <strong>Tarjetas de repaso</strong>
            <small>Mazos compartidos del proyecto</small>
          </span>
        </div>
        <div className="tarjetas-actions">
          {readOnly ? <span className="tarjetas-readonly">Solo lectura</span> : null}
          {dirty ? <span className="tarjetas-unsaved">Sin guardar</span> : null}
          <button type="button" onClick={() => void handleSave()} disabled={readOnly || !dirty || saving || loading}>
            <Save size={15} aria-hidden /> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </header>

      {error ? <p className="tarjetas-alert" role="alert">{error}</p> : null}
      {status ? <p className="tarjetas-status" role="status">{status}</p> : null}

      <div className="tarjetas-layout">
        <aside className="tarjetas-decks" aria-label="Mazos">
          <div className="tarjetas-section-head">
            <h4>Mazos</h4>
            <span>{doc.decks.length}</span>
          </div>
          <form className="tarjetas-deck-form" onSubmit={handleCreateDeck}>
            <label htmlFor="tarjetas-new-deck">Nombre del mazo</label>
            <div>
              <input
                id="tarjetas-new-deck"
                value={newDeckName}
                onChange={(event) => setNewDeckName(event.target.value)}
                placeholder="Ej. Vocabulario"
                disabled={readOnly}
              />
              <button type="submit" aria-label="Crear mazo" disabled={readOnly || !newDeckName.trim()}>
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </form>
          {doc.decks.length ? (
            <ul className="tarjetas-deck-list">
              {doc.decks.map((deck) => (
                <li key={deck.id}>
                  <button type="button" aria-pressed={deck.id === selectedId} onClick={() => handleSelectDeck(deck.id)}>
                    <span>{deck.name}</span>
                    <small>{deck.cards.length}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tarjetas-empty-small">Todavía no hay mazos.</p>
          )}
        </aside>

        <section className="tarjetas-main" aria-label="Mazo seleccionado">
          {reviewMode ? (
            <div className="tarjetas-review" ref={reviewRef} tabIndex={-1} aria-label="Sesión de repaso">
              <div className="tarjetas-review-head">
                <button type="button" className="tarjetas-secondary" onClick={exitReview}>Volver al mazo</button>
                <span>{summary ? "Sesión completada" : `${reviewQueue.length} pendientes`}</span>
              </div>
              {summary ? (
                <div className="tarjetas-summary" role="status">
                  <BookOpen size={28} aria-hidden />
                  <h3>Buen trabajo</h3>
                  <p>{summary.reviewed} {summary.reviewed === 1 ? "tarjeta repasada" : "tarjetas repasadas"}</p>
                  <ul>
                    <li>Otra vez <strong>{summary.again}</strong></li>
                    <li>Difícil <strong>{summary.hard}</strong></li>
                    <li>Bien <strong>{summary.good}</strong></li>
                    <li>Fácil <strong>{summary.easy}</strong></li>
                  </ul>
                  <button type="button" onClick={exitReview}>Volver al mazo</button>
                </div>
              ) : reviewCard ? (
                <>
                  <div className="tarjetas-review-progress">
                    Tarjeta {session.reviewed + 1} de {session.reviewed + reviewQueue.length}
                  </div>
                  <div className="tarjetas-review-card">
                    <span className="tarjetas-review-label">Anverso</span>
                    <p>{reviewCard.front}</p>
                    {revealed ? (
                      <>
                        <span className="tarjetas-review-label">Reverso</span>
                        <p>{reviewCard.back}</p>
                      </>
                    ) : null}
                  </div>
                  {revealed ? (
                    <div className="tarjetas-ratings" aria-label="Valorar tarjeta">
                      {RATING_OPTIONS.map((option) => (
                        <button key={option.grade} type="button" className={`tarjetas-rating is-${option.tone}`} onClick={() => handleRate(option.grade)}>
                          <span>{option.label}</span>
                          <small>{option.shortcut}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button type="button" className="tarjetas-reveal" onClick={() => setRevealed(true)}>Mostrar respuesta</button>
                  )}
                  <p className="tarjetas-review-hint">Espacio para mostrar · 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil</p>
                </>
              ) : (
                <p className="tarjetas-empty">No quedan tarjetas pendientes.</p>
              )}
            </div>
          ) : loading ? (
            <p className="tarjetas-loading" role="status">Cargando mazos…</p>
          ) : selectedDeck ? (
            <>
              <div className="tarjetas-deck-head">
                <div>
                  <h3>{selectedDeck.name}</h3>
                  <p>{selectedDeck.cards.length} {selectedDeck.cards.length === 1 ? "tarjeta" : "tarjetas"} · {dueCount} pendientes</p>
                </div>
                <div className="tarjetas-deck-actions">
                  <button type="button" className="tarjetas-review-button" onClick={startReview} disabled={!scheduler || dueCount === 0}>
                    <BookOpen size={15} aria-hidden /> Repasar {dueCount ? `(${dueCount})` : ""}
                  </button>
                  <button type="button" className="tarjetas-danger" onClick={handleDeleteDeck} disabled={readOnly}>
                    <Trash2 size={15} aria-hidden /> Borrar mazo
                  </button>
                </div>
              </div>

              <form className="tarjetas-card-form" onSubmit={handleSubmitCard}>
                <label htmlFor="tarjetas-front">Anverso
                  <textarea id="tarjetas-front" value={front} onChange={(event) => setFront(event.target.value)} placeholder="Pregunta o concepto" rows={3} disabled={readOnly} />
                </label>
                <label htmlFor="tarjetas-back">Reverso
                  <textarea id="tarjetas-back" value={back} onChange={(event) => setBack(event.target.value)} placeholder="Respuesta o explicación" rows={3} disabled={readOnly} />
                </label>
                <div className="tarjetas-form-actions">
                  <button type="submit" disabled={readOnly || !front.trim() || !back.trim()}>
                    {editingId ? "Guardar tarjeta" : "Añadir tarjeta"}
                  </button>
                  {editingId ? (
                    <button type="button" className="tarjetas-secondary" onClick={() => { setEditingId(null); setFront(""); setBack(""); }}>
                      <X size={15} aria-hidden /> Cancelar
                    </button>
                  ) : null}
                </div>
              </form>

              {selectedDeck.cards.length ? (
                <ul className="tarjetas-card-list" aria-label="Tarjetas del mazo">
                  {selectedDeck.cards.map((card) => (
                    <li key={card.id}>
                      <div>
                        <strong>{card.front}</strong>
                        <p>{card.back}</p>
                      </div>
                      <div className="tarjetas-card-actions">
                        <button type="button" aria-label={`Editar ${card.front}`} onClick={() => handleEditCard(card)} disabled={readOnly}>
                          <Pencil size={15} aria-hidden />
                        </button>
                        <button type="button" aria-label={`Eliminar ${card.front}`} onClick={() => handleDeleteCard(card.id)} disabled={readOnly}>
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tarjetas-empty">Aún no hay tarjetas en este mazo. Añade la primera arriba.</p>
              )}
            </>
          ) : (
            <div className="tarjetas-empty-state">
              <BookOpen size={30} aria-hidden />
              <h3>Crea tu primer mazo</h3>
              <p>Agrupa las tarjetas por tema y guárdalas en el proyecto para repasarlas después.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
