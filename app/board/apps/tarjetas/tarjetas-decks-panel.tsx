"use client";

import type { FormEvent } from "react";
import { Plus } from "lucide-react";
import type { ReviewDeck } from "./tarjetas-model";

type TarjetasDecksPanelProps = {
  decks: ReviewDeck[];
  selectedId: string | null;
  newDeckName: string;
  readOnly: boolean;
  onNewDeckNameChange: (value: string) => void;
  onCreateDeck: (event: FormEvent<HTMLFormElement>) => void;
  onSelectDeck: (id: string) => void;
};

/**
 * Lista de mazos y formulario para crear uno nuevo.
 * @param props - Mazos, selección y acciones.
 * @returns El panel lateral de mazos.
 */
export function TarjetasDecksPanel({
  decks,
  selectedId,
  newDeckName,
  readOnly,
  onNewDeckNameChange,
  onCreateDeck,
  onSelectDeck,
}: TarjetasDecksPanelProps) {
  return (
    <aside className="tarjetas-decks" aria-label="Mazos">
      <div className="tarjetas-section-head">
        <h4>Mazos</h4>
        <span>{decks.length}</span>
      </div>
      <form className="tarjetas-deck-form" onSubmit={onCreateDeck}>
        <label htmlFor="tarjetas-new-deck">Nombre del mazo</label>
        <div>
          <input
            id="tarjetas-new-deck"
            value={newDeckName}
            onChange={(event) => onNewDeckNameChange(event.target.value)}
            placeholder="Ej. Vocabulario"
            disabled={readOnly}
          />
          <button type="submit" aria-label="Crear mazo" disabled={readOnly || !newDeckName.trim()}>
            <Plus size={16} aria-hidden />
          </button>
        </div>
      </form>
      {decks.length ? (
        <ul className="tarjetas-deck-list">
          {decks.map((deck) => (
            <li key={deck.id}>
              <button type="button" aria-pressed={deck.id === selectedId} onClick={() => onSelectDeck(deck.id)}>
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
  );
}
