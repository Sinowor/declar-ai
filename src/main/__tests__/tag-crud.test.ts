import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'

let SQL: SqlJsStatic

beforeAll(async () => {
  SQL = await initSqlJs()
})

// ── parseTags (extracted from AttachmentPanel.tsx logic) ──
function parseTags(raw: string | null): string[] {
  if (!raw) return ['其他']
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) && arr.length > 0 ? arr : ['其他']
  } catch {
    return ['其他']
  }
}

// ── Tag validation helpers ──
const TAG_OPTIONS = ['箱单', '发票', '合同', '提单', '运单', '原产地证', '报关单', '其他']

function filterValidTags(tags: string[]): string[] {
  return tags.filter((t: string) => TAG_OPTIONS.includes(t)).slice(0, 2)
}

function canAddTag(currentTags: string[], newTag: string): boolean {
  return currentTags.length < 2 && !currentTags.includes(newTag)
}

function canRemoveTag(currentTags: string[]): boolean {
  return currentTags.length > 1
}

// ── DB tag operations ──
function createTestDb(): SqlJsDatabase {
  const db = new SQL.Database()
  db.run(`
    CREATE TABLE IF NOT EXISTS declaration_files (
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
  db.run(
    `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['file-1', 'decl-1', '发票.pdf', '/path/发票.pdf', 'pdf', 2048, 'uploaded', '["发票"]']
  )
  return db
}

describe('parseTags', () => {
  it('returns ["其他"] for null input', () => {
    expect(parseTags(null)).toEqual(['其他'])
  })

  it('returns ["其他"] for empty string', () => {
    expect(parseTags('')).toEqual(['其他'])
  })

  it('returns parsed array for valid JSON', () => {
    expect(parseTags('["发票","箱单"]')).toEqual(['发票', '箱单'])
  })

  it('returns ["其他"] for malformed JSON', () => {
    expect(parseTags('{not:json}')).toEqual(['其他'])
  })

  it('returns ["其他"] for JSON array that is not an array', () => {
    expect(parseTags('{"tags":"nope"}')).toEqual(['其他'])
  })

  it('returns ["其他"] for empty JSON array', () => {
    expect(parseTags('[]')).toEqual(['其他'])
  })

  it('handles single tag', () => {
    expect(parseTags('["发票"]')).toEqual(['发票'])
  })
})

describe('Tag validation', () => {
  it('filters unknown tags and caps at 2', () => {
    const result = filterValidTags(['箱单', '发票', '合同', 'unknown_tag'])
    expect(result).toEqual(['箱单', '发票'])
    expect(result.length).toBe(2)
  })

  it('allows unknown tags through (not filtered)', () => {
    // The AI tagger does filter via TAG_OPTIONS.includes, but user custom tags don't
    // parseTags doesn't filter, it just parses. The filter happens in tagFileWithAI only.
    expect(parseTags('["自定义标签"]')).toEqual(['自定义标签'])
  })

  it('can add tag when under limit and not duplicate', () => {
    expect(canAddTag(['发票'], '箱单')).toBe(true)
    expect(canAddTag(['发票'], '发票')).toBe(false)
    expect(canAddTag(['发票', '箱单'], '合同')).toBe(false) // at max
  })

  it('can remove tag when more than 1', () => {
    expect(canRemoveTag(['发票', '箱单'])).toBe(true)
    expect(canRemoveTag(['发票'])).toBe(false)
  })
})

describe('DB tag update operations', () => {
  it('updates tags in database', () => {
    const db = createTestDb()

    // Read current tags
    let row = db.exec('SELECT tags FROM declaration_files WHERE id = ?', ['file-1'])
    expect(parseTags(row[0].values[0][0] as string)).toEqual(['发票'])

    // Update tags
    db.run('UPDATE declaration_files SET tags = ? WHERE id = ?', ['["发票","箱单"]', 'file-1'])

    // Verify
    row = db.exec('SELECT tags FROM declaration_files WHERE id = ?', ['file-1'])
    expect(parseTags(row[0].values[0][0] as string)).toEqual(['发票', '箱单'])
  })

  it('persists tag updates (survives re-read)', () => {
    const db = createTestDb()

    db.run('UPDATE declaration_files SET tags = ? WHERE id = ?', ['["合同"]', 'file-1'])

    // Read back after update
    const row = db.exec('SELECT tags FROM declaration_files WHERE id = ?', ['file-1'])
    expect(parseTags(row[0].values[0][0] as string)).toEqual(['合同'])
  })

  it('does not remove tags on concurrent updates (last write wins)', () => {
    const db = createTestDb()
    // This test documents the behavior — SQLite last-write-wins is expected
    db.run('UPDATE declaration_files SET tags = ? WHERE id = ?', ['["发票","箱单"]', 'file-1'])
    db.run('UPDATE declaration_files SET tags = ? WHERE id = ?', ['["提单"]', 'file-1'])

    const row = db.exec('SELECT tags FROM declaration_files WHERE id = ?', ['file-1'])
    // Last write wins — 提单
    expect(parseTags(row[0].values[0][0] as string)).toEqual(['提单'])
  })

  it('generated files have null tags (display as purpose instead)', () => {
    const db = createTestDb()
    db.run(
      `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags, purpose, output_type)
       VALUES (?, ?, ?, ?, ?, ?, 'generated', NULL, ?, ?)`,
      ['gen-1', 'decl-1', '提取结果.json', '/path/extraction.json', 'json', 512, 'AI 提取的结构化数据', 'extraction_json']
    )

    const row = db.exec('SELECT tags, purpose FROM declaration_files WHERE id = ?', ['gen-1'])
    expect(row[0].values[0][0]).toBeNull()
    expect(row[0].values[0][1]).toBe('AI 提取的结构化数据')
  })
})

describe('AI tagger output validation', () => {
  it('accepts valid AI tag response', () => {
    const aiResponse = '{"tags":["箱单","发票"]}'
    const parsed = JSON.parse(aiResponse)
    expect(filterValidTags(parsed.tags)).toEqual(['箱单', '发票'])
  })

  it('rejects AI response with no tags array', () => {
    const aiResponse = '{"wrong_field":"nope"}'
    const parsed = JSON.parse(aiResponse)
    expect(Array.isArray(parsed.tags)).toBe(false)
  })

  it('falls back to ["其他"] when AI returns invalid tags', () => {
    const fallback = () => {
      try {
        const content = 'not even json'
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
          return parsed.tags.filter((t: string) => TAG_OPTIONS.includes(t)).slice(0, 2)
        }
        throw new Error('Invalid')
      } catch {
        return ['其他']
      }
    }
    expect(fallback()).toEqual(['其他'])
  })
})
