import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
})

function createDb(): SqlJsDatabase {
  const db = new SQL.Database()
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
  return db
}

function queryOne(db: SqlJsDatabase, sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results.length > 0 ? results[0] : null
}

function queryAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const results: any[] = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}

describe('customs_offices CRUD', () => {
  it('inserts and reads customs offices', () => {
    const db = createDb()

    db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', ['0201', '天津海关', '天津关区'])

    const result = queryOne(db, 'SELECT * FROM customs_offices WHERE code = ?', ['0201']) as any
    expect(result.name).toBe('天津海关')
    expect(result.parent_name).toBe('天津关区')
  })

  it('searches by code, name, or parent', () => {
    const db = createDb()
    db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', ['0201', '天津海关', '天津关区'])
    db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', ['0601', '满洲里海关', '满洲里关区'])

    const byCode = queryAll(db, "SELECT * FROM customs_offices WHERE code LIKE ?", ['%02%'])
    expect(byCode.length).toBe(1)

    const byName = queryAll(db, "SELECT * FROM customs_offices WHERE name LIKE ?", ['%海%'])
    expect(byName.length).toBe(2)
  })

  it('deletes by code', () => {
    const db = createDb()
    db.run('INSERT INTO customs_offices (code, name) VALUES (?, ?)', ['0201', '天津海关'])
    db.run('DELETE FROM customs_offices WHERE code = ?', ['0201'])

    const result = queryOne(db, 'SELECT * FROM customs_offices WHERE code = ?', ['0201'])
    expect(result).toBeNull()
  })

  it('upserts (update on duplicate code)', () => {
    const db = createDb()
    db.run('INSERT INTO customs_offices (code, name) VALUES (?, ?)', ['0201', '天津海关'])
    // Simulate upsert: check, then insert/update
    const existing = queryOne(db, 'SELECT code FROM customs_offices WHERE code = ?', ['0201'])
    if (existing) {
      db.run('UPDATE customs_offices SET name = ? WHERE code = ?', ['天津海关（更新）', '0201'])
    }

    const result = queryOne(db, 'SELECT name FROM customs_offices WHERE code = ?', ['0201']) as any
    expect(result.name).toBe('天津海关（更新）')
  })

  it('seeds data only when table is empty', () => {
    const db = createDb()
    const count = queryOne(db, 'SELECT COUNT(*) as cnt FROM customs_offices') as any
    expect(count.cnt).toBe(0)

    // Simulate seed: insert only when empty
    if (count.cnt === 0) {
      db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', ['0200', '天津关区', '天津海关'])
      db.run('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', ['0600', '满洲里关区', '满洲里海关'])
    }

    const afterSeed = queryOne(db, 'SELECT COUNT(*) as cnt FROM customs_offices') as any
    expect(afterSeed.cnt).toBe(2)

    // Second "run" should not add duplicates
    const count2 = queryOne(db, 'SELECT COUNT(*) as cnt FROM customs_offices') as any
    if (count2.cnt === 0) {
      // This block won't execute — data already seeded
      db.run('INSERT INTO customs_offices (code, name) VALUES (?, ?)', ['0200', 'DUPLICATE'])
    }
    const finalCount = queryOne(db, 'SELECT COUNT(*) as cnt FROM customs_offices') as any
    expect(finalCount.cnt).toBe(2)
  })
})

describe('declaration_enterprises CRUD', () => {
  it('inserts and reads enterprise', () => {
    const db = createDb()
    db.run(
      'INSERT INTO declaration_enterprises (id, credit_code, customs_code, name, short_name) VALUES (?, ?, ?, ?, ?)',
      ['e1', '91110000MA12345678', '1234567890', '天津报关有限公司', '天津报关']
    )

    const result = queryOne(db, 'SELECT * FROM declaration_enterprises WHERE id = ?', ['e1']) as any
    expect(result.name).toBe('天津报关有限公司')
    expect(result.credit_code).toBe('91110000MA12345678')
    expect(result.customs_code).toBe('1234567890')
    expect(result.short_name).toBe('天津报关')
  })

  it('sets default enterprise (only one is_default)', () => {
    const db = createDb()
    db.run("INSERT INTO declaration_enterprises (id, name, is_default) VALUES ('e1', '企业A', 0)")
    db.run("INSERT INTO declaration_enterprises (id, name, is_default) VALUES ('e2', '企业B', 0)")

    // Set e1 as default
    db.run('UPDATE declaration_enterprises SET is_default = 0')
    db.run('UPDATE declaration_enterprises SET is_default = 1 WHERE id = ?', ['e1'])

    const def = queryOne(db, 'SELECT * FROM declaration_enterprises WHERE is_default = 1') as any
    expect(def.id).toBe('e1')
  })

  it('returns null for get-default when no enterprises', () => {
    const db = createDb()
    const result = queryOne(db, 'SELECT * FROM declaration_enterprises WHERE is_default = 1')
    expect(result).toBeNull()
  })

  it('deletes enterprise by id', () => {
    const db = createDb()
    db.run("INSERT INTO declaration_enterprises (id, name) VALUES ('e1', '企业A')")
    db.run('DELETE FROM declaration_enterprises WHERE id = ?', ['e1'])

    const result = queryOne(db, 'SELECT * FROM declaration_enterprises WHERE id = ?', ['e1'])
    expect(result).toBeNull()
  })
})
