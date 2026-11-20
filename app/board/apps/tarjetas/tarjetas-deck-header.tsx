"use client";

import { BookOpen, Trash2 } from "lucide-react";
import type { ReviewDeck } from "./tarjetas-model";

type TarjetasDeckHeaderProps = {
  deck: ReviewDeck;
  dueCount: number;
  readOnly: boolean;
  canReview: boolean;
  onStartReview: () => void;
  onDeleteDeck: () => void;
};

/**
 * Cabecera del mazo seleccionado con las acciones de repaso y borrado.
 * @param props - Mazo, pendientes y acciones.
 * @returns La cabecera del mazo.
 */
export function TarjetasDeckHeader({
  deck,
  dueCount,
  readOnly,
  canReview,
  onStartReview,
  onDeleteDeck,
}: TarjetasDeckHeaderProps) {
  return (
    <div className="tarjetas-deck-head">
      <div>
        <h3>{deck.name}</h3>
        <p>{deck.cards.length} {deck.cards.length === 1 ? "tarjeta" : "tarjetas"} · {dueCount} pendientes</p>
      </div>
      <div className="tarjetas-deck-actions">
        <button type="button" className="tarjetas-review-button" onClick={onStartReview} disabled={!canReview}>
          <BookOpen size={15} aria-hidden /> Repasar {dueCount ? `(${dueCount})` : ""}
        </button>
        <button type="button" className="tarjetas-danger" onClick={onDeleteDeck} disabled={readOnly}>
          <Trash2 size={15} aria-hidden /> Borrar mazo
        </button>
      </div>
    </div>
  );
}
