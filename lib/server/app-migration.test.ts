import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("drizzle/0039_split_edu_tools.sql"), "utf8");

const DDL = `
  CREATE TABLE instance_apps (
    id TEXT PRIMARY KEY NOT NULL,
    app_id TEXT NOT NULL,
    installed INTEGER NOT NULL DEFAULT 0,
    version TEXT,
    installed_by_user_id TEXT,
    updated_at INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX instance_app_app ON instance_apps(app_id);
  CREATE TABLE app_preferences (
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    app_id TEXT NOT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    position INTEGER,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, user_id, app_id)
  );
`;

function openDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(DDL);
  return db;
}

function applyTwice(db: DatabaseSync) {
  db.exec(migration);
  db.exec(migration);
}

type AppRow = { app_id: string; installed: number; version: string | null };
type PreferenceRow = { project_id: string; user_id: string; app_id: string; favorite: number; position: number | null };

function apps(db: DatabaseSync): AppRow[] {
  return db.prepare("SELECT app_id, installed, version FROM instance_apps ORDER BY app_id").all() as AppRow[];
}

function preferences(db: DatabaseSync): PreferenceRow[] {
  return db.prepare("SELECT project_id, user_id, app_id, favorite, position FROM app_preferences ORDER BY project_id, user_id, app_id").all() as PreferenceRow[];
}

describe("migración 0039 · separación de edu-tools", () => {
  it("duplica la instalación y las preferencias en las dos apps y retira la fila antigua", () => {
    const db = openDb();
    try {
      db.exec(`
        INSERT INTO instance_apps VALUES ('legacy', 'edu-tools', 1, '1.2.3', 'u-owner', 10);
        INSERT INTO app_preferences VALUES
          ('p1', 'u1', 'edu-tools', 1, 2, 10),
          ('p2', 'u2', 'edu-tools', 0, NULL, 20);
      `);
      applyTwice(db);

      expect(apps(db)).toEqual([
        { app_id: "calculadora", installed: 1, version: "1.2.3" },
        { app_id: "tabla-periodica", installed: 1, version: "1.2.3" },
      ]);
      expect(preferences(db)).toEqual([
        { project_id: "p1", user_id: "u1", app_id: "calculadora", favorite: 1, position: 2 },
        { project_id: "p1", user_id: "u1", app_id: "tabla-periodica", favorite: 1, position: 2 },
        { project_id: "p2", user_id: "u2", app_id: "calculadora", favorite: 0, position: null },
        { project_id: "p2", user_id: "u2", app_id: "tabla-periodica", favorite: 0, position: null },
      ]);
    } finally {
      db.close();
    }
  });

  it("no instala nada si edu-tools estaba desinstalada, pero conserva sus preferencias", () => {
    const db = openDb();
    try {
      db.exec(`
        INSERT INTO instance_apps VALUES ('legacy', 'edu-tools', 0, NULL, 'u-owner', 10);
        INSERT INTO app_preferences VALUES ('p1', 'u1', 'edu-tools', 1, 0, 10);
      `);
      applyTwice(db);

      expect(apps(db)).toEqual([]);
      expect(preferences(db)).toEqual([
        { project_id: "p1", user_id: "u1", app_id: "calculadora", favorite: 1, position: 0 },
        { project_id: "p1", user_id: "u1", app_id: "tabla-periodica", favorite: 1, position: 0 },
      ]);
    } finally {
      db.close();
    }
  });

  it("no pisa una instalación o preferencia nueva que ya exista", () => {
    const db = openDb();
    try {
      db.exec(`
        INSERT INTO instance_apps VALUES ('calc', 'calculadora', 0, NULL, 'u-admin', 5);
        INSERT INTO instance_apps VALUES ('legacy', 'edu-tools', 1, '9.9.9', 'u-owner', 10);
        INSERT INTO app_preferences VALUES ('p1', 'u1', 'calculadora', 0, 0, 5);
        INSERT INTO app_preferences VALUES ('p1', 'u1', 'edu-tools', 1, 3, 10);
      `);
      applyTwice(db);

      expect(apps(db)).toEqual([
        { app_id: "calculadora", installed: 0, version: null },
        { app_id: "tabla-periodica", installed: 1, version: "9.9.9" },
      ]);
      expect(preferences(db)).toEqual([
        { project_id: "p1", user_id: "u1", app_id: "calculadora", favorite: 0, position: 0 },
        { project_id: "p1", user_id: "u1", app_id: "tabla-periodica", favorite: 1, position: 3 },
      ]);
    } finally {
      db.close();
    }
  });

  it("es un no-op repetible si no existe ninguna fila antigua", () => {
    const db = openDb();
    try {
      applyTwice(db);
      expect(apps(db)).toEqual([]);
      expect(preferences(db)).toEqual([]);
    } finally {
      db.close();
    }
  });
});
