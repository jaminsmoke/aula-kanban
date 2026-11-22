"use client";

import { useEffect, useState } from "react";

/** Documento disponible para vincular a una tarea. */
export type TaskDocumentOption = {
  id: string;
  title: string;
  status: "active" | "archived" | "deleted";
};

/**
 * Carga una vez la lista de documentos del proyecto para la ficha de tarea.
 * @param projectId - Proyecto activo.
 * @param enabled - Solo carga cuando la ficha está abierta.
 * @returns Documentos, carga y error.
 */
export function useTaskDocuments(projectId: string | null, enabled: boolean) {
  const [documents, setDocuments] = useState<TaskDocumentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !projectId) return;
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/aula-documentos?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json() as {
          active?: Array<{ id: string; title: string }>;
          archived?: Array<{ id: string; title: string }>;
          deleted?: Array<{ id: string; title: string }>;
        };
        if (!active) return;
        setDocuments([
          ...(data.active ?? []).map((document) => ({ ...document, status: "active" as const })),
          ...(data.archived ?? []).map((document) => ({ ...document, status: "archived" as const })),
          ...(data.deleted ?? []).map((document) => ({ ...document, status: "deleted" as const })),
        ]);
      } catch {
        if (active) setError("No se pudieron cargar los documentos del proyecto.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [enabled, projectId]);

  return { documents, loading, error };
}
