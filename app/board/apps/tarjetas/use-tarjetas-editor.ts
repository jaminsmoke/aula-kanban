"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { StoreRole } from "../types";
import { useAppDocument } from "../use-app-document";
import {
  createCard,
  createDeck,
  emptyDocument,
  parseDocument,
  removeCard,
  upsertCard,
  type ReviewCard,
  type ReviewDeck,
  type TarjetasDocument,
} from "./tarjetas-model";

/**
 * Documento, mazos y tarjetas de la app de repaso.
 * @param projectId - Proyecto activo.
 * @param role - Rol del usuario.
 * @returns Estado editable y acciones de persistencia.
 */
export function useTarjetasEditor(projectId: string, role: StoreRole) {
  const [doc, setDoc] = useState<TarjetasDocument>(emptyDocument);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const { load, save, loading, error } = useAppDocument<TarjetasDocument>(projectId, "tarjetas");
  const readOnly = role === "guest";
  const selectedDeck = doc.decks.find((deck) => deck.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;
    void load().then(({ state }) => {
      if (!active) return;
      const next = parseDocument(state);
      setDoc(next);
      setSelectedId(next.decks[0]?.id ?? null);
      setDirty(false);
    });
    return () => { active = false; };
  }, [load]);

  const markDirty = useCallback(() => {
    setDirty(true);
    setStatus("");
  }, []);

  const updateDeck = useCallback((nextDeck: ReviewDeck) => {
    setDoc((current) => ({
      ...current,
      decks: current.decks.map((deck) => deck.id === nextDeck.id ? nextDeck : deck),
    }));
    markDirty();
  }, [markDirty]);

  function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newDeckName.trim();
    if (!name || readOnly) return;
    const deck = createDeck(name);
    setDoc((current) => ({ ...current, decks: [...current.decks, deck] }));
    setSelectedId(deck.id);
    setNewDeckName("");
    setEditingId(null);
    setFront("");
    setBack("");
    markDirty();
  }

  function selectDeck(id: string) {
    setSelectedId(id);
    setEditingId(null);
    setFront("");
    setBack("");
  }

  function handleSubmitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeck || readOnly) return;
    const nextFront = front.trim();
    const nextBack = back.trim();
    if (!nextFront || !nextBack) return;
    const existing = editingId ? selectedDeck.cards.find((card) => card.id === editingId) : undefined;
    const card: ReviewCard = existing
      ? { ...existing, front: nextFront, back: nextBack }
      : createCard(nextFront, nextBack);
    updateDeck(upsertCard(selectedDeck, card));
    setEditingId(null);
    setFront("");
    setBack("");
  }

  function handleEditCard(card: ReviewCard) {
    setEditingId(card.id);
    setFront(card.front);
    setBack(card.back);
  }

  function handleDeleteCard(cardId: string) {
    if (!selectedDeck || readOnly) return;
    updateDeck(removeCard(selectedDeck, cardId));
    if (editingId === cardId) {
      setEditingId(null);
      setFront("");
      setBack("");
    }
  }

  function handleDeleteDeck() {
    if (!selectedDeck || readOnly) return;
    const remaining = doc.decks.filter((deck) => deck.id !== selectedDeck.id);
    setDoc((current) => ({ ...current, decks: remaining }));
    setSelectedId(remaining[0]?.id ?? null);
    setEditingId(null);
    setFront("");
    setBack("");
    markDirty();
  }

  async function saveDocument() {
    if (readOnly || saving) return;
    setSaving(true);
    const ok = await save(doc);
    setSaving(false);
    setDirty(!ok);
    setStatus(ok ? "Guardado en el proyecto." : "No se pudo guardar. Inténtalo de nuevo.");
  }

  const cancelCardEdit = useCallback(() => {
    setEditingId(null);
    setFront("");
    setBack("");
  }, []);

  return {
    doc,
    selectedId,
    selectedDeck,
    newDeckName,
    setNewDeckName,
    front,
    setFront,
    back,
    setBack,
    editingId,
    dirty,
    saving,
    status,
    setStatus,
    loading,
    error,
    readOnly,
    handleCreateDeck,
    selectDeck,
    handleSubmitCard,
    handleEditCard,
    handleDeleteCard,
    handleDeleteDeck,
    saveDocument,
    cancelCardEdit,
  };
}
