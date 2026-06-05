import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
})

function createFreshDb(): SqlJsDatabase {
  const db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  return db
}

function createOldSchema(db: SqlJsDatabase) {
  // Create the table WITHOUT the new columns (simulating pre-migration state)
  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_files (
      id TEXT PRIMARY KEY,
      declaration_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'unknown',
      file_size INTEGER NOT NULL DEFAULT 0,
      extracted_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    )
  `)
}

function runMigration(db: SqlJsDatabase) {
  // Same migration logic from db/index.ts
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
}

describe('DB Migration — declaration_files new columns', () => {
  it('adds new columns on existing table with data preserved', () => {
    const db = createFreshDb()
    createOldSchema(db)

    // Insert a row simulating pre-migration data
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['file-1', 'decl-1', '发票.pdf', '/path/to/发票.pdf', 'pdf', 1024]
    )

    runMigration(db)

    // After migration, new columns should exist with defaults
    const rows = db.exec('SELECT * FROM declaration_files')
    const cols = rows[0].columns
    const data = rows[0].values[0]

    expect(cols).toContain('category')
    expect(cols).toContain('tags')
    expect(cols).toContain('purpose')
    expect(cols).toContain('output_type')

    const catIdx = cols.indexOf('category')
    const tagIdx = cols.indexOf('tags')
    const purpIdx = cols.indexOf('purpose')
    const outIdx = cols.indexOf('output_type')

    expect(data[catIdx]).toBe('uploaded')
    expect(data[tagIdx]).toBe('["其他"]')
    expect(data[purpIdx]).toBeNull()
    expect(data[outIdx]).toBeNull()

    // Original data preserved
    const nameIdx = cols.indexOf('file_name')
    expect(data[nameIdx]).toBe('发票.pdf')
  })

  it('is idempotent — running twice does not error', () => {
    const db = createFreshDb()
    createOldSchema(db)
    runMigration(db)
    // Second run should not throw
    expect(() => runMigration(db)).not.toThrow()
  })

  it('works on fresh install (columns created with table)', () => {
    // Simulate fresh install where table already has new columns
    const db = createFreshDb()
    db.run(`
      CREATE TABLE declaration_files (
        id TEXT PRIMARY KEY,
        declaration_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL DEFAULT 'unknown',
        file_size INTEGER NOT NULL DEFAULT 0,
        extracted_text TEXT,
        category TEXT NOT NULL DEFAULT 'uploaded',
        tags TEXT DEFAULT '["其他"]',
        purpose TEXT,
        output_type TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `)

    // Migration should be a no-op
    expect(() => runMigration(db)).not.toThrow()

    // Columns should still be there
    const cols = db.exec("PRAGMA table_info('declaration_files')")[0]
    const colNames = cols.values.map((r: any) => r[1])
    expect(colNames).toContain('category')
    expect(colNames).toContain('tags')
    expect(colNames).toContain('purpose')
    expect(colNames).toContain('output_type')
  })
})
