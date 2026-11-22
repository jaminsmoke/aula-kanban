"use client";

import type { StoreRole } from "../types";
import { TarjetasDeckWorkspace } from "./tarjetas-deck-workspace";
import { TarjetasDecksPanel } from "./tarjetas-decks-panel";
import { TarjetasEmptyState } from "./tarjetas-empty-state";
import { TarjetasReviewPanel } from "./tarjetas-review-panel";
import { TarjetasToolbar } from "./tarjetas-toolbar";
import { useTarjetasEditor } from "./use-tarjetas-editor";
import { useTarjetasReview } from "./use-tarjetas-review";
import "../app-window.css";
import "./tarjetas.css";
import "./tarjetas-review.css";

/**
 * Tarjetas de repaso: mazos compartidos por proyecto y editor de tarjetas.
 * @param props - Proyecto activo y rol del usuario.
 * @returns La ventana de la app.
 */
export default function TarjetasApp({ projectId, role }: { projectId: string; role: StoreRole }) {
  const editor = useTarjetasEditor(projectId, role);
  const review = useTarjetasReview({
    projectId,
    selectedDeck: editor.selectedDeck,
    onStatus: editor.setStatus,
  });

  /**
   * Cambia de mazo salvo que la sesión de repaso esté activa.
   * @param id - Identificador del mazo.
   */
  function selectDeck(id: string) {
    if (review.reviewMode) return;
    editor.selectDeck(id);
  }

  return (
    <div className="app-window tarjetas-app">
      <TarjetasToolbar
        readOnly={editor.readOnly}
        dirty={editor.dirty}
        saving={editor.saving}
        loading={editor.loading}
        onSave={() => void editor.saveDocument()}
      />

      {editor.error ? <p className="tarjetas-alert" role="alert">{editor.error}</p> : null}
      {editor.status ? <p className="tarjetas-status" role="status">{editor.status}</p> : null}

      <div className="tarjetas-layout">
        <TarjetasDecksPanel
          decks={editor.doc.decks}
          selectedId={editor.selectedId}
          newDeckName={editor.newDeckName}
          readOnly={editor.readOnly}
          onNewDeckNameChange={editor.setNewDeckName}
          onCreateDeck={editor.handleCreateDeck}
          onSelectDeck={selectDeck}
        />

        <section className="tarjetas-main" aria-label="Mazo seleccionado">
          {review.reviewMode ? (
            <TarjetasReviewPanel
              summary={review.summary}
              reviewCard={review.reviewCard}
              pendingCount={review.reviewQueue.length}
              revealed={review.revealed}
              session={review.session}
              onExit={review.exitReview}
              onReveal={review.reveal}
              onRate={review.handleRate}
            />
          ) : editor.loading ? (
            <p className="tarjetas-loading" role="status">Cargando mazos…</p>
          ) : editor.selectedDeck ? (
            <TarjetasDeckWorkspace
              deck={editor.selectedDeck}
              dueCount={review.dueCount}
              readOnly={editor.readOnly}
              canReview={review.schedulerReady && review.dueCount > 0}
              front={editor.front}
              back={editor.back}
              editingId={editor.editingId}
              onFrontChange={editor.setFront}
              onBackChange={editor.setBack}
              onSubmitCard={editor.handleSubmitCard}
              onCancelCard={editor.cancelCardEdit}
              onStartReview={review.startReview}
              onDeleteDeck={editor.handleDeleteDeck}
              onEditCard={editor.handleEditCard}
              onDeleteCard={editor.handleDeleteCard}
            />
          ) : (
            <TarjetasEmptyState />
          )}
        </section>
      </div>
    </div>
  );
}
