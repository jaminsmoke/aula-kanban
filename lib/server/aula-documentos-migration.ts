import { parseAulaDocument, type AulaDocument } from "../domain/aula-documentos/document";
import {
  AULA_MIGRATION_SOURCES,
  buildAulaMigrationDocument,
  type AulaMigrationSource,
} from "../domain/aula-documentos/migration";
import { importLegacyDocument } from "../domain/aula-documentos/importers";
import {
  deleteAppDocument,
  readAppDocument,
  saveAppDocument,
  type AppDocument,
} from "./app-documents";

/** Prefijo reservado de copias de seguridad de la migración. */
export const AULA_MIGRATION_BACKUP_PREFIX = "__aula-documentos-migration:";
/** Fila con el estado de la migración. */
const META_APP_ID = `${AULA_MIGRATION_BACKUP_PREFIX}meta`;
/** Fila con el documento de Aula anterior a la migración. */
const AULA_BACKUP_APP_ID = `${AULA_MIGRATION_BACKUP_PREFIX}aula-documentos`;

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
 * Guarda una copia interna de un documento antes de sobrescribirlo.
 * @param projectId - Proyecto activo.
 * @param appId - Id reservado de la copia.
 * @param document - Documento que se conserva.
 * @param userId - Cuenta que ejecuta la migración.
 */
async function saveBackup(
  projectId: string,
  appId: string,
  document: AppDocument,
  userId: string,
): Promise<void> {
  await saveAppDocument({
    projectId,
    appId,
    state: JSON.stringify({ state: document.state, updatedAt: document.updatedAt }),
    updatedByUserId: userId,
  });
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

  for (const [source, document] of sourceDocuments) {
    await saveBackup(input.projectId, sourceBackupAppId(source), document, input.userId);
  }
  if (existing) {
    await saveBackup(input.projectId, AULA_BACKUP_APP_ID, existing, input.userId);
  }

  await saveAppDocument({
    projectId: input.projectId,
    appId: META_APP_ID,
    state: JSON.stringify({
      createdAt: Date.now(),
      sources: built.importedSources,
    } satisfies MigrationMeta),
    updatedByUserId: input.userId,
  });
  const updatedAt = await saveAppDocument({
    projectId: input.projectId,
    appId: "aula-documentos",
    state: JSON.stringify(built.document),
    updatedByUserId: input.userId,
  });

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

  const restoredSources: AulaMigrationSource[] = [];
  for (const source of AULA_MIGRATION_SOURCES) {
    const backup = await readAppDocument(input.projectId, sourceBackupAppId(source));
    if (!backup) continue;
    const payload = backupPayload(backup);
    if (!payload) continue;
    await saveAppDocument({
      projectId: input.projectId,
      appId: source,
      state: JSON.stringify(payload.state),
      updatedByUserId: input.userId,
    });
    await deleteAppDocument(input.projectId, sourceBackupAppId(source));
    restoredSources.push(source);
  }

  const aulaBackup = await readAppDocument(input.projectId, AULA_BACKUP_APP_ID);
  const aulaPayload = aulaBackup ? backupPayload(aulaBackup) : null;
  if (aulaPayload) {
    const updatedAt = await saveAppDocument({
      projectId: input.projectId,
      appId: "aula-documentos",
      state: JSON.stringify(aulaPayload.state),
      updatedByUserId: input.userId,
    });
    await deleteAppDocument(input.projectId, AULA_BACKUP_APP_ID);
    await deleteAppDocument(input.projectId, META_APP_ID);
    return {
      status: "rolled-back",
      document: aulaPayload.state,
      updatedAt,
      sources: restoredSources,
      warnings: [],
    };
  }

  await deleteAppDocument(input.projectId, "aula-documentos");
  await deleteAppDocument(input.projectId, AULA_BACKUP_APP_ID);
  await deleteAppDocument(input.projectId, META_APP_ID);
  return {
    status: "rolled-back",
    document: null,
    updatedAt: null,
    sources: restoredSources,
    warnings: [],
  };
}
