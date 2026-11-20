"use client";

import { useCallback, useEffect, useState } from "react";
import { DefaultScheduler, Rating, type Grade } from "ts-fsrs";
import {
  emptyProgress,
  parseProgress,
  type ReviewCard,
  type ReviewDeck,
  type TarjetasProgress,
} from "./tarjetas-model";
import { dueCards, RATING_OPTIONS, serializeSchedule, toSchedulerCard, type Scheduler, type SchedulerCard } from "./tarjetas-review";

/** Resumen de una sesión de repaso. */
export type SessionStats = {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
};

const EMPTY_SESSION: SessionStats = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

type UseTarjetasReviewOptions = {
  projectId: string;
  selectedDeck: ReviewDeck | null;
  onStatus: (message: string) => void;
};

/**
 * Progreso local, scheduler y sesión de repaso de Tarjetas.
 * @param options - Proyecto, mazo activo y callback de estado.
 * @returns Progreso, cola, tarjeta actual y acciones de repaso.
 */
export function useTarjetasReview({ projectId, selectedDeck, onStatus }: UseTarjetasReviewOptions) {
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
  const dueCount = selectedDeck ? dueCards(selectedDeck.cards, progress).length : 0;

  useEffect(() => {
    let active = true;
    void DefaultScheduler({ version: "FSRS-7" }).then((value) => {
      if (active) setScheduler(value);
    }).catch(() => {
      if (active) onStatus("No se pudo preparar el repaso.");
    });
    return () => { active = false; };
  }, [onStatus]);

  const saveProgress = useCallback((next: TarjetasProgress) => {
    setProgress(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      onStatus("El progreso no se pudo guardar en este navegador.");
    }
  }, [onStatus, storageKey]);

  function startReview() {
    if (!selectedDeck || !scheduler) {
      onStatus("Preparando el repaso…");
      return;
    }
    const queue = dueCards(selectedDeck.cards, progress);
    if (!queue.length) {
      onStatus("No hay tarjetas pendientes en este mazo.");
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

  return {
    progress,
    dueCount,
    schedulerReady: Boolean(scheduler),
    reviewMode,
    reviewQueue,
    reviewCard,
    revealed,
    session,
    summary,
    startReview,
    exitReview,
    handleRate,
    reveal: () => setRevealed(true),
  };
}
