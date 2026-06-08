import { ipcMain } from 'electron'
import { queryOne, queryAll, execute, uuid } from '../db'

export function registerKnowledgeIpc() {
  // List entries with optional tag/search filter
  ipcMain.handle('knowledge:list', async (_event, opts?: { tag?: string; search?: string; hs_code?: string }) => {
    let sql = 'SELECT id, title, hs_code, tags, is_pinned, source_type, created_at, updated_at FROM knowledge_entries WHERE 1=1'
    const params: any[] = []
    if (opts?.tag) {
      sql += ' AND tags LIKE ?'
      params.push(`%"${opts.tag}"%`)
    }
    if (opts?.search) {
      sql += ' AND (title LIKE ? OR content LIKE ?)'
      params.push(`%${opts.search}%`, `%${opts.search}%`)
    }
    if (opts?.hs_code) {
      sql += ' AND hs_code LIKE ?'
      params.push(`%${opts.hs_code}%`)
    }
    sql += ' ORDER BY is_pinned DESC, updated_at DESC'
    return queryAll(sql, params)
  })

  // Get single entry
  ipcMain.handle('knowledge:get', async (_event, id: string) => {
    return queryOne('SELECT * FROM knowledge_entries WHERE id = ?', [id])
  })

  // Save (create or update)
  ipcMain.handle('knowledge:save', async (_event, entry: { id?: string; title: string; content: string; hs_code?: string; tags?: string; is_pinned?: number }) => {
    if (entry.id) {
      execute(
        'UPDATE knowledge_entries SET title=?, content=?, hs_code=?, tags=?, is_pinned=?, updated_at=datetime("now","localtime") WHERE id=?',
        [entry.title, entry.content, entry.hs_code || null, entry.tags || '[]', entry.is_pinned || 0, entry.id]
      )
      return { success: true, id: entry.id }
    } else {
      const id = uuid()
      execute(
        'INSERT INTO knowledge_entries (id, title, content, hs_code, tags, is_pinned) VALUES (?,?,?,?,?,?)',
        [id, entry.title, entry.content, entry.hs_code || null, entry.tags || '[]', entry.is_pinned || 0]
      )
      return { success: true, id }
    }
  })

  // Delete
  ipcMain.handle('knowledge:delete', async (_event, id: string) => {
    execute('DELETE FROM knowledge_entries WHERE id = ?', [id])
    return { success: true }
  })

  // Tags
  ipcMain.handle('knowledge:tags', async () => {
    return queryAll('SELECT * FROM knowledge_tags ORDER BY name')
  })

  // Search (full text in title + content)
  ipcMain.handle('knowledge:search', async (_event, q: string) => {
    return queryAll(
      'SELECT id, title, hs_code, tags, updated_at FROM knowledge_entries WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC LIMIT 20',
      [`%${q}%`, `%${q}%`]
    )
  })

  // Get related entries by HS code
  ipcMain.handle('knowledge:related', async (_event, hsCode: string) => {
    if (!hsCode) return []
    const cleaned = hsCode.replace(/[.\s]/g, '').substring(0, 6)
    return queryAll(
      'SELECT id, title, hs_code, tags FROM knowledge_entries WHERE hs_code LIKE ? ORDER BY updated_at DESC LIMIT 3',
      [`%${cleaned}%`]
    )
  })
}
