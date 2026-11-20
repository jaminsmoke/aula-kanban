"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { ReviewCard } from "./tarjetas-model";

type TarjetasCardListProps = {
  cards: ReviewCard[];
  readOnly: boolean;
  onEdit: (card: ReviewCard) => void;
  onDelete: (cardId: string) => void;
};

/**
 * Lista de tarjetas del mazo seleccionado.
 * @param props - Tarjetas y acciones.
 * @returns La lista o el estado vacío.
 */
export function TarjetasCardList({ cards, readOnly, onEdit, onDelete }: TarjetasCardListProps) {
  if (!cards.length) {
    return <p className="tarjetas-empty">Aún no hay tarjetas en este mazo. Añade la primera arriba.</p>;
  }

  return (
    <ul className="tarjetas-card-list" aria-label="Tarjetas del mazo">
      {cards.map((card) => (
        <li key={card.id}>
          <div>
            <strong>{card.front}</strong>
            <p>{card.back}</p>
          </div>
          <div className="tarjetas-card-actions">
            <button type="button" aria-label={`Editar ${card.front}`} onClick={() => onEdit(card)} disabled={readOnly}>
              <Pencil size={15} aria-hidden />
            </button>
            <button type="button" aria-label={`Eliminar ${card.front}`} onClick={() => onDelete(card.id)} disabled={readOnly}>
              <Trash2 size={15} aria-hidden />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
