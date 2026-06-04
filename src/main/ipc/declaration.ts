import { ipcMain, app } from 'electron'
import { existsSync, unlinkSync, rmSync } from 'fs'
import * as path from 'path'
import { getDb, queryAll, queryOne, execute, transaction, uuid } from '../db'

const EMPTY_DATA = {
  fields: {},
  cargo_details: [],
  extraction_notes: [],
  file_warnings: [],
}

export async function registerDeclarationIpc() {
  await getDb()

  ipcMain.handle('declaration:list', async (_event, search?: string) => {
    let sql = `SELECT id, type, status, data, created_at, updated_at FROM declarations ORDER BY updated_at DESC`
    const params: any[] = []

    if (search) {
      sql = `SELECT id, type, status, data, created_at, updated_at FROM declarations
        WHERE data LIKE ? ORDER BY updated_at DESC`
      const escaped = search.replace(/[%_]/g, '\\$&')
      params.push(`%${escaped}%`)
    }

    const rows = queryAll(sql, params)
    return rows.map((r: any) => {
      const parsed = JSON.parse(r.data)
      const fields = parsed.fields || {}
      return {
        id: r.id,
        type: r.type || null,
        status: r.status,
        fields,
        cargoCount: (parsed.cargo_details || []).length,
        displayName: fields.contract_number || fields.invoice_number || fields.bill_of_lading_number || fields.pre_entry_number || '(未编号)',
        updated_at: r.updated_at,
        created_at: r.created_at,
      }
    })
  })

  ipcMain.handle('declaration:get', async (_event, id: string) => {
    const row = queryOne('SELECT * FROM declarations WHERE id = ?', [id])
    if (!row) return null
    return { ...row, data: JSON.parse(row.data) }
  })

  ipcMain.handle('declaration:create', async () => {
    const id = uuid()
    execute('INSERT INTO declarations (id, status, data) VALUES (?, ?, ?)', [
      id, 'draft', JSON.stringify(EMPTY_DATA),
    ])
    return { id, status: 'draft', data: EMPTY_DATA }
  })

  ipcMain.handle('declaration:update', async (_event, id: string, data: unknown) => {
    const d = data as any
    if (!d || typeof d !== 'object') {
      return { success: false, error: '无效的申报单数据' }
    }
    const sanitized = {
      fields: d.fields || {},
      cargo_details: Array.isArray(d.cargo_details) ? d.cargo_details : [],
      extraction_notes: Array.isArray(d.extraction_notes) ? d.extraction_notes : [],
      file_warnings: Array.isArray(d.file_warnings) ? d.file_warnings : [],
    }
    execute(
      "UPDATE declarations SET data = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      [JSON.stringify(sanitized), id]
    )
    return { success: true }
  })

  ipcMain.handle('declaration:setType', async (_event, id: string, typeKey: string) => {
    execute("UPDATE declarations SET type = ?, updated_at = datetime('now','localtime') WHERE id = ?", [typeKey, id])
    execute('INSERT INTO declaration_outputs (declaration_id, type_key) VALUES (?, ?)', [id, typeKey])
    return { success: true }
  })

  ipcMain.handle('declaration:delete', async (_event, id: string) => {
    const files = queryAll('SELECT file_path FROM declaration_files WHERE declaration_id = ?', [id])
    for (const f of files) {
      try { if (existsSync(f.file_path)) unlinkSync(f.file_path) } catch {}
    }
    const storageDir = path.join(app.getPath('userData'), 'files', id)
    try { if (existsSync(storageDir)) rmSync(storageDir, { recursive: true }) } catch {}
    execute('DELETE FROM declarations WHERE id = ?', [id])
    return { success: true }
  })
}
