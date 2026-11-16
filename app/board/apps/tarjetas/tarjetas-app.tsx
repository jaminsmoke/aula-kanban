"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Layers3, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  createCard,
  createDeck,
  emptyDocument,
  parseDocument,
  removeCard,
  upsertCard,
  type ReviewCard,
  type TarjetasDocument,
} from "./tarjetas-model";
import "./tarjetas.css";

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
  const { load, save, loading, error } = useAppDocument<TarjetasDocument>(projectId, "tarjetas");
  const readOnly = role === "guest";
  const selectedDeck = doc.decks.find((deck) => deck.id === selectedId) ?? null;

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
          {loading ? (
            <p className="tarjetas-loading" role="status">Cargando mazos…</p>
          ) : selectedDeck ? (
            <>
              <div className="tarjetas-deck-head">
                <div>
                  <h3>{selectedDeck.name}</h3>
                  <p>{selectedDeck.cards.length} {selectedDeck.cards.length === 1 ? "tarjeta" : "tarjetas"}</p>
                </div>
                <button type="button" className="tarjetas-danger" onClick={handleDeleteDeck} disabled={readOnly}>
                  <Trash2 size={15} aria-hidden /> Borrar mazo
                </button>
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
