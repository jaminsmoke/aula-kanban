import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("drizzle/0029_careless_kabuki.sql"), "utf8");

describe("retirada de tablas históricas de documentos", () => {
  it("retira las tablas antiguas y conserva los documentos activos", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`
        CREATE TABLE blockly_programs (project_id TEXT PRIMARY KEY, state TEXT NOT NULL);
        CREATE TABLE mermaid_diagrams (project_id TEXT PRIMARY KEY, code TEXT NOT NULL);
        CREATE TABLE app_documents (project_id TEXT NOT NULL, app_id TEXT NOT NULL, state TEXT NOT NULL, PRIMARY KEY(project_id, app_id));
        INSERT INTO blockly_programs VALUES ('p1', '{"old":true}');
        INSERT INTO mermaid_diagrams VALUES ('p1', 'flowchart TD');
        INSERT INTO app_documents VALUES ('p1', 'blockly', '{"new":true}'), ('p1', 'mermaid', '{"code":"flowchart TD"}');
      `);
      db.exec(migration);
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('blockly_programs', 'mermaid_diagrams')").all()).toEqual([]);
      expect(db.prepare("SELECT app_id, state FROM app_documents ORDER BY app_id").all().map((row) => ({ ...row }))).toEqual([
        { app_id: "blockly", state: '{"new":true}' },
        { app_id: "mermaid", state: '{"code":"flowchart TD"}' },
      ]);
    } finally {
      db.close();
    }
  });
});
