import { and, count, desc, eq, lt } from "drizzle-orm";
import { getDb } from "../../../db";
import { aulaDocumentVersions } from "../../../db/schema";

/** Fila de `aula_document_versions`. */
export type AulaDocumentVersionRow = typeof aulaDocumentVersions.$inferSelect;

/** Metadatos de versión sin cargar el estado completo. */
export type AulaDocumentVersionSummaryRow = Omit<AulaDocumentVersionRow, "state">;

/** Datos de escritura de una versión. */
export type AulaDocumentVersionWrite = {
  id: string;
  projectId: string;
  documentId: string;
  name: string;
  state: string;
  schemaVersion: number;
  sizeBytes: number;
  createdBy: string | null;
  createdByName: string;
  createdAt: number;
  kind: "manual" | "pre-restore";
  baseUpdatedAt: number;
};

/**
 * Lista los metadatos de versiones de un documento.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @returns Versiones de la más reciente a la más antigua.
 */
export async function selectAulaVersionSummaries(
  projectId: string,
  documentId: string,
): Promise<AulaDocumentVersionSummaryRow[]> {
  return getDb()
    .select({
      id: aulaDocumentVersions.id,
      projectId: aulaDocumentVersions.projectId,
      documentId: aulaDocumentVersions.documentId,
      name: aulaDocumentVersions.name,
      schemaVersion: aulaDocumentVersions.schemaVersion,
      sizeBytes: aulaDocumentVersions.sizeBytes,
      createdBy: aulaDocumentVersions.createdBy,
      createdByName: aulaDocumentVersions.createdByName,
      createdAt: aulaDocumentVersions.createdAt,
      kind: aulaDocumentVersions.kind,
      baseUpdatedAt: aulaDocumentVersions.baseUpdatedAt,
    })
    .from(aulaDocumentVersions)
    .where(and(eq(aulaDocumentVersions.projectId, projectId), eq(aulaDocumentVersions.documentId, documentId)))
    .orderBy(desc(aulaDocumentVersions.createdAt), desc(aulaDocumentVersions.id));
}

/**
 * Lee una versión completa.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @param versionId - Versión.
 * @returns Fila completa o `null`.
 */
export async function selectAulaVersionRow(
  projectId: string,
  documentId: string,
  versionId: string,
): Promise<AulaDocumentVersionRow | null> {
  const [row] = await getDb()
    .select()
    .from(aulaDocumentVersions)
    .where(and(
      eq(aulaDocumentVersions.projectId, projectId),
      eq(aulaDocumentVersions.documentId, documentId),
      eq(aulaDocumentVersions.id, versionId),
    ));
  return row ?? null;
}

/**
 * Cuenta las versiones de un documento.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @returns Número de versiones.
 */
export async function countAulaVersionRows(projectId: string, documentId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(aulaDocumentVersions)
    .where(and(eq(aulaDocumentVersions.projectId, projectId), eq(aulaDocumentVersions.documentId, documentId)));
  return row?.value ?? 0;
}

/**
 * Inserta una versión.
 * @param input - Datos completos.
 * @returns La fila creada.
 */
export async function insertAulaVersionRow(input: AulaDocumentVersionWrite): Promise<AulaDocumentVersionRow> {
  const [row] = await getDb().insert(aulaDocumentVersions).values(input).returning();
  return row;
}

/**
 * Purga versiones fuera de retención.
 * @param projectId - Proyecto.
 * @param documentId - Documento.
 * @param cutoff - Fecha mínima de conservación.
 */
export async function deleteAulaVersionsBefore(projectId: string, documentId: string, cutoff: number): Promise<void> {
  await getDb()
    .delete(aulaDocumentVersions)
    .where(and(
      eq(aulaDocumentVersions.projectId, projectId),
      eq(aulaDocumentVersions.documentId, documentId),
      lt(aulaDocumentVersions.createdAt, cutoff),
    ));
}
