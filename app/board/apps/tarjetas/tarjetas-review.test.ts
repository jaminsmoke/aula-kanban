import { DefaultScheduler, Rating } from "ts-fsrs";
import { describe, expect, it } from "vitest";
import { createCard, emptyProgress, type TarjetasProgress } from "./tarjetas-model";
import { dueCards, RATING_OPTIONS, serializeSchedule, toSchedulerCard, type SchedulerCard } from "./tarjetas-review";

describe("repaso FSRS", () => {
  it("programa una tarjeta nueva y conserva las fechas al serializarla", async () => {
    const scheduler = await DefaultScheduler({ version: "FSRS-7" });
    const card = createCard("casa", "house");
    const result = scheduler.review({
      card: toSchedulerCard(scheduler, card),
      grade: Rating.Good,
      now: new Date("2026-11-16T10:00:00.000Z"),
    });
    const schedule = serializeSchedule(result.card as SchedulerCard);
    expect(schedule.reps).toBe(1);
    expect(schedule.dueAt).toMatch(/^2026-/);
    const restored = toSchedulerCard(scheduler, { ...card, schedule });
    expect(restored.dueAt).toBeInstanceOf(Date);
    expect(restored.lastReviewAt).toBeInstanceOf(Date);
  });

  it("solo devuelve tarjetas nuevas o vencidas", () => {
    const now = new Date("2026-11-16T10:00:00.000Z");
    const due = createCard("due", "ahora");
    const future = createCard("future", "después");
    const progress: TarjetasProgress = {
      ...emptyProgress(),
      schedules: {
        [future.id]: {
          dueAt: "2026-11-17T10:00:00.000Z",
          lastReviewAt: "2026-11-16T10:00:00.000Z",
          stability: 1,
          stabilityFast: 1,
          difficulty: 5,
          state: 2,
          scheduleStatus: "review",
          reps: 1,
          lapses: 0,
          scheduledDays: 1,
          learningStep: 0,
          cardId: future.id,
        },
      },
    };
    expect(dueCards([due, future], progress, now).map((card) => card.id)).toEqual([due.id]);
  });

  it("ofrece las cuatro valoraciones en orden", () => {
    expect(RATING_OPTIONS.map((option) => option.label)).toEqual(["Otra vez", "Difícil", "Bien", "Fácil"]);
    expect(RATING_OPTIONS.map((option) => option.shortcut)).toEqual(["1", "2", "3", "4"]);
  });
});
