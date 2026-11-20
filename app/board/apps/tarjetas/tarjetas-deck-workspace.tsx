"use client";

import type { FormEvent } from "react";
import { TarjetasCardForm } from "./tarjetas-card-form";
import { TarjetasCardList } from "./tarjetas-card-list";
import { TarjetasDeckHeader } from "./tarjetas-deck-header";
import type { ReviewCard, ReviewDeck } from "./tarjetas-model";

type TarjetasDeckWorkspaceProps = {
  deck: ReviewDeck;
  dueCount: number;
  readOnly: boolean;
  canReview: boolean;
  front: string;
  back: string;
  editingId: string | null;
  onFrontChange: (value: string) => void;
  onBackChange: (value: string) => void;
  onSubmitCard: (event: FormEvent<HTMLFormElement>) => void;
  onCancelCard: () => void;
  onStartReview: () => void;
  onDeleteDeck: () => void;
  onEditCard: (card: ReviewCard) => void;
  onDeleteCard: (cardId: string) => void;
};

/**
 * Editor del mazo seleccionado.
 * @param props - Mazo, formulario y acciones.
 * @returns La cabecera, el formulario y la lista de tarjetas.
 */
export function TarjetasDeckWorkspace({
  deck,
  dueCount,
  readOnly,
  canReview,
  front,
  back,
  editingId,
  onFrontChange,
  onBackChange,
  onSubmitCard,
  onCancelCard,
  onStartReview,
  onDeleteDeck,
  onEditCard,
  onDeleteCard,
}: TarjetasDeckWorkspaceProps) {
  return (
    <>
      <TarjetasDeckHeader
        deck={deck}
        dueCount={dueCount}
        readOnly={readOnly}
        canReview={canReview}
        onStartReview={onStartReview}
        onDeleteDeck={onDeleteDeck}
      />
      <TarjetasCardForm
        front={front}
        back={back}
        editingId={editingId}
        readOnly={readOnly}
        onFrontChange={onFrontChange}
        onBackChange={onBackChange}
        onSubmit={onSubmitCard}
        onCancel={onCancelCard}
      />
      <TarjetasCardList
        cards={deck.cards}
        readOnly={readOnly}
        onEdit={onEditCard}
        onDelete={onDeleteCard}
      />
    </>
  );
}
