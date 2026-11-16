import { describe, expect, it } from "vitest";
import { DEMO_PROJECT_ID, DEMO_TASKS } from "./demo-data";
import { buildDemoSql } from "./demo-sql";

const sql = buildDemoSql();

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
});
