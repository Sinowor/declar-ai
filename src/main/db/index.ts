import initSqlJs, { Database as SqlJsDatabase, Statement, SqlJsStatic } from 'sql.js'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'

let SQL: SqlJsStatic | null = null
let db: SqlJsDatabase | null = null
let dbPath: string = ''

async function getSQL(): Promise<SqlJsStatic> {
  if (SQL) return SQL
  SQL = await initSqlJs()
  return SQL
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  dbPath = path.join(app.getPath('userData'), 'declarai.db')
  const sql = await getSQL()

  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath)
      db = new sql.Database(buffer)
    } else {
      db = new sql.Database()
    }
  } catch (err: any) {
    console.error(`[db] Failed to open database at ${dbPath}:`, err.message)
    throw new Error(`无法打开数据库: ${err.message}`)
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')

  try {
    initSchema()
  } catch (err: any) {
    console.error('[db] Schema initialization failed:', err.message)
    db.close()
    db = null
    throw new Error(`数据库初始化失败: ${err.message}`)
  }

  return db
}

function initSchema() {
  if (!db) throw new Error('数据库未初始化')

  db.run(`
    CREATE TABLE IF NOT EXISTS declarations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'transit_transport',
      status TEXT NOT NULL DEFAULT 'draft',
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
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
    )
  `)

  db.run(`
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
    )
  `)

  db.run(`
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
    )
  `)

  db.run('CREATE INDEX IF NOT EXISTS idx_cargo_details_decl ON cargo_details(declaration_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_files_decl ON declaration_files(declaration_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_decl ON ai_conversations(declaration_id)')

  saveDb()
}

function saveDb() {
  if (!db || !dbPath) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  } catch (err: any) {
    console.error('[db] Failed to save database:', err.message)
  }
}

export function closeDb() {
  if (db) {
    saveDb()
    db.close()
    db = null
  }
}

// sql.js wrapper: prepare, bind, get all rows
export function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('数据库未初始化')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params)
  return rows.length > 0 ? rows[0] : null
}

export function execute(sql: string, params: any[] = []): void {
  if (!db) throw new Error('数据库未初始化')
  db.run(sql, params)
  saveDb()
}

export function transaction(fn: () => void): void {
  if (!db) throw new Error('数据库未初始化')
  execute('BEGIN')
  try {
    fn()
    execute('COMMIT')
  } catch (err) {
    execute('ROLLBACK')
    throw err
  }
}

export { uuid, saveDb }
