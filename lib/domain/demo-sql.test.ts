import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { DEMO_PROJECT_ID, DEMO_STUDENTS, DEMO_TASKS, DEMO_TEACHERS } from "./demo-data";
import { buildDemoSql, buildDemoStatements } from "./demo-sql";

const sql = buildDemoSql();

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE projects (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE students (section TEXT PRIMARY KEY, project_id TEXT, name TEXT, display_name TEXT, role TEXT, activities TEXT, ai_help TEXT, deleted INTEGER, revision INTEGER, mutation_token TEXT);
    CREATE TABLE teachers (id TEXT PRIMARY KEY, project_id TEXT, name TEXT, display_name TEXT, role TEXT, activities TEXT, ai_help TEXT, revision INTEGER, mutation_token TEXT);
    CREATE TABLE tasks (id TEXT PRIMARY KEY, project_id TEXT, title TEXT, description TEXT, assignee TEXT, due_date TEXT, priority TEXT, status TEXT, image_url TEXT, created_at INTEGER, revision INTEGER, creator_user_id TEXT, creator_member_id TEXT, creator_name TEXT, mutation_token TEXT);
    CREATE TABLE task_assignees (id TEXT PRIMARY KEY, task_id TEXT, project_id TEXT, kind TEXT, profile_id TEXT);
    CREATE TABLE boards (id TEXT PRIMARY KEY, project_id TEXT, owner_type TEXT, owner_id TEXT, snapshot TEXT, revision INTEGER, updated_at INTEGER, UNIQUE(owner_type, owner_id));
    CREATE TABLE app_documents (project_id TEXT, app_id TEXT, state TEXT, updated_at INTEGER, updated_by_user_id TEXT, PRIMARY KEY(project_id, app_id));
    CREATE TABLE instance_apps (id TEXT PRIMARY KEY);
    INSERT INTO projects VALUES ('otro', 'Proyecto real', 1);
    INSERT INTO instance_apps VALUES ('app-real');
  `);
  return db;
}

describe("SQL de la demo", () => {
  it("se limita al proyecto fijo y no instala apps globales", () => {
    expect(sql).toContain(DEMO_PROJECT_ID);
    expect(sql).not.toContain("INSERT INTO instance_apps");
    expect(sql).not.toContain("11111111-1111-4111-8111-111111111111");
    expect(sql).toContain("-- La demo funciona con las apps que la instancia tenga instaladas");
  });

  it("incluye el proyecto, las personas, las tareas y los documentos", () => {
    expect(sql.match(/INSERT INTO projects/g)).toHaveLength(1);
    expect(sql.match(/INSERT INTO students/g)).toHaveLength(6);
    expect(sql.match(/INSERT INTO teachers/g)).toHaveLength(2);
    expect(sql.match(/INSERT INTO tasks/g)).toHaveLength(8);
    expect(sql.match(/INSERT OR IGNORE INTO task_assignees/g)).toHaveLength(15);
    expect(sql.match(/INSERT INTO boards/g)).toHaveLength(1);
    expect(sql.match(/INSERT INTO app_documents/g)).toHaveLength(2);
    expect(sql).toContain("'aula-documentos'");
    expect(sql).not.toContain("'mermaid'");
    for (const task of DEMO_TASKS) expect(sql).toContain(task.id);
  });

  it("usa upserts idempotentes y un borrado acotado de asignaciones", () => {
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE");
    expect(sql).toContain("ON CONFLICT(owner_type, owner_id) DO UPDATE");
    expect(sql).toContain("ON CONFLICT(project_id, app_id) DO UPDATE");
    expect(sql).toContain(`DELETE FROM task_assignees WHERE project_id = '${DEMO_PROJECT_ID}';`);
    expect(sql).not.toMatch(/DELETE FROM (projects|students|teachers|tasks|boards|app_documents)/);
    expect(sql.startsWith("-- Demo de Aula Kanban")).toBe(true);
    expect(sql.trimEnd().endsWith("-- La demo funciona con las apps que la instancia tenga instaladas; este SQL no las instala.")).toBe(true);
  });

  it("se puede aplicar dos veces sin alterar otros proyectos ni apps", () => {
    const db = database();
    db.exec(sql);
    db.exec(sql);
    expect(db.prepare("SELECT count(*) AS n FROM tasks WHERE project_id = ?").get(DEMO_PROJECT_ID)?.n).toBe(8);
    expect(db.prepare("SELECT name FROM projects WHERE id = 'otro'").get()?.name).toBe("Proyecto real");
    expect(db.prepare("SELECT id FROM instance_apps").get()?.id).toBe("app-real");
    db.close();
  });

  it("funciona dos veces sobre el esquema real de todas las migraciones", () => {
    const db = new DatabaseSync(":memory:");
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ tag: string }> };
    for (const entry of journal.entries) db.exec(readFileSync(`drizzle/${entry.tag}.sql`, "utf8"));
    db.exec("INSERT INTO projects (id, name, created_at) VALUES ('otro', 'Proyecto real', 1)");
    db.exec(sql);
    db.exec(sql);
    expect(db.prepare("SELECT count(*) AS n FROM students WHERE project_id = ?").get(DEMO_PROJECT_ID)?.n).toBe(6);
    expect(db.prepare("SELECT count(*) AS n FROM task_assignees WHERE project_id = ?").get(DEMO_PROJECT_ID)?.n).toBe(15);
    expect(db.prepare("SELECT name FROM projects WHERE id = 'otro'").get()?.name).toBe("Proyecto real");
    db.close();
  });

  it("genera sentencias ejecutables en un lote de D1 sin romper los literales", () => {
    const db = database();
    db.exec("BEGIN");
    for (const statement of buildDemoStatements()) db.exec(statement);
    db.exec("COMMIT");
    expect(db.prepare("SELECT count(*) AS n FROM tasks WHERE project_id = ?").get(DEMO_PROJECT_ID)?.n).toBe(8);
    expect(db.prepare("SELECT count(*) AS n FROM task_assignees WHERE project_id = ?").get(DEMO_PROJECT_ID)?.n).toBe(15);
    db.close();
  });

  it.each([
    ["proyecto", `INSERT INTO projects VALUES ('${DEMO_PROJECT_ID}', 'Proyecto ajeno', 1)`],
    ["alumno", `INSERT INTO students (section, project_id, name) VALUES ('${DEMO_STUDENTS[0].section}', 'otro', 'Real')`],
    ["profesor", `INSERT INTO teachers (id, project_id, name) VALUES ('${DEMO_TEACHERS[0].id}', 'otro', 'Real')`],
    ["tarea", `INSERT INTO tasks (id, project_id, title) VALUES ('${DEMO_TASKS[0].id}', 'otro', 'Real')`],
    ["asignación", "INSERT INTO task_assignees (id, project_id) VALUES ('5f1c9b1e-0002-4a00-8000-000000000001', 'otro')"],
    ["pizarra", "INSERT INTO boards (id, project_id, owner_type, owner_id) VALUES ('6f1c9b1e-0002-4a00-8000-000000000001', 'otro', 'space', 'otro')"],
  ])("rechaza la colisión de %s sin modificar los datos existentes", (_kind, fixture) => {
    const db = database();
    db.exec(fixture);
    expect(() => db.exec(sql)).toThrow();
    db.exec("ROLLBACK");
    expect(db.prepare("SELECT name FROM projects WHERE id = 'otro'").get()?.name).toBe("Proyecto real");
    expect(db.prepare("SELECT count(*) AS n FROM tasks WHERE project_id = ?").get(DEMO_PROJECT_ID)?.n).toBe(0);
    expect(db.prepare("SELECT id FROM instance_apps").get()?.id).toBe("app-real");
    db.close();
  });
});
