import { ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { queryOne, queryAll, execute, uuid } from '../db'
import { getStorageRoot } from '../storage'

function kbFilesDir(): string {
  const dir = path.join(getStorageRoot(), 'knowledge_files')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

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

  // ═══ Knowledge Files ═══

  ipcMain.handle('knowledge:files-list', async (_event, entryId: string) => {
    return queryAll('SELECT * FROM knowledge_files WHERE entry_id = ? ORDER BY created_at', [entryId])
  })

  ipcMain.handle('knowledge:file-add', async (_event, entryId: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '文档', extensions: ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'txt', 'csv', 'md', 'jpg', 'png', 'jpeg'] }],
    })
    if (result.canceled || !result.filePaths.length) return []

    const dir = kbFilesDir()
    const imported: any[] = []
    for (const srcPath of result.filePaths) {
      const fileName = path.basename(srcPath)
      let destPath = path.join(dir, fileName)
      if (fs.existsSync(destPath)) {
        const ext = path.extname(fileName); const base = path.basename(fileName, ext)
        let c = 1
        while (fs.existsSync(destPath)) { destPath = path.join(dir, `${base}_${c}${ext}`); c++ }
      }
      fs.copyFileSync(srcPath, destPath)
      const id = uuid()
      execute('INSERT INTO knowledge_files (id, entry_id, file_name, file_path, file_size) VALUES (?,?,?,?,?)',
        [id, entryId, fileName, destPath, fs.statSync(destPath).size])
      imported.push({ id, file_name: fileName, file_path: destPath })
    }
    return imported
  })

  ipcMain.handle('knowledge:file-delete', async (_event, fileId: string) => {
    const file: any = queryOne('SELECT file_path FROM knowledge_files WHERE id = ?', [fileId])
    if (file && fs.existsSync(file.file_path)) fs.unlinkSync(file.file_path)
    execute('DELETE FROM knowledge_files WHERE id = ?', [fileId])
    return { success: true }
  })

  ipcMain.handle('knowledge:file-open', async (_event, fileId: string) => {
    const file: any = queryOne('SELECT file_path FROM knowledge_files WHERE id = ?', [fileId])
    if (file && fs.existsSync(file.file_path)) {
      const { shell } = require('electron')
      await shell.openPath(file.file_path)
      return { success: true }
    }
    return { success: false, error: '文件不存在' }
  })
}
