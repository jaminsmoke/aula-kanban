import {
  DEMO_APPS,
  DEMO_BLOCKLY,
  DEMO_BOARD,
  DEMO_MERMAID,
  DEMO_PROJECT_ID,
  DEMO_PROJECT_NAME,
  DEMO_STUDENTS,
  DEMO_TASKS,
  DEMO_TEACHERS,
  currentMonthDate,
} from "./demo-data.ts";

/** Marca temporal fija para que el SQL sea reproducible. */
const BASE_TIME = Date.UTC(2026, 10, 16, 8, 0, 0);

/** Id fijo de la pizarra del espacio de la demo. */
const DEMO_BOARD_ID = "6f1c9b1e-0002-4a00-8000-000000000001";

/**
 * Convierte un valor a un literal SQL seguro.
 * @param value - Texto, número o nulo.
 * @returns El literal listo para incluir en el SQL.
 */
function literal(value: string | number | null): string {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Construye el SQL de datos de la demo para la instancia publicada.
 * Es idempotente, se limita al proyecto fijo y no escribe en `instance_apps`:
 * la instalación de apps sigue siendo una decisión del propietario.
 * @returns El script SQL completo, listo para revisar y aplicar con D1.
 */
export function buildDemoSql(): string {
  const lines: string[] = [
    "-- Demo de Aula Kanban: datos ficticios idempotentes.",
    `-- Proyecto fijo: ${DEMO_PROJECT_ID}.`,
    "-- No escribe en instance_apps ni toca otros proyectos.",
    "-- Aplicar con revisión previa y copia de la D1; lo ejecuta Codex.",
    "",
    "BEGIN TRANSACTION;",
    "",
  ];

  lines.push(
    "INSERT INTO projects (id, name, created_at) VALUES",
    `  (${literal(DEMO_PROJECT_ID)}, ${literal(DEMO_PROJECT_NAME)}, ${BASE_TIME})`,
    "ON CONFLICT(id) DO UPDATE SET name = excluded.name;",
    "",
  );

  for (const student of DEMO_STUDENTS) {
    lines.push(
      "INSERT INTO students (section, project_id, name, display_name, role, activities, ai_help, deleted, revision, mutation_token) VALUES",
      `  (${literal(student.section)}, ${literal(DEMO_PROJECT_ID)}, ${literal(student.name)}, ${literal(student.displayName)}, ${literal(student.role)}, ${literal(student.activities)}, ${literal(student.aiHelp)}, 0, 1, NULL)`,
      "ON CONFLICT(section) DO UPDATE SET name = excluded.name, display_name = excluded.display_name, role = excluded.role, activities = excluded.activities, ai_help = excluded.ai_help, deleted = 0;",
      "",
    );
  }

  for (const teacher of DEMO_TEACHERS) {
    lines.push(
      "INSERT INTO teachers (id, project_id, name, display_name, role, activities, ai_help, revision, mutation_token) VALUES",
      `  (${literal(teacher.id)}, ${literal(DEMO_PROJECT_ID)}, ${literal(teacher.name)}, ${literal(teacher.displayName)}, ${literal(teacher.role)}, ${literal(teacher.activities)}, ${literal(teacher.aiHelp)}, 1, NULL)`,
      "ON CONFLICT(id) DO UPDATE SET name = excluded.name, display_name = excluded.display_name, role = excluded.role, activities = excluded.activities, ai_help = excluded.ai_help;",
      "",
    );
  }

  DEMO_TASKS.forEach((task, index) => {
    lines.push(
      "INSERT INTO tasks (id, project_id, title, description, assignee, due_date, priority, status, image_url, created_at, revision, creator_user_id, creator_member_id, creator_name, mutation_token) VALUES",
      `  (${literal(task.id)}, ${literal(DEMO_PROJECT_ID)}, ${literal(task.title)}, ${literal(task.description)}, '', ${literal(currentMonthDate(task.dueDay))}, ${literal(task.priority)}, ${literal(task.status)}, NULL, ${BASE_TIME + index * 1000}, 1, NULL, NULL, NULL, NULL)`,
      "ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, assignee = excluded.assignee, due_date = excluded.due_date, priority = excluded.priority, status = excluded.status, image_url = excluded.image_url;",
      "",
    );
  });

  lines.push(
    `DELETE FROM task_assignees WHERE project_id = ${literal(DEMO_PROJECT_ID)};`,
    "",
  );
  let assigneeIndex = 0;
  for (const task of DEMO_TASKS) {
    for (const assignee of task.assignees) {
      assigneeIndex += 1;
      const id = `5f1c9b1e-0002-4a00-8000-${String(assigneeIndex).padStart(12, "0")}`;
      lines.push(
        "INSERT OR IGNORE INTO task_assignees (id, task_id, project_id, kind, profile_id) VALUES",
        `  (${literal(id)}, ${literal(task.id)}, ${literal(DEMO_PROJECT_ID)}, ${literal(assignee.kind)}, ${literal(assignee.profileId)});`,
        "",
      );
    }
  }

  lines.push(
    "INSERT INTO boards (id, project_id, owner_type, owner_id, snapshot, revision, updated_at) VALUES",
    `  (${literal(DEMO_BOARD_ID)}, ${literal(DEMO_PROJECT_ID)}, 'space', ${literal(DEMO_PROJECT_ID)}, ${literal(JSON.stringify(DEMO_BOARD))}, 1, ${BASE_TIME})`,
    "ON CONFLICT(owner_type, owner_id) DO UPDATE SET snapshot = excluded.snapshot, revision = excluded.revision, updated_at = excluded.updated_at;",
    "",
  );

  const documents = [
    { appId: "mermaid", state: DEMO_MERMAID },
    { appId: "blockly", state: DEMO_BLOCKLY },
  ];
  for (const document of documents) {
    lines.push(
      "INSERT INTO app_documents (project_id, app_id, state, updated_at, updated_by_user_id) VALUES",
      `  (${literal(DEMO_PROJECT_ID)}, ${literal(document.appId)}, ${literal(JSON.stringify(document.state))}, ${BASE_TIME}, NULL)`,
      "ON CONFLICT(project_id, app_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at;",
      "",
    );
  }

  lines.push("COMMIT;", "");
  lines.push(`-- Apps previstas por la demo: ${DEMO_APPS.join(", ")}.`);
  lines.push("-- La demo funciona con las apps que la instancia tenga instaladas; este SQL no las instala.");
  return `${lines.join("\n")}\n`;
}
