import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { canonicalProjectId, ensureLegacyProjectUuid } from "./project-rekey";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(resolve("drizzle")).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort()) sqlite.exec(readFileSync(resolve("drizzle", file), "utf8"));
  sqlite.exec(`
    INSERT INTO projects VALUES ('default','Curso IA Gestorex',1);
    INSERT INTO students(section,project_id,name,display_name,role,activities,ai_help) VALUES ('s1','default','Alumno','Alumno','alumno','','');
    INSERT INTO teachers(id,project_id,name,role,activities,ai_help) VALUES ('t1','default','Profesor','profesor','','');
    INSERT INTO tasks(id,project_id,title,description,assignee,due_date,priority,status,created_at) VALUES ('task1','default','Tarea','','','','normal','pending',1);
    INSERT INTO project_members(id,project_id,email,role,student_section,user_id,status) VALUES ('member1','default','a@example.com','student','s1','u1','active');
    INSERT INTO task_assignees VALUES ('a1','task1','default','student','s1');
    INSERT INTO app_documents(project_id,app_id,state,updated_at) VALUES ('default','app','{}',1);
    INSERT INTO boards(id,project_id,owner_type,owner_id,snapshot,updated_at) VALUES ('b1','default','project','default','{}',1);
    INSERT INTO uploads(id,project_id,storage_key,url,mime_type,size_bytes,purpose,created_at) VALUES ('f1','default','default/original','/api/files/f1','image/png',1,'task-image',1);
    INSERT INTO deleted_students(section,project_id,deleted_at) VALUES ('d1','default',1);
    INSERT INTO deleted_teachers(id,project_id,deleted_at) VALUES ('d2','default',1);
  `);
  type Params = Array<string | number | null>;
  const db = {
    prepare(sql: string) { return { bind(...params: Params) { return {
      first: async () => sqlite.prepare(sql).get(...params) ?? null,
      run: async () => sqlite.prepare(sql).run(...params),
    }; } }; },
    async batch(statements: Array<{ run(): Promise<unknown> }>) {
      sqlite.exec("BEGIN");
      try { for (const stmt of statements) await stmt.run(); sqlite.exec("COMMIT"); }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  } as unknown as D1Database;
  return { sqlite, db };
}

describe("traslado del proyecto heredado", () => {
  it("conserva referencias, archivos y acceso y mantiene la inmutabilidad", async () => {
    const { sqlite, db } = fixture();
    try {
      const id = await ensureLegacyProjectUuid(db);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(await canonicalProjectId(db, "default")).toBe(id);
      for (const table of ["students", "teachers", "tasks", "project_members", "task_assignees", "app_documents", "boards", "uploads", "deleted_students", "deleted_teachers"]) {
        expect(sqlite.prepare(`SELECT project_id FROM ${table}`).get()?.project_id, table).toBe(id);
      }
      expect(sqlite.prepare("SELECT owner_id FROM boards").get()?.owner_id).toBe(id);
      expect(sqlite.prepare("SELECT storage_key FROM uploads").get()?.storage_key).toBe("default/original");
      expect(sqlite.prepare("SELECT user_id FROM project_members").get()?.user_id).toBe("u1");
      expect(sqlite.prepare("SELECT name FROM projects WHERE id = ?").get(id!)?.name).toBe("Curso IA Gestorex");
      expect(await ensureLegacyProjectUuid(db)).toBe(id);
      expect(() => sqlite.prepare("UPDATE tasks SET project_id = 'otro' WHERE id = 'task1'").run()).toThrow();
    } finally { sqlite.close(); }
  });

  it("revierte todo si alguna operación falla", async () => {
    const { sqlite, db } = fixture();
    try {
      sqlite.exec("CREATE TRIGGER fail_rekey BEFORE UPDATE OF project_id ON tasks BEGIN SELECT RAISE(ABORT, 'fallo'); END;");
      await expect(ensureLegacyProjectUuid(db)).rejects.toThrow();
      expect(sqlite.prepare("SELECT id FROM projects").get()?.id).toBe("default");
      expect(sqlite.prepare("SELECT project_id FROM students").get()?.project_id).toBe("default");
      expect(await canonicalProjectId(db, "default")).toBeNull();
    } finally { sqlite.close(); }
  });
});
