import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { ensureStorageRoot, folderPath } from '../storage'

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
    initSchema()
  } catch (err: any) {
    console.error('[db] Schema initialization failed:', err.message)
    db.close(); db = null
    throw new Error(`数据库初始化失败: ${err.message}`)
  }

  return db
}

function initSchema() {
  if (!db) throw new Error('数据库未初始化')

  db.run(`
    CREATE TABLE IF NOT EXISTS declarations (
      id TEXT PRIMARY KEY,
      sequence_no INTEGER UNIQUE NOT NULL,
      display_name TEXT NOT NULL DEFAULT '(未命名)',
      status TEXT NOT NULL DEFAULT 'draft',
      type TEXT,
      folder_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      declaration_id TEXT NOT NULL,
      type_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (declaration_id) REFERENCES declarations(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_files (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'unknown',
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

  db.run('CREATE INDEX IF NOT EXISTS idx_outputs_decl ON declaration_outputs(declaration_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_files_decl ON declaration_files(declaration_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_decl ON ai_conversations(declaration_id)')

  // ═══ Migrations ═══
  // v1.1: attachment management — add category, tags, purpose, output_type to declaration_files
  const fileCols = db.exec("PRAGMA table_info('declaration_files')")
  if (fileCols.length > 0) {
    const existingCols = new Set(fileCols[0].values.map((r: any) => r[1]))
    if (!existingCols.has('category')) {
      db.run("ALTER TABLE declaration_files ADD COLUMN category TEXT NOT NULL DEFAULT 'uploaded'")
    }
    if (!existingCols.has('tags')) {
      db.run("ALTER TABLE declaration_files ADD COLUMN tags TEXT DEFAULT '[\"其他\"]'")
    }
    if (!existingCols.has('purpose')) {
      db.run('ALTER TABLE declaration_files ADD COLUMN purpose TEXT')
    }
    if (!existingCols.has('output_type')) {
      db.run('ALTER TABLE declaration_files ADD COLUMN output_type TEXT')
    }
  }

  // ═══ v1.2: transit declaration — customs offices + enterprises + templates ═══
  db.run(`
    CREATE TABLE IF NOT EXISTS customs_offices (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_enterprises (
      id TEXT PRIMARY KEY,
      credit_code TEXT,
      customs_code TEXT,
      name TEXT NOT NULL,
      short_name TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type_key TEXT NOT NULL,
      template_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)

  // Seed customs offices if empty
  const customsCount = queryOne('SELECT COUNT(*) as cnt FROM customs_offices') as any
  if (customsCount && customsCount.cnt === 0) {
    const seedOffices = [
      ['0200', '天津关区', '天津海关'],
      ['0201', '天津海关', '天津关区'],
      ['0202', '新港海关', '天津关区'],
      ['0203', '津开发区海关', '天津关区'],
      ['0204', '东港海关', '天津关区'],
      ['0205', '津机场海关', '天津关区'],
      ['0206', '津保税区海关', '天津关区'],
      ['0207', '蓟县海关', '天津关区'],
      ['0208', '津关税处', '天津关区'],
      ['0400', '石家庄关区', '石家庄海关'],
      ['0401', '石家庄海关', '石家庄关区'],
      ['0500', '太原海关', '太原海关'],
      ['0600', '满洲里关区', '满洲里海关'],
      ['0601', '满洲里海关', '满洲里关区'],
      ['0602', '海拉尔海关', '满洲里关区'],
      ['0603', '额尔古纳海关', '满洲里关区'],
      ['0604', '满十八里海关', '满洲里关区'],
      ['0605', '满赤峰海关', '满洲里关区'],
      ['0700', '呼和浩特关区', '呼和浩特海关'],
      ['0701', '呼和浩特海关', '呼和浩特关区'],
      ['0702', '二连海关', '呼和浩特关区'],
      ['0703', '包头海关', '呼和浩特关区'],
      ['0800', '沈阳关区', '沈阳海关'],
      ['0801', '沈阳海关', '沈阳关区'],
      ['0900', '大连关区', '大连海关'],
      ['0901', '大连海关', '大连关区'],
      ['1500', '长春关区', '长春海关'],
      ['1900', '哈尔滨关区', '哈尔滨海关'],
      ['2200', '上海关区', '上海海关'],
      ['2201', '上海海关', '上海关区'],
      ['2300', '南京关区', '南京海关'],
      ['2900', '杭州关区', '杭州海关'],
      ['3100', '宁波关区', '宁波海关'],
      ['3700', '厦门关区', '厦门海关'],
      ['4000', '南昌关区', '南昌海关'],
      ['4200', '青岛关区', '青岛海关'],
      ['4600', '郑州关区', '郑州海关'],
      ['4700', '武汉关区', '武汉海关'],
      ['4900', '长沙关区', '长沙海关'],
      ['5100', '广州关区', '广州海关'],
      ['5200', '黄埔关区', '黄埔海关'],
      ['5300', '深圳关区', '深圳海关'],
      ['5700', '拱北关区', '拱北海关'],
      ['6000', '汕头关区', '汕头海关'],
      ['6400', '海口关区', '海口海关'],
      ['6700', '湛江关区', '湛江海关'],
      ['6800', '江门关区', '江门海关'],
      ['7200', '南宁关区', '南宁海关'],
      ['7900', '成都关区', '成都海关'],
      ['8000', '重庆关区', '重庆海关'],
      ['8300', '贵阳关区', '贵阳海关'],
      ['8600', '昆明关区', '昆明海关'],
      ['8800', '拉萨关区', '拉萨海关'],
      ['9000', '西安关区', '西安海关'],
      ['9400', '乌鲁木齐关区', '乌鲁木齐海关'],
      ['9401', '乌鲁木齐海关', '乌鲁木齐关区'],
      ['9402', '阿拉山口海关', '乌鲁木齐关区'],
      ['9403', '霍尔果斯海关', '乌鲁木齐关区'],
      ['9404', '喀什海关', '乌鲁木齐关区'],
      ['9500', '兰州关区', '兰州海关'],
      ['9600', '西宁关区', '西宁海关'],
      ['9900', '银川关区', '银川海关'],
    ]
    for (const [code, name, parent] of seedOffices) {
      db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', [code, name, parent])
    }
  }

  saveDb()
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
