import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { ensureStorageRoot, folderPath } from '../storage'
import { initSchema } from './schema'

let SQL: SqlJsStatic | null = null
let db: SqlJsDatabase | null = null
let dbPath: string = ''
let transactionDepth = 0

async function getSQL(): Promise<SqlJsStatic> {
  if (SQL) return SQL
  SQL = await initSqlJs()
  return SQL
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const root = ensureStorageRoot()
  dbPath = path.join(root, 'declaraidb.sqlite')
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
    initSchema(db)
    saveDb() // persist schema + seed data to disk immediately
  } catch (err: any) {
    console.error('[db] Schema initialization failed:', err.message)
    db.close(); db = null
    throw new Error(`数据库初始化失败: ${err.message}`)
  }

  return db
}

function saveDb() {
  if (!db || !dbPath) return
  if (transactionDepth > 0) return
  try {
    const data = db.export()
    fs.writeFileSync(dbPath, Buffer.from(data))
  } catch (err: any) {
    console.error('[db] Failed to save database:', err.message)
  }
}

export function closeDb() {
  if (db) { saveDb(); db.close(); db = null }
}

export function queryAll(sql: string, params: any[] = []): any[] {
  if (!db) throw new Error('数据库未初始化')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
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
  transactionDepth++
  try {
    db.run('BEGIN'); fn(); db.run('COMMIT'); saveDb()
  } catch (err) {
    try { db.run('ROLLBACK') } catch {}
    throw err
  } finally {
    transactionDepth--
  }
}

/** Get next sequence number for new declarations */
export function nextSequenceNo(): number {
  const row = queryOne('SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_no FROM declarations')
  return (row as any)?.next_no || 1
}

export { uuid, saveDb }
