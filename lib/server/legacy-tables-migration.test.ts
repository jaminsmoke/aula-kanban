import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

describe("retirada de tablas históricas", () => {
  it("conserva los administradores y aplicaciones vigentes y elimina las dependencias antiguas", () => {
    const db = new DatabaseSync(":memory:");
    try {
      db.exec(`
        CREATE TABLE administrators (id TEXT PRIMARY KEY, profile_id TEXT);
        CREATE TABLE administrator_profiles (id TEXT PRIMARY KEY);
        CREATE TABLE transition_state (id TEXT PRIMARY KEY, status TEXT);
        CREATE TABLE space_apps (id TEXT PRIMARY KEY);
        CREATE TABLE administrators_unified (id TEXT PRIMARY KEY, email TEXT);
        CREATE TABLE instance_apps (app_id TEXT PRIMARY KEY, installed INTEGER);
        CREATE TABLE instance_owner (id TEXT PRIMARY KEY, user_id TEXT);
        CREATE TRIGGER administrator_profiles_prevent_orphan_delete BEFORE DELETE ON administrator_profiles
        WHEN EXISTS (SELECT 1 FROM administrators WHERE profile_id = OLD.id)
        BEGIN SELECT RAISE(ABORT, 'Project has dependent records'); END;
        CREATE TRIGGER legacy_admin_lock_insert BEFORE INSERT ON administrators
        WHEN EXISTS (SELECT 1 FROM transition_state WHERE id = 'administrators-v2')
        BEGIN SELECT RAISE(ABORT, 'Administrator migration in progress'); END;
        INSERT INTO administrators_unified VALUES ('a1', 'admin@example.test');
        INSERT INTO instance_apps VALUES ('blockly', 1);
        INSERT INTO instance_owner VALUES ('owner', 'u1');
        INSERT INTO transition_state VALUES ('administrators-v2', 'complete');
      `);
      db.exec(readFileSync(resolve("drizzle/0030_smooth_harpoon.sql"), "utf8"));
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('administrators', 'administrator_profiles', 'space_apps', 'transition_state')").all()).toEqual([]);
      expect(db.prepare("SELECT email FROM administrators_unified").get()?.email).toBe("admin@example.test");
      expect(db.prepare("SELECT installed FROM instance_apps WHERE app_id = 'blockly'").get()?.installed).toBe(1);
      expect(db.prepare("SELECT user_id FROM instance_owner").get()?.user_id).toBe("u1");
      expect(db.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");
    } finally {
      db.close();
    }
  });
});
