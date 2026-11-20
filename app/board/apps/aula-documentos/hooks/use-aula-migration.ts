import { useRef, useState, type MutableRefObject } from "react";
import { createEmptyAulaDocument, type AulaDocument } from "../../../../../lib/domain/aula-documentos/document";
import type { AulaMigrationSource } from "../../../../../lib/domain/aula-documentos/migration";

export type MigrationStatus = {
  aula: { exists: boolean; updatedAt: number | null };
  sources: Array<{
    source: AulaMigrationSource;
    exists: boolean;
    updatedAt: number | null;
    valid: boolean;
    message?: string;
  }>;
  migration: { active: boolean; createdAt: number | null };
};

export type MigrationLoadState = "status" | "migrate" | "rollback";

type MigrationDeps = {
  projectId: string;
  dirty: boolean;
  savingRef: MutableRefObject<boolean>;
  applyLoadedState: (state: unknown, updatedAt: number | null) => void;
  applyDocument: (document: AulaDocument) => void;
  setLastSavedAt: (updatedAt: number | null) => void;
  setDirty: (dirty: boolean) => void;
  setStatus: (message: string) => void;
};

/**
 * Consulta y aplica la migración de las apps documentales antiguas.
 * @param deps - Proyecto y estado compartido de la app.
 * @returns Estado y acciones de migración.
 */
export function useAulaMigration({
  projectId,
  dirty,
  savingRef,
  applyLoadedState,
  applyDocument,
  setLastSavedAt,
  setDirty,
  setStatus,
}: MigrationDeps) {
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [migrationLoading, setMigrationLoading] = useState<MigrationLoadState | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationNotice, setMigrationNotice] = useState<string | null>(null);
  const migrationRef = useRef<HTMLElement>(null);

  /**
   * Consulta qué datos antiguos quedan y si hay una migración reversible.
   * @param showSpinner - Si debe mostrarse el estado de carga inicial.
   */
  async function refreshMigrationStatus(showSpinner = true) {
    if (showSpinner) setMigrationLoading("status");
    try {
      const response = await fetch(`/api/aula-documentos/migration?project=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setMigrationStatus(await response.json() as MigrationStatus);
      setMigrationError(null);
    } catch {
      setMigrationError("No se pudo consultar la migración documental.");
    } finally {
      if (showSpinner) setMigrationLoading(null);
    }
  }

  /**
   * Abre el panel de migración y consulta el estado actual.
   */
  function openMigration() {
    setMigrationError(null);
    setMigrationNotice(null);
    setMigrationOpen(true);
    void refreshMigrationStatus();
  }

  /**
   * Ejecuta o deshace la migración de las apps documentales antiguas.
   * @param action - Acción solicitada.
   */
  async function runMigration(action: "migrate" | "rollback") {
    if (dirty || savingRef.current) return;
    setMigrationLoading(action);
    setMigrationError(null);
    setMigrationNotice(null);
    try {
      const response = await fetch(`/api/aula-documentos/migration?project=${encodeURIComponent(projectId)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => null) as {
        message?: string;
        document?: unknown;
        updatedAt?: number | null;
        warnings?: string[];
      } | null;
      if (!response.ok) {
        setMigrationError(data?.message ?? "No se pudo completar la migración documental.");
        return;
      }

      if (action === "migrate") {
        if (data?.document !== undefined && data.document !== null) {
          applyLoadedState(data.document, data.updatedAt ?? null);
        }
        const warningText = data?.warnings?.length ? ` Avisos: ${data.warnings.join(" ")}` : "";
        setMigrationNotice(`Migración aplicada. Los documentos originales siguen guardados.${warningText}`);
        setStatus("Datos antiguos migrados a Aula Documentos.");
      } else {
        if (data?.document === null) {
          applyDocument(createEmptyAulaDocument("Documento sin título"));
          setLastSavedAt(null);
          setDirty(false);
          setStatus("Migración deshecha. No había documento de Aula guardado.");
        } else if (data?.document !== undefined) {
          applyLoadedState(data.document, data.updatedAt ?? null);
        }
        setMigrationNotice("Migración deshecha. El documento anterior de Aula se ha restaurado.");
        setStatus("Migración documental deshecha.");
      }
      await refreshMigrationStatus(false);
    } catch {
      setMigrationError("No se pudo completar la migración documental.");
    } finally {
      setMigrationLoading(null);
    }
  }

  return {
    migrationOpen,
    setMigrationOpen,
    migrationStatus,
    migrationLoading,
    migrationError,
    migrationNotice,
    migrationRef,
    openMigration,
    runMigration,
  };
}
