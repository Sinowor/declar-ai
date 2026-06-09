import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import { v4 as uuid } from 'uuid'

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
})

function createDb(): SqlJsDatabase {
  const db = new SQL.Database()
  db.run('PRAGMA foreign_keys = ON')
  db.run(`CREATE TABLE knowledge_entries (
    id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
    hs_code TEXT, tags TEXT NOT NULL DEFAULT '[]', source_type TEXT NOT NULL DEFAULT 'manual',
    is_pinned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )`)
  db.run(`CREATE TABLE knowledge_files (
    id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (entry_id) REFERENCES knowledge_entries(id) ON DELETE CASCADE
  )`)
  db.run(`CREATE TABLE knowledge_tags (name TEXT PRIMARY KEY, color TEXT)`)
  for (const t of ['归类经验', '口岸须知', '操作流程', '客户备注', '法规政策']) {
    db.run('INSERT OR IGNORE INTO knowledge_tags (name) VALUES (?)', [t])
  }
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
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  let result: any = null
  if (stmt.step()) result = stmt.getAsObject()
  stmt.free()
  return result
}

function execute(db: SqlJsDatabase, sql: string, params: any[] = []): void {
  db.run(sql, params)
}

// ═══ Helpers matching IPC logic ═══

function knowledgeSave(db: SqlJsDatabase, entry: { id?: string; title: string; content: string; hs_code?: string; tags?: string; is_pinned?: number }): { success: boolean; id: string } {
  if (entry.id) {
    execute(db,
      'UPDATE knowledge_entries SET title=?, content=?, hs_code=?, tags=?, is_pinned=?, updated_at=datetime("now","localtime") WHERE id=?',
      [entry.title, entry.content, entry.hs_code || null, entry.tags || '[]', entry.is_pinned || 0, entry.id]
    )
    return { success: true, id: entry.id }
  } else {
    const id = uuid()
    execute(db,
      'INSERT INTO knowledge_entries (id, title, content, hs_code, tags, is_pinned) VALUES (?,?,?,?,?,?)',
      [id, entry.title, entry.content, entry.hs_code || null, entry.tags || '[]', entry.is_pinned || 0]
    )
    return { success: true, id }
  }
}

function knowledgeList(db: SqlJsDatabase, opts?: { tag?: string; search?: string; hs_code?: string }): any[] {
  let sql = 'SELECT e.id, e.title, e.hs_code, e.tags, e.is_pinned, e.source_type, e.created_at, e.updated_at, (SELECT COUNT(*) FROM knowledge_files WHERE entry_id = e.id) as file_count FROM knowledge_entries e WHERE 1=1'
  const params: any[] = []
  if (opts?.tag) {
    sql += ' AND EXISTS (SELECT 1 FROM json_each(e.tags) WHERE value = ?)'
    params.push(opts.tag)
  }
  if (opts?.search) {
    sql += ' AND (e.title LIKE ? OR e.content LIKE ?)'
    params.push(`%${opts.search}%`, `%${opts.search}%`)
  }
  sql += ' ORDER BY e.is_pinned DESC, e.updated_at DESC'
  return queryAll(db, sql, params)
}

function knowledgeRelated(db: SqlJsDatabase, hsCode: string): any[] {
  if (!hsCode) return []
  const cleaned = hsCode.replace(/[.\s]/g, '').substring(0, 6)
  return queryAll(db,
    'SELECT id, title, hs_code, tags FROM knowledge_entries WHERE hs_code LIKE ? ORDER BY updated_at DESC LIMIT 3',
    [`%${cleaned}%`]
  )
}

function knowledgeFileAdd(db: SqlJsDatabase, entryId: string, fileName: string, filePath: string, fileSize: number): any {
  const id = uuid()
  execute(db, 'INSERT INTO knowledge_files (id, entry_id, file_name, file_path, file_size) VALUES (?,?,?,?,?)',
    [id, entryId, fileName, filePath, fileSize])
  return { id, file_name: fileName, file_path: filePath, file_size: fileSize }
}

// ═══ Tests ═══

describe('Knowledge Base — Entry CRUD', () => {
  it('creates a new entry with auto-generated UUID', () => {
    const db = createDb()
    const res = knowledgeSave(db, { title: '测试笔记', content: '# Hello', tags: '["归类经验"]' })
    expect(res.success).toBe(true)
    expect(res.id).toBeTruthy()
    const entry = queryOne(db, 'SELECT * FROM knowledge_entries WHERE id = ?', [res.id])
    expect(entry.title).toBe('测试笔记')
    expect(entry.content).toBe('# Hello')
    expect(entry.tags).toBe('["归类经验"]')
    expect(entry.is_pinned).toBe(0)
    expect(entry.source_type).toBe('manual')
  })

  it('creates entry with all fields including hs_code', () => {
    const db = createDb()
    const res = knowledgeSave(db, { title: 'HS笔记', content: 'content', hs_code: '84798999', tags: '["法规政策"]', is_pinned: 1 })
    const entry = queryOne(db, 'SELECT * FROM knowledge_entries WHERE id = ?', [res.id])
    expect(entry.hs_code).toBe('84798999')
    expect(entry.is_pinned).toBe(1)
    expect(entry.tags).toBe('["法规政策"]')
  })

  it('updates an existing entry', () => {
    const db = createDb()
    const res = knowledgeSave(db, { title: '原始标题', content: 'old' })
    knowledgeSave(db, { id: res.id, title: '更新标题', content: 'new', tags: '["操作流程"]' })
    const entry = queryOne(db, 'SELECT * FROM knowledge_entries WHERE id = ?', [res.id])
    expect(entry.title).toBe('更新标题')
    expect(entry.content).toBe('new')
    expect(entry.tags).toBe('["操作流程"]')
  })

  it('deletes an entry', () => {
    const db = createDb()
    const res = knowledgeSave(db, { title: '待删除', content: '' })
    execute(db, 'DELETE FROM knowledge_entries WHERE id = ?', [res.id])
    const entry = queryOne(db, 'SELECT * FROM knowledge_entries WHERE id = ?', [res.id])
    expect(entry).toBeNull()
  })

  it('cascade-deletes files when entry is deleted', () => {
    const db = createDb()
    const res = knowledgeSave(db, { title: '有附件', content: '' })
    knowledgeFileAdd(db, res.id, 'test.pdf', '/tmp/test.pdf', 1024)
    knowledgeFileAdd(db, res.id, 'doc.xlsx', '/tmp/doc.xlsx', 2048)
    expect(queryAll(db, 'SELECT * FROM knowledge_files WHERE entry_id = ?', [res.id])).toHaveLength(2)
    execute(db, 'DELETE FROM knowledge_entries WHERE id = ?', [res.id])
    expect(queryAll(db, 'SELECT * FROM knowledge_files WHERE entry_id = ?', [res.id])).toHaveLength(0)
  })
})

describe('Knowledge Base — List & Filter', () => {
  it('lists all entries ordered by is_pinned DESC, updated_at DESC', () => {
    const db = createDb()
    knowledgeSave(db, { title: 'B', content: '' })
    knowledgeSave(db, { title: 'C', content: '', is_pinned: 1 })
    knowledgeSave(db, { title: 'A', content: '' })
    const list = knowledgeList(db)
    expect(list[0].title).toBe('C') // pinned first
    expect(list).toHaveLength(3)
  })

  it('includes file_count in list results', () => {
    const db = createDb()
    const res = knowledgeSave(db, { title: '附件测试', content: '' })
    knowledgeFileAdd(db, res.id, 'f1.pdf', '/tmp/f1.pdf', 100)
    knowledgeFileAdd(db, res.id, 'f2.pdf', '/tmp/f2.pdf', 200)
    const list = knowledgeList(db)
    expect(list[0].file_count).toBe(2)
  })

  it('filters by tag using json_each exact match', () => {
    const db = createDb()
    knowledgeSave(db, { title: '口岸笔记', content: '', tags: '["口岸须知"]' })
    knowledgeSave(db, { title: '归类笔记', content: '', tags: '["归类经验"]' })
    // Search for "口岸" should NOT match "口岸须知" (exact match via json_each)
    const portResults = knowledgeList(db, { tag: '口岸' })
    expect(portResults).toHaveLength(0)
    // Search for "口岸须知" should match exactly
    const noticeResults = knowledgeList(db, { tag: '口岸须知' })
    expect(noticeResults).toHaveLength(1)
    expect(noticeResults[0].title).toBe('口岸笔记')
  })

  it('filters by search query matching title or content', () => {
    const db = createDb()
    knowledgeSave(db, { title: '真空泵归类', content: '用于工业真空系统' })
    knowledgeSave(db, { title: 'LED灯泡', content: '家用照明设备' })
    knowledgeSave(db, { title: '其他', content: '真空泵相关配件' })
    const results = knowledgeList(db, { search: '真空泵' })
    expect(results).toHaveLength(2)
  })

  it('returns empty array when no entries match filter', () => {
    const db = createDb()
    knowledgeSave(db, { title: '测试', content: '' })
    const results = knowledgeList(db, { tag: '不存在的标签' })
    expect(results).toHaveLength(0)
  })
})

describe('Knowledge Base — Related Notes by HS Code', () => {
  it('finds related entries by HS code prefix match', () => {
    const db = createDb()
    knowledgeSave(db, { title: '真空泵归类', content: '', hs_code: '84141000', tags: '["归类经验"]' })
    knowledgeSave(db, { title: '压缩机归类', content: '', hs_code: '84143090', tags: '["归类经验"]' })
    knowledgeSave(db, { title: '无关笔记', content: '', hs_code: '90011000', tags: '[]' })
    const related = knowledgeRelated(db, '8414')
    expect(related).toHaveLength(2)
    expect(related.map((r: any) => r.title)).toContain('真空泵归类')
    expect(related.map((r: any) => r.title)).toContain('压缩机归类')
  })

  it('returns empty array when no HS code provided', () => {
    const db = createDb()
    expect(knowledgeRelated(db, '')).toEqual([])
  })

  it('limits to 3 results', () => {
    const db = createDb()
    for (let i = 0; i < 5; i++) {
      knowledgeSave(db, { title: `笔记${i}`, content: '', hs_code: '84798999' })
    }
    const related = knowledgeRelated(db, '84798999')
    expect(related).toHaveLength(3)
  })

  it('cleans dots and spaces from query HS code before matching', () => {
    const db = createDb()
    knowledgeSave(db, { title: '匹配笔记', content: '', hs_code: '84798999' })
    // Query with dots and spaces — should be cleaned to '847989' and match '84798999'
    const related = knowledgeRelated(db, '8479.89.99')
    expect(related).toHaveLength(1)
    expect(related[0].title).toBe('匹配笔记')
  })
})

describe('Knowledge Base — Tag Management', () => {
  it('lists all tags from knowledge_tags table', () => {
    const db = createDb()
    const tags = queryAll(db, 'SELECT * FROM knowledge_tags ORDER BY name')
    expect(tags).toHaveLength(5)
    expect(tags.map((t: any) => t.name)).toContain('归类经验')
    expect(tags.map((t: any) => t.name)).toContain('法规政策')
  })

  it('adds a new tag with INSERT OR IGNORE', () => {
    const db = createDb()
    execute(db, 'INSERT OR IGNORE INTO knowledge_tags (name) VALUES (?)', ['新标签'])
    const tags = queryAll(db, 'SELECT * FROM knowledge_tags ORDER BY name')
    expect(tags).toHaveLength(6)
    expect(tags.map((t: any) => t.name)).toContain('新标签')
  })

  it('ignores duplicate tag names on add', () => {
    const db = createDb()
    execute(db, 'INSERT OR IGNORE INTO knowledge_tags (name) VALUES (?)', ['归类经验'])
    const tags = queryAll(db, 'SELECT * FROM knowledge_tags ORDER BY name')
    expect(tags).toHaveLength(5) // still 5
  })

  it('deletes a tag by name', () => {
    const db = createDb()
    execute(db, 'DELETE FROM knowledge_tags WHERE name = ?', ['法规政策'])
    const tags = queryAll(db, 'SELECT * FROM knowledge_tags ORDER BY name')
    expect(tags).toHaveLength(4)
    expect(tags.map((t: any) => t.name)).not.toContain('法规政策')
  })
})

describe('Knowledge Base — File Management', () => {
  it('adds a file to an entry', () => {
    const db = createDb()
    const entry = knowledgeSave(db, { title: '附件测试', content: '' })
    knowledgeFileAdd(db, entry.id, 'invoice.pdf', '/tmp/invoice.pdf', 51200)
    const files = queryAll(db, 'SELECT * FROM knowledge_files WHERE entry_id = ?', [entry.id])
    expect(files).toHaveLength(1)
    expect(files[0].file_name).toBe('invoice.pdf')
    expect(files[0].file_path).toBe('/tmp/invoice.pdf')
    expect(files[0].file_size).toBe(51200)
  })

  it('lists files for an entry ordered by created_at', () => {
    const db = createDb()
    const entry = knowledgeSave(db, { title: '多附件', content: '' })
    knowledgeFileAdd(db, entry.id, 'a.pdf', '/tmp/a.pdf', 100)
    knowledgeFileAdd(db, entry.id, 'b.pdf', '/tmp/b.pdf', 200)
    const files = queryAll(db, 'SELECT * FROM knowledge_files WHERE entry_id = ? ORDER BY created_at', [entry.id])
    expect(files).toHaveLength(2)
    expect(files[0].file_name).toBe('a.pdf')
    expect(files[1].file_name).toBe('b.pdf')
  })

  it('deletes a file by id', () => {
    const db = createDb()
    const entry = knowledgeSave(db, { title: '删附件', content: '' })
    const file = knowledgeFileAdd(db, entry.id, 'temp.pdf', '/tmp/temp.pdf', 500)
    execute(db, 'DELETE FROM knowledge_files WHERE id = ?', [file.id])
    const files = queryAll(db, 'SELECT * FROM knowledge_files WHERE entry_id = ?', [entry.id])
    expect(files).toHaveLength(0)
  })

  it('returns empty array for entry with no files', () => {
    const db = createDb()
    const entry = knowledgeSave(db, { title: '无附件', content: '' })
    const files = queryAll(db, 'SELECT * FROM knowledge_files WHERE entry_id = ?', [entry.id])
    expect(files).toHaveLength(0)
  })
})

describe('Knowledge Base — Search', () => {
  it('searches title and content with LIKE', () => {
    const db = createDb()
    knowledgeSave(db, { title: '进口关税', content: '关于进口关税的计算方法' })
    knowledgeSave(db, { title: '出口退税', content: '出口退税政策解读' })
    knowledgeSave(db, { title: '物流指南', content: '国际物流运输方案' })
    const results = queryAll(db,
      'SELECT id, title FROM knowledge_entries WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 20',
      ['%关税%', '%关税%']
    )
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('进口关税')
  })

  it('returns empty when no match found', () => {
    const db = createDb()
    knowledgeSave(db, { title: '测试', content: '' })
    const results = queryAll(db,
      'SELECT id, title FROM knowledge_entries WHERE title LIKE ? OR content LIKE ?',
      ['%不存在的%', '%不存在的%']
    )
    expect(results).toHaveLength(0)
  })
})
