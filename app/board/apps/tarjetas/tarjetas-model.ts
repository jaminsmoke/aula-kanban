/** Estado FSRS serializable de una tarjeta; se completa en la fase de repaso. */
export type StoredSchedule = {
  dueAt: string;
  lastReviewAt: string | null;
  stability: number;
  stabilityFast: number;
  difficulty: number;
  state: number;
  scheduleStatus: string;
  reps: number;
  lapses: number;
  scheduledDays: number;
  learningStep: number;
  cardId: string;
};

/** Tarjeta de un mazo. */
export type ReviewCard = {
  id: string;
  front: string;
  back: string;
  createdAt: string;
  schedule?: StoredSchedule;
};

/** Mazo compartido del proyecto. */
export type ReviewDeck = {
  id: string;
  name: string;
  createdAt: string;
  cards: ReviewCard[];
};

/** Documento JSON guardado en `app_documents`. */
export type TarjetasDocument = {
  version: 1;
  decks: ReviewDeck[];
};

/** Progreso local de repaso por proyecto y navegador. */
export type TarjetasProgress = {
  version: 1;
  schedules: Record<string, StoredSchedule>;
};

/**
 * Identificador local para mazos y tarjetas.
 * @returns Un UUID si el navegador lo ofrece; si no, un id con marca de tiempo.
 */
function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Documento vacío, sin compartir referencias entre mazos.
 * @returns Un documento nuevo.
 */
export function emptyDocument(): TarjetasDocument {
  return { version: 1, decks: [] };
}

/**
 * Progreso local vacío.
 * @returns Un progreso sin programaciones.
 */
export function emptyProgress(): TarjetasProgress {
  return { version: 1, schedules: {} };
}

/**
 * Valida el progreso guardado en `localStorage`.
 * @param value - Estado desconocido.
 * @returns Un progreso válido o el vacío.
 */
export function parseProgress(value: unknown): TarjetasProgress {
  if (!value || typeof value !== "object") return emptyProgress();
  const candidate = value as { version?: unknown; schedules?: unknown };
  if (candidate.version !== 1 || !candidate.schedules || typeof candidate.schedules !== "object") return emptyProgress();
  return { version: 1, schedules: candidate.schedules as Record<string, StoredSchedule> };
}

/**
 * Crea un mazo vacío.
 * @param name - Nombre visible del mazo.
 * @returns El mazo listo para guardar.
 */
export function createDeck(name: string): ReviewDeck {
  return { id: newId(), name: name.trim(), createdAt: new Date().toISOString(), cards: [] };
}

/**
 * Crea una tarjeta de dos caras.
 * @param front - Anverso.
 * @param back - Reverso.
 * @returns La tarjeta lista para guardar.
 */
export function createCard(front: string, back: string): ReviewCard {
  return { id: newId(), front: front.trim(), back: back.trim(), createdAt: new Date().toISOString() };
}

/**
 * Valida y normaliza un documento leído de `app_documents`.
 * @param value - Estado desconocido del servidor.
 * @returns Un documento válido o el documento vacío.
 */
export function parseDocument(value: unknown): TarjetasDocument {
  if (!value || typeof value !== "object") return emptyDocument();
  const candidate = value as { version?: unknown; decks?: unknown };
  if (candidate.version !== 1 || !Array.isArray(candidate.decks)) return emptyDocument();

  const decks = candidate.decks.flatMap((rawDeck): ReviewDeck[] => {
    if (!rawDeck || typeof rawDeck !== "object") return [];
    const deck = rawDeck as { id?: unknown; name?: unknown; createdAt?: unknown; cards?: unknown };
    if (typeof deck.id !== "string" || typeof deck.name !== "string" || typeof deck.createdAt !== "string" || !Array.isArray(deck.cards)) return [];
    const cards = deck.cards.flatMap((rawCard): ReviewCard[] => {
      if (!rawCard || typeof rawCard !== "object") return [];
      const card = rawCard as { id?: unknown; front?: unknown; back?: unknown; createdAt?: unknown; schedule?: unknown };
      if (typeof card.id !== "string" || typeof card.front !== "string" || typeof card.back !== "string" || typeof card.createdAt !== "string") return [];
      return [{ id: card.id, front: card.front, back: card.back, createdAt: card.createdAt, schedule: card.schedule as StoredSchedule | undefined }];
    });
    return [{ id: deck.id, name: deck.name, createdAt: deck.createdAt, cards }];
  });

  return { version: 1, decks };
}

/**
 * Añade o actualiza una tarjeta dentro de un mazo.
 * @param deck - Mazo original.
 * @param card - Tarjeta nueva o editada.
 * @returns Un mazo nuevo.
 */
export function upsertCard(deck: ReviewDeck, card: ReviewCard): ReviewDeck {
  const exists = deck.cards.some((item) => item.id === card.id);
  return {
    ...deck,
    cards: exists ? deck.cards.map((item) => item.id === card.id ? card : item) : [...deck.cards, card],
  };
}

/**
 * Elimina una tarjeta de un mazo.
 * @param deck - Mazo original.
 * @param cardId - Tarjeta que se elimina.
 * @returns Un mazo nuevo.
 */
export function removeCard(deck: ReviewDeck, cardId: string): ReviewDeck {
  return { ...deck, cards: deck.cards.filter((card) => card.id !== cardId) };
}
