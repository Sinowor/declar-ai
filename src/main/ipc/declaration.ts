import { ipcMain } from 'electron'
import { getDb, queryAll, queryOne, execute, transaction, uuid, nextSequenceNo } from '../db'
import {
  folderPath, ensureFolder, declarationJsonPath,
  readJsonFile, writeJsonFile, deleteFolder,
} from '../storage'

const EMPTY_DATA = { fields: {}, cargo_details: [], extraction_notes: [], file_warnings: [] }

export async function registerDeclarationIpc() {
  await getDb()

  ipcMain.handle('declaration:list', async (_event, search?: string) => {
    let sql = `SELECT id, sequence_no, display_name, type, status, folder_path, created_at, updated_at
               FROM declarations ORDER BY updated_at DESC`
    const params: any[] = []

    if (search) {
      sql = `SELECT id, sequence_no, display_name, type, status, folder_path, created_at, updated_at
             FROM declarations WHERE display_name LIKE ? ORDER BY updated_at DESC`
      params.push(`%${search.replace(/[%_]/g, '\\$&')}%`)
    }

    const rows = queryAll(sql, params)
    return rows.map((r: any) => {
      const data = readJsonFile(declarationJsonPath(r.folder_path))
      return {
        id: r.id,
        displayName: r.display_name,
        type: r.type || null,
        status: r.status,
        cargoCount: (data?.cargo_details || []).length,
        updated_at: r.updated_at,
        created_at: r.created_at,
      }
    })
  })

  ipcMain.handle('declaration:get', async (_event, id: string) => {
    const row: any = queryOne('SELECT * FROM declarations WHERE id = ?', [id])
    if (!row) return null
    const data = readJsonFile(declarationJsonPath(row.folder_path))
    return { ...row, data: data || EMPTY_DATA }
  })

  ipcMain.handle('declaration:create', async () => {
    const id = uuid()
    const seqNo = nextSequenceNo()
    const displayName = '(未命名)'
    const fPath = folderPath(seqNo, displayName)
    ensureFolder(fPath)

    transaction(() => {
      execute(`INSERT INTO declarations (id, sequence_no, display_name, status, folder_path)
               VALUES (?, ?, ?, 'draft', ?)`, [id, seqNo, displayName, fPath])
    })
    writeJsonFile(declarationJsonPath(fPath), EMPTY_DATA)

    return { id, status: 'draft', data: EMPTY_DATA, folderPath: fPath }
  })

  ipcMain.handle('declaration:update', async (_event, id: string, data: unknown) => {
    const d = data as any
    if (!d || typeof d !== 'object') {
      return { success: false, error: '无效的申报单数据' }
    }
    const row: any = queryOne('SELECT folder_path FROM declarations WHERE id = ?', [id])
    if (!row) return { success: false, error: '申报单不存在' }

    const sanitized = {
      fields: d.fields || {},
      cargo_details: Array.isArray(d.cargo_details) ? d.cargo_details : [],
      extraction_notes: Array.isArray(d.extraction_notes) ? d.extraction_notes : [],
      file_warnings: Array.isArray(d.file_warnings) ? d.file_warnings : [],
    }
    writeJsonFile(declarationJsonPath(row.folder_path), sanitized)

    // Update display name from invoice/contract/pre_entry field
    const fields = sanitized.fields
    const newName = fields.invoice_number || fields.contract_number || fields.pre_entry_number || '(未命名)'
    execute("UPDATE declarations SET display_name = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      [newName, id])

    return { success: true }
  })

  ipcMain.handle('declaration:setType', async (_event, id: string, typeKey: string) => {
    execute("UPDATE declarations SET type = ?, updated_at = datetime('now','localtime') WHERE id = ?", [typeKey, id])
    execute('INSERT INTO declaration_outputs (declaration_id, type_key) VALUES (?, ?)', [id, typeKey])
    return { success: true }
  })

  ipcMain.handle('declaration:delete', async (_event, id: string) => {
    const row: any = queryOne('SELECT folder_path FROM declarations WHERE id = ?', [id])
    if (row) {
      deleteFolder(row.folder_path)
      execute('DELETE FROM declarations WHERE id = ?', [id])
    }
    return { success: true }
  })
}
