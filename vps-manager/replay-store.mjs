// Experimental, not wired into the manager or any public service.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

/** An atomic shared replay store. The caller must provide a private directory. */
export function openReplayStore(filename) {
  if (typeof filename !== 'string' || !path.isAbsolute(filename)) throw new Error('replay_store_absolute_path_required');
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS consumed (id TEXT PRIMARY KEY NOT NULL, expires INTEGER NOT NULL) WITHOUT ROWID; CREATE INDEX IF NOT EXISTS consumed_expires ON consumed(expires);');
  const prune = db.prepare('DELETE FROM consumed WHERE expires <= ?');
  const count = db.prepare('SELECT count(*) AS n FROM consumed');
  const insert = db.prepare('INSERT OR IGNORE INTO consumed(id, expires) VALUES (?, ?)');
  return {
    consume(id, expires, now) {
      if (typeof id !== 'string' || !Number.isSafeInteger(expires) || !Number.isSafeInteger(now) || expires <= now) return false;
      db.exec('BEGIN IMMEDIATE');
      try {
        prune.run(now);
        const accepted = count.get().n < 10000 && insert.run(id, expires).changes === 1;
        db.exec('COMMIT');
        return accepted;
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch { /* preserve the original error */ }
        throw error;
      }
    },
    close() { db.close(); },
  };
}
