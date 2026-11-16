import { DefaultScheduler, Rating, type DefaultSchedulerCard, type Grade } from "ts-fsrs";
import type { ReviewCard, StoredSchedule, TarjetasProgress } from "./tarjetas-model";

/** Scheduler de FSRS cargado de forma diferida. */
export type Scheduler = Awaited<ReturnType<typeof DefaultScheduler>>;

/** Tarjeta del modelo FSRS-7 que usa la app. */
export type SchedulerCard = DefaultSchedulerCard<"FSRS-7">;

/** Opción de valoración que se muestra al terminar de ver una tarjeta. */
export type RatingOption = {
  grade: Grade;
  label: string;
  shortcut: string;
  tone: string;
};

/** Valoraciones disponibles, en el orden de los botones. */
export const RATING_OPTIONS: RatingOption[] = [
  { grade: Rating.Again, label: "Otra vez", shortcut: "1", tone: "again" },
  { grade: Rating.Hard, label: "Difícil", shortcut: "2", tone: "hard" },
  { grade: Rating.Good, label: "Bien", shortcut: "3", tone: "good" },
  { grade: Rating.Easy, label: "Fácil", shortcut: "4", tone: "easy" },
];

/**
 * Convierte una tarjeta guardada al formato del scheduler.
 * @param scheduler - Scheduler FSRS.
 * @param card - Tarjeta del documento.
 * @returns La tarjeta con fechas nativas.
 */
export function toSchedulerCard(scheduler: Scheduler, card: ReviewCard): SchedulerCard {
  const base = card.schedule
    ? {
        ...card.schedule,
        dueAt: new Date(card.schedule.dueAt),
        lastReviewAt: card.schedule.lastReviewAt ? new Date(card.schedule.lastReviewAt) : null,
      }
    : scheduler.newCard({ now: new Date(card.createdAt) });
  return { ...base, cardId: card.id } as SchedulerCard;
}

/**
 * Convierte el resultado del scheduler a JSON serializable.
 * @param card - Tarjeta devuelta por FSRS.
 * @returns La programación lista para `localStorage`.
 */
export function serializeSchedule(card: SchedulerCard): StoredSchedule {
  return {
    dueAt: card.dueAt.toISOString(),
    lastReviewAt: card.lastReviewAt ? card.lastReviewAt.toISOString() : null,
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    state: card.state,
    scheduleStatus: card.scheduleStatus,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
    cardId: String(card.cardId),
  };
}

/**
 * Tarjetas que toca repasar ahora.
 * @param cards - Tarjetas del mazo.
 * @param progress - Progreso local.
 * @param now - Instante de referencia.
 * @returns Las tarjetas sin programación o con vencimiento pasado.
 */
export function dueCards(cards: ReviewCard[], progress: TarjetasProgress, now = new Date()): ReviewCard[] {
  return cards.filter((card) => {
    const schedule = progress.schedules[card.id];
    return !schedule || new Date(schedule.dueAt).getTime() <= now.getTime();
  });
}
