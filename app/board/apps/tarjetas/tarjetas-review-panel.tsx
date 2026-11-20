"use client";

import { useEffect, useRef } from "react";
import { BookOpen } from "lucide-react";
import type { Grade } from "ts-fsrs";
import type { ReviewCard } from "./tarjetas-model";
import { RATING_OPTIONS } from "./tarjetas-review";
import type { SessionStats } from "./use-tarjetas-review";

type TarjetasReviewPanelProps = {
  summary: SessionStats | null;
  reviewCard: ReviewCard | null;
  pendingCount: number;
  revealed: boolean;
  session: SessionStats;
  onExit: () => void;
  onReveal: () => void;
  onRate: (grade: Grade) => void;
};

/**
 * Sesión de repaso activa o resumen final.
 * @param props - Cola, tarjeta, revelación y acciones.
 * @returns El panel de repaso.
 */
export function TarjetasReviewPanel({
  summary,
  reviewCard,
  pendingCount,
  revealed,
  session,
  onExit,
  onReveal,
  onRate,
}: TarjetasReviewPanelProps) {
  const reviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reviewRef.current?.focus();
  }, [reviewCard]);

  return (
    <div className="tarjetas-review" ref={reviewRef} tabIndex={-1} aria-label="Sesión de repaso">
      <div className="tarjetas-review-head">
        <button type="button" className="tarjetas-secondary" onClick={onExit}>Volver al mazo</button>
        <span>{summary ? "Sesión completada" : `${pendingCount} pendientes`}</span>
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
          <button type="button" onClick={onExit}>Volver al mazo</button>
        </div>
      ) : reviewCard ? (
        <>
          <div className="tarjetas-review-progress">
            Tarjeta {session.reviewed + 1} de {session.reviewed + pendingCount}
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
                <button key={option.grade} type="button" className={`tarjetas-rating is-${option.tone}`} onClick={() => onRate(option.grade)}>
                  <span>{option.label}</span>
                  <small>{option.shortcut}</small>
                </button>
              ))}
            </div>
          ) : (
            <button type="button" className="tarjetas-reveal" onClick={onReveal}>Mostrar respuesta</button>
          )}
          <p className="tarjetas-review-hint">Espacio para mostrar · 1 Otra vez · 2 Difícil · 3 Bien · 4 Fácil</p>
        </>
      ) : (
        <p className="tarjetas-empty">No quedan tarjetas pendientes.</p>
      )}
    </div>
  );
}
