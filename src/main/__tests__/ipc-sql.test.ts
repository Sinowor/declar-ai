import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
})

function createDb(): SqlJsDatabase {
  const db = new SQL.Database()
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
  return db
}

function queryAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

function queryOne(db: SqlJsDatabase, sql: string, params: any[] = []): any | null {
  const rows = queryAll(db, sql, params)
  return rows.length > 0 ? rows[0] : null
}

describe('file:list-all IPC SQL logic', () => {
  it('returns files ordered by category then created_at', () => {
    const db = createDb()

    // Insert uploaded files
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["发票"]', '2026-06-01 10:00:00')`,
      ['u1', 'decl-1', '发票.pdf', '/path/发票.pdf', 'pdf', 100, ]
    )
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["箱单"]', '2026-06-01 09:00:00')`,
      ['u2', 'decl-1', '箱单.pdf', '/path/箱单.pdf', 'pdf', 200, ]
    )
    // Insert generated file
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, purpose, output_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'generated', 'AI 提取的结构化数据', 'extraction_json', '2026-06-02 12:00:00')`,
      ['g1', 'decl-1', '提取结果.json', '/path/extraction.json', 'json', 300, ]
    )

    const results = queryAll(
      db,
      'SELECT id, declaration_id, file_name, file_path, file_type, file_size, category, tags, purpose, output_type, created_at FROM declaration_files WHERE declaration_id = ? ORDER BY category, created_at',
      ['decl-1']
    )

    expect(results.length).toBe(3)
    // Generated should come before uploaded (alphabetically 'g' < 'u')
    expect(results[0].category).toBe('generated')
    expect(results[1].category).toBe('uploaded')
    expect(results[2].category).toBe('uploaded')
    // Within uploaded, ordered by created_at
    expect(results[1].file_name).toBe('箱单.pdf') // earlier
    expect(results[2].file_name).toBe('发票.pdf') // later
  })

  it('returns empty array when no files exist', () => {
    const db = createDb()
    const results = queryAll(
      db,
      'SELECT id, declaration_id, file_name, file_path, file_type, file_size, category, tags, purpose, output_type, created_at FROM declaration_files WHERE declaration_id = ? ORDER BY category, created_at',
      ['nonexistent']
    )
    expect(results).toEqual([])
  })

  it('filters by declaration_id correctly', () => {
    const db = createDb()
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["发票"]')`,
      ['f1', 'decl-A', 'a.pdf', '/a.pdf', 'pdf', 100, ]
    )
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["箱单"]')`,
      ['f2', 'decl-B', 'b.pdf', '/b.pdf', 'pdf', 100, ]
    )

    const resultsA = queryAll(db, 'SELECT id FROM declaration_files WHERE declaration_id = ?', ['decl-A'])
    expect(resultsA.length).toBe(1)
    expect(resultsA[0].id).toBe('f1')
  })
})

describe('file:update-tags IPC SQL logic', () => {
  it('updates tags JSON string in database', () => {
    const db = createDb()
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["发票"]')`,
      ['f1', 'decl-1', '发票.pdf', '/path/发票.pdf', 'pdf', 100, ]
    )

    // Simulate IPC handler
    db.run('UPDATE declaration_files SET tags = ? WHERE id = ?', ['["发票","箱单"]', 'f1'])

    const updated = queryOne(db, 'SELECT tags FROM declaration_files WHERE id = ?', ['f1']) as any
    expect(updated.tags).toBe('["发票","箱单"]')
  })

  it('does not affect other files when updating one', () => {
    const db = createDb()
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["发票"]')`,
      ['f1', 'decl-1', '发票.pdf', '/path/发票.pdf', 'pdf', 100, ]
    )
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["箱单"]')`,
      ['f2', 'decl-1', '箱单.pdf', '/path/箱单.pdf', 'pdf', 100, ]
    )

    db.run('UPDATE declaration_files SET tags = ? WHERE id = ?', ['["合同"]', 'f1'])

    const f1 = queryOne(db, 'SELECT tags FROM declaration_files WHERE id = ?', ['f1']) as any
    const f2 = queryOne(db, 'SELECT tags FROM declaration_files WHERE id = ?', ['f2']) as any
    expect(f1.tags).toBe('["合同"]')
    expect(f2.tags).toBe('["箱单"]')
  })
})

describe('file:open / file:reveal SQL fetch', () => {
  it('fetches file_path by id for open', () => {
    const db = createDb()
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, 'uploaded', '["发票"]')`,
      ['f1', 'decl-1', '发票.pdf', '/Users/data/files/发票.pdf', 'pdf', 100, ]
    )

    const file = queryOne(db, 'SELECT file_path FROM declaration_files WHERE id = ?', ['f1']) as any
    expect(file.file_path).toBe('/Users/data/files/发票.pdf')
  })

  it('returns null for nonexistent file id', () => {
    const db = createDb()
    const file = queryOne(db, 'SELECT file_path FROM declaration_files WHERE id = ?', ['nonexistent'])
    expect(file).toBeNull()
  })
})
