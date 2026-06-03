import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'declarai.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  initSchema()
  return db
}

function initSchema() {
  if (!db) return

  db.exec(`
    CREATE TABLE IF NOT EXISTS declarations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'transit_transport',
      status TEXT NOT NULL DEFAULT 'draft',
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS cargo_details (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      domestic_transport_tool_name TEXT,
      bill_of_lading_number TEXT,
      container_number TEXT,
      cargo_name TEXT,
      pieces INTEGER NOT NULL DEFAULT 0,
      weight REAL NOT NULL DEFAULT 0,
      customs_lock_number TEXT,
      quantity INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS declaration_files (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ai','user')),
      field_path TEXT,
      question TEXT,
      answer TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','resolved','dismissed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cargo_details_decl ON cargo_details(declaration_id);
    CREATE INDEX IF NOT EXISTS idx_files_decl ON declaration_files(declaration_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_decl ON ai_conversations(declaration_id);
  `)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}

export { uuid }
