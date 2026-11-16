import { describe, expect, it } from "vitest";
import { createCard, createDeck, emptyDocument, parseDocument, removeCard, upsertCard } from "./tarjetas-model";

describe("modelo de Tarjetas de repaso", () => {
  it("crea mazos y tarjetas sin espacios sobrantes", () => {
    const deck = createDeck("  Vocabulario  ");
    const card = createCard("  casa  ", "  house  ");
    expect(deck.name).toBe("Vocabulario");
    expect(deck.cards).toEqual([]);
    expect(card.front).toBe("casa");
    expect(card.back).toBe("house");
    expect(deck.id).toBeTruthy();
    expect(card.id).toBeTruthy();
  });

  it("añade, actualiza y elimina tarjetas", () => {
    const deck = createDeck("Historia");
    const card = createCard("¿Quién pintó el Guernica?", "Picasso");
    const withCard = upsertCard(deck, card);
    expect(withCard.cards).toHaveLength(1);
    const updated = upsertCard(withCard, { ...card, back: "Pablo Picasso" });
    expect(updated.cards).toHaveLength(1);
    expect(updated.cards[0].back).toBe("Pablo Picasso");
    expect(removeCard(updated, card.id).cards).toHaveLength(0);
  });

  it("normaliza un documento válido y descarta datos incompletos", () => {
    const deck = createDeck("Ciencias");
    const card = createCard("H2O", "Agua");
    const parsed = parseDocument({ version: 1, decks: [{ ...deck, cards: [card, { id: "rota" }] }] });
    expect(parsed.decks).toHaveLength(1);
    expect(parsed.decks[0].cards).toHaveLength(1);
    expect(parsed.decks[0].cards[0].front).toBe("H2O");
  });

  it("devuelve un documento vacío para estados inválidos", () => {
    expect(parseDocument(null)).toEqual(emptyDocument());
    expect(parseDocument({ version: 2, decks: [] })).toEqual(emptyDocument());
    expect(parseDocument({ version: 1, decks: "no" })).toEqual(emptyDocument());
  });
});
