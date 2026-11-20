import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyAulaDocument } from "../domain/aula-documentos/document";

const mocks = vi.hoisted(() => ({ binding: vi.fn(), read: vi.fn() }));
vi.mock("../../db", () => ({ getD1: mocks.binding }));
vi.mock("./app-documents", () => ({ readAppDocument: mocks.read }));

import { AULA_MIGRATION_BACKUP_PREFIX, migrateAulaDocuments, rollbackAulaMigration } from "./aula-documentos-migration";

describe("migración reversible de Aula Documentos", () => {
  const projectId = "project1";
  const input = { projectId, userId: "user1" };
  const original = createEmptyAulaDocument("Documento anterior");
  const source = { code: "flowchart TD\n A --> B" };
  let db: DatabaseSync;
  let beforeBatch: (() => void) | undefined;

  function set(appId: string, state: unknown, updatedAt: number) {
    db.prepare("INSERT OR REPLACE INTO app_documents VALUES (?, ?, ?, ?, ?)").run(
      projectId, appId, JSON.stringify(state), updatedAt, input.userId,
    );
  }

  function read(appId: string) {
    const row = db.prepare("SELECT state, updated_at FROM app_documents WHERE project_id = ? AND app_id = ?")
      .get(projectId, appId);
    return row ? { state: JSON.parse(String(row.state)) as unknown, updatedAt: Number(row.updated_at) } : null;
  }

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec(`CREATE TABLE app_documents (
      project_id TEXT NOT NULL, app_id TEXT NOT NULL, state TEXT NOT NULL,
      updated_at INTEGER NOT NULL, updated_by_user_id TEXT, PRIMARY KEY (project_id, app_id)
    )`);
    beforeBatch = undefined;
    mocks.read.mockImplementation(async (_projectId: string, appId: string) => read(appId));
    mocks.binding.mockReturnValue({
      prepare: (sql: string) => ({
        bind: (...args: SQLInputValue[]) => () => db.prepare(sql).run(...args),
      }),
      batch: async (statements: Array<() => void>) => {
        beforeBatch?.();
        db.exec("BEGIN");
        try {
          for (const statement of statements) statement();
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      },
    });
    set("aula-documentos", original, 1);
    set("mermaid", source, 2);
  });

  afterEach(() => db.close());

  it("restaura Aula si el documento sigue intacto y conserva los orígenes", async () => {
    const migrated = await migrateAulaDocuments(input);
    expect(migrated.status).toBe("migrated");
    expect(read("mermaid")).toEqual({ state: source, updatedAt: 2 });
    expect(await rollbackAulaMigration(input)).toMatchObject({ status: "rolled-back", document: original });
    expect(read("aula-documentos")?.state).toEqual(original);
    expect(read("mermaid")).toEqual({ state: source, updatedAt: 2 });
    expect(read(`${AULA_MIGRATION_BACKUP_PREFIX}meta`)).toBeNull();
  });

  it("conserva las ediciones guardadas después de migrar y las copias", async () => {
    await migrateAulaDocuments(input);
    const version = read("aula-documentos")!.updatedAt;
    const edited = createEmptyAulaDocument("Edición posterior");
    set("aula-documentos", edited, version + 1);
    expect(await rollbackAulaMigration(input)).toMatchObject({ status: "conflict" });
    expect(read("aula-documentos")?.state).toEqual(edited);
    expect(read(`${AULA_MIGRATION_BACKUP_PREFIX}aula-documentos`)).not.toBeNull();
  });

  it("rechaza la migración completa si otro guardado se adelanta al lote", async () => {
    const edited = createEmptyAulaDocument("Edición concurrente");
    beforeBatch = () => set("aula-documentos", edited, 3);
    expect(await migrateAulaDocuments(input)).toMatchObject({ status: "conflict" });
    expect(read("aula-documentos")).toEqual({ state: edited, updatedAt: 3 });
    expect(read(`${AULA_MIGRATION_BACKUP_PREFIX}meta`)).toBeNull();
    expect(read(`${AULA_MIGRATION_BACKUP_PREFIX}mermaid`)).toBeNull();
  });
});
