import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const filename = process.env.INTERVIEWIQ_DB_PATH || path.join(process.cwd(), '.data', 'interviewiq.sqlite');
mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });

declare global {
  var interviewDatabase: DatabaseSync | undefined;
}
export const db = globalThis.interviewDatabase ??= new DatabaseSync(filename);
db.exec(`
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    created INTEGER NOT NULL,
    session TEXT NOT NULL,
    report TEXT,
    category_record TEXT
  );
  CREATE INDEX IF NOT EXISTS interviews_by_owner ON interviews(owner, created DESC);
`);
