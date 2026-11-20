import { getD1 } from "../../../db";
import { parseAulaDocument, type AulaDocument } from "../../domain/aula-documentos/document";
import {
  AULA_MIGRATION_SOURCES,
  buildAulaMigrationDocument,
  type AulaMigrationSource,
} from "../../domain/aula-documentos/migration";
import { importLegacyDocument } from "../../domain/aula-documentos/importers";
import {
  readAppDocument,
  type AppDocument,
} from "../apps/app-documents";

/** Prefijo reservado de copias de seguridad de la migración. */
export const AULA_MIGRATION_BACKUP_PREFIX = "__aula-documentos-migration:";
/** Fila con el estado de la migración. */
const META_APP_ID = `${AULA_MIGRATION_BACKUP_PREFIX}meta`;
/** Fila con el documento de Aula anterior a la migración. */
const AULA_BACKUP_APP_ID = `${AULA_MIGRATION_BACKUP_PREFIX}aula-documentos`;
const AULA_APP_ID = "aula-documentos";

/**
 * Identificador interno de la copia de una app antigua.
 * @param source - App documental de origen.
 * @returns El id reservado de la copia.
 */
function sourceBackupAppId(source: AulaMigrationSource): string {
  return `${AULA_MIGRATION_BACKUP_PREFIX}${source}`;
}

type MigrationMeta = {
  createdAt: number;
  aulaUpdatedAt: number;
  sources: AulaMigrationSource[];
};

type StoredBackup = {
  state: unknown;
  updatedAt: number;
};

/** Estado observable de una app antigua para la migración. */
export type AulaMigrationCandidate = {
  source: AulaMigrationSource;
  exists: boolean;
  updatedAt: number | null;
  valid: boolean;
  message?: string;
};

/** Estado que la interfaz muestra antes o después de migrar. */
export type AulaMigrationStatus = {
  aula: { exists: boolean; updatedAt: number | null };
  sources: AulaMigrationCandidate[];
  migration: {
    active: boolean;
    createdAt: number | null;
  };
};

/** Resultado de una migración o de su reversión. */
export type AulaMigrationActionResult =
  | {
    status: "migrated" | "rolled-back";
    document: unknown;
    updatedAt: number | null;
    sources: AulaMigrationSource[];
    warnings: string[];
  }
  | { status: "already-migrated" }
  | { status: "no-data" }
  | { status: "no-backup" }
  | { status: "conflict"; message: string }
  | { status: "invalid"; message: string; warnings?: string[] };

/**
 * Lee el estado de la migración sin modificar ningún documento.
 * @param projectId - Proyecto activo.
 * @returns Apps antiguas detectadas y si ya hay una migración reversible.
 */
export async function readAulaMigrationStatus(projectId: string): Promise<AulaMigrationStatus> {
  const [aula, meta, ...legacy] = await Promise.all([
    readAppDocument(projectId, "aula-documentos"),
    readAppDocument(projectId, META_APP_ID),
    ...AULA_MIGRATION_SOURCES.map((source) => readAppDocument(projectId, source)),
  ]);

  const sources = legacy.map((document, index): AulaMigrationCandidate => {
    const source = AULA_MIGRATION_SOURCES[index];
    if (!document) {
      return { source, exists: false, updatedAt: null, valid: false };
    }
    const imported = importLegacyDocument(source, document.state);
    return {
      source,
      exists: true,
      updatedAt: document.updatedAt,
      valid: imported.ok,
      ...(imported.ok ? {} : { message: imported.message }),
    };
  });

  return {
    aula: { exists: Boolean(aula), updatedAt: aula?.updatedAt ?? null },
    sources,
    migration: {
      active: Boolean(meta),
      createdAt: typeof (meta?.state as Partial<MigrationMeta> | undefined)?.createdAt === "number"
        ? (meta?.state as MigrationMeta).createdAt
        : null,
    },
  };
}

/**
 * Convierte una copia guardada en su estado original.
 * @param backup - Fila de copia de seguridad.
 * @returns El estado y la versión que se guardaron.
 */
function backupPayload(backup: AppDocument): StoredBackup | null {
  const value = backup.state;
  if (typeof value !== "object" || value === null || !("state" in value)) return null;
  const record = value as { state: unknown; updatedAt?: unknown };
  return {
    state: record.state,
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : backup.updatedAt,
  };
}

/**
 * Comprueba las versiones y escribe documentos y copias en un solo lote de D1.
 * La primera sentencia falla si cambió una fila y D1 revierte el lote.
 * @param input - Proyecto, versiones leídas y escrituras preparadas.
 * @returns Si el lote se ejecutó con las versiones esperadas.
 */
async function writeMigration(input: {
  projectId: string;
  userId: string;
  updatedAt: number;
  expected: Map<string, number | null>;
  documents: Map<string, unknown>;
  remove: string[];
}): Promise<boolean> {
  const db = getD1();
  const checks = [...input.expected].map(() => (
    "(SELECT updated_at FROM app_documents WHERE project_id = ? AND app_id = ?) IS NOT ?"
  )).join(" OR ");
  const guard = db.prepare(`SELECT CASE WHEN ${checks} THEN json('aula migration conflict') ELSE 0 END`)
    .bind(...[...input.expected].flatMap(([appId, updatedAt]) => [input.projectId, appId, updatedAt]));
  const writes = [...input.documents].map(([appId, state]) => db.prepare(`
    INSERT INTO app_documents (project_id, app_id, state, updated_at, updated_by_user_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(project_id, app_id) DO UPDATE SET
      state = excluded.state, updated_at = excluded.updated_at, updated_by_user_id = excluded.updated_by_user_id
  `).bind(input.projectId, appId, JSON.stringify(state), input.updatedAt, input.userId));
  const removes = input.remove.map((appId) => db.prepare(
    "DELETE FROM app_documents WHERE project_id = ? AND app_id = ?",
  ).bind(input.projectId, appId));

  try {
    await db.batch([guard, ...writes, ...removes]);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("malformed JSON")) return false;
    throw error;
  }
}

/**
 * Migra los datos válidos de las apps documentales antiguas a Aula Documentos.
 * Las filas de origen no se borran y se guarda una copia reversible de Aula.
 * @param input - Proyecto, cuenta y origen de la llamada.
 * @returns El documento resultante y las fuentes importadas.
 */
export async function migrateAulaDocuments(input: {
  projectId: string;
  userId: string;
}): Promise<AulaMigrationActionResult> {
  const meta = await readAppDocument(input.projectId, META_APP_ID);
  if (meta) return { status: "already-migrated" };

  const existing = await readAppDocument(input.projectId, "aula-documentos");
  let existingDocument: AulaDocument | null = null;
  if (existing) {
    const parsed = parseAulaDocument(existing.state);
    if (!parsed.ok) {
      return {
        status: "invalid",
        message: `El documento actual de Aula Documentos no se puede leer: ${parsed.message}`,
      };
    }
    existingDocument = parsed.document;
  }

  const sourceDocuments = new Map<AulaMigrationSource, AppDocument>();
  for (const source of AULA_MIGRATION_SOURCES) {
    const document = await readAppDocument(input.projectId, source);
    if (document) sourceDocuments.set(source, document);
  }
  if (sourceDocuments.size === 0) return { status: "no-data" };

  const built = buildAulaMigrationDocument({
    existing: existingDocument,
    sources: [...sourceDocuments.entries()].map(([source, document]) => ({
      source,
      state: document.state,
      updatedAt: document.updatedAt,
    })),
  });
  if (!built.ok) {
    return { status: "invalid", message: built.message, warnings: built.warnings };
  }

  const updatedAt = Math.max(Date.now(), (existing?.updatedAt ?? 0) + 1);
  const expected = new Map<string, number | null>([
    [AULA_APP_ID, existing?.updatedAt ?? null],
    [META_APP_ID, null],
    ...AULA_MIGRATION_SOURCES.map((source) => [source, sourceDocuments.get(source)?.updatedAt ?? null] as const),
  ]);
  const documents = new Map<string, unknown>([
    [AULA_APP_ID, built.document],
    [META_APP_ID, { createdAt: Date.now(), aulaUpdatedAt: updatedAt, sources: built.importedSources } satisfies MigrationMeta],
  ]);
  for (const [source, document] of sourceDocuments) documents.set(sourceBackupAppId(source), document);
  if (existing) documents.set(AULA_BACKUP_APP_ID, existing);
  const written = await writeMigration({ ...input, updatedAt, expected, documents, remove: [] });
  if (!written) return { status: "conflict", message: "Los documentos cambiaron durante la migración. Vuelve a consultar el estado." };

  return {
    status: "migrated",
    document: built.document,
    updatedAt,
    sources: built.importedSources,
    warnings: built.warnings,
  };
}

/**
 * Revierte la última migración y deja Aula Documentos como estaba antes.
 * @param input - Proyecto y cuenta que ejecuta la reversión.
 * @returns El documento restaurado o `null` si Aula no tenía documento.
 */
export async function rollbackAulaMigration(input: {
  projectId: string;
  userId: string;
}): Promise<AulaMigrationActionResult> {
  const meta = await readAppDocument(input.projectId, META_APP_ID);
  if (!meta) return { status: "no-backup" };

  const [current, aulaBackup] = await Promise.all([
    readAppDocument(input.projectId, AULA_APP_ID),
    readAppDocument(input.projectId, AULA_BACKUP_APP_ID),
  ]);
  const state = meta.state as Partial<MigrationMeta> | null;
  const conflict = { status: "conflict", message: "Aula Documentos cambió desde la migración. Se conservan el documento actual y sus copias." } as const;
  if (!current || current.updatedAt !== state?.aulaUpdatedAt) return conflict;
  const aulaPayload = aulaBackup ? backupPayload(aulaBackup) : null;
  if (aulaBackup && !aulaPayload) return { status: "invalid", message: "La copia previa de Aula Documentos no se puede leer." };

  const updatedAt = Math.max(Date.now(), current.updatedAt + 1);
  const written = await writeMigration({
    ...input,
    updatedAt,
    expected: new Map([
      [AULA_APP_ID, current.updatedAt],
      [META_APP_ID, meta.updatedAt],
      [AULA_BACKUP_APP_ID, aulaBackup?.updatedAt ?? null],
    ]),
    documents: aulaPayload ? new Map([[AULA_APP_ID, aulaPayload.state]]) : new Map(),
    remove: [
      META_APP_ID, AULA_BACKUP_APP_ID, ...AULA_MIGRATION_SOURCES.map(sourceBackupAppId),
      ...(aulaPayload ? [] : [AULA_APP_ID]),
    ],
  });
  if (!written) return conflict;
  return {
    status: "rolled-back",
    document: aulaPayload?.state ?? null,
    updatedAt: aulaPayload ? updatedAt : null,
    sources: [],
    warnings: [],
  };
}
