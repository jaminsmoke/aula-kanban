import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("drizzle/0042_tranquil_mercury.sql"), "utf8");

describe("migración de la suite de Aula Documentos", () => {
  it("crea la tabla, añade el documento a las copias y conserva la fila única", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`
        CREATE TABLE app_documents (
          project_id TEXT NOT NULL,
          app_id TEXT NOT NULL,
          state TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          updated_by_user_id TEXT,
          PRIMARY KEY(project_id, app_id)
        );
        CREATE TABLE document_copies (
          id TEXT PRIMARY KEY NOT NULL,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          format TEXT NOT NULL,
          format_version INTEGER NOT NULL,
          schema_version INTEGER NOT NULL,
          size_bytes INTEGER NOT NULL,
          owner_user_id TEXT,
          created_at INTEGER NOT NULL
        );
        INSERT INTO app_documents VALUES ('p1', 'aula-documentos', '{"title":"Clase"}', 5, 'u1');
        INSERT INTO document_copies VALUES ('copy1', 'p1', 'Copia', 'aula-document-copy', 1, 3, 10, 'u1', 6);
      `);
      db.exec(migration);

      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'aula_documents'").get()?.name).toBe("aula_documents");
      expect(db.prepare("PRAGMA table_info(aula_documents)").all().map((row) => ({ ...row }).name)).toEqual([
        "project_id", "id", "title", "excerpt", "state", "status", "created_at", "updated_at", "archived_at", "created_by", "updated_by",
      ]);
      expect(db.prepare("PRAGMA table_info(document_copies)").all().map((row) => ({ ...row }).name)).toContain("document_id");
      expect(db.prepare("SELECT state FROM app_documents WHERE project_id = 'p1' AND app_id = 'aula-documentos'").get()?.state).toBe('{"title":"Clase"}');
      expect(db.prepare("SELECT COUNT(*) AS count FROM document_copies").get()?.count).toBe(1);

      db.prepare("INSERT INTO aula_documents (project_id, id, title, excerpt, state, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run("p1", "legacy", "Clase", "", '{"title":"Clase"}', "active", 5, 5);
      expect(db.prepare("SELECT id, title FROM aula_documents WHERE project_id = 'p1'").all().map((row) => ({ ...row }))).toEqual([
        { id: "legacy", title: "Clase" },
      ]);
    } finally {
      db.close();
    }
  });
});
