import { ipcMain, app } from 'electron'
import { existsSync, unlinkSync, rmSync } from 'fs'
import * as path from 'path'
import { getDb, queryAll, queryOne, execute, transaction, uuid } from '../db'

const EMPTY_DATA = {
  document_title: '中华人民共和国海关进口转关运输货物申报单',
  pre_entry_number: null,
  document_number: null,
  transport_info: {
    entry_exit_transport_tool_name: null,
    voyage_flight_number: null,
    customs_transfer_method: null,
    domestic_transport_method: null,
  },
  cargo_summary: {
    bill_of_lading_total: 0,
    cargo_total_pieces: 0,
    cargo_total_weight: 0,
    container_total: 0,
    domestic_transport_tool: null,
  },
  cargo_details: [],
  extraction_notes: [],
}

export async function registerDeclarationIpc() {
  const db = await getDb()

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
      return {
        id: r.id,
        type: r.type,
        status: r.status,
        data: parsed,
        created_at: r.created_at,
        updated_at: r.updated_at,
        transportName: getTransportName(parsed),
        preEntryNumber: getPreEntryNumber(parsed),
        displayNumber: getDisplayNumber(parsed),
      }
    })
  })

  ipcMain.handle('declaration:get', async (_event, id: string) => {
    const row = queryOne('SELECT * FROM declarations WHERE id = ?', [id])
    if (!row) return null

    const cargoDetails = queryAll('SELECT * FROM cargo_details WHERE declaration_id = ? ORDER BY sort_order', [id])
    return { ...row, data: JSON.parse(row.data), cargo_details: cargoDetails }
  })

  ipcMain.handle('declaration:create', async () => {
    const id = uuid()
    execute('INSERT INTO declarations (id, type, status, data) VALUES (?, ?, ?, ?)', [
      id, 'transit_transport', 'draft', JSON.stringify(EMPTY_DATA),
    ])
    return { id, status: 'draft', data: EMPTY_DATA }
  })

  ipcMain.handle('declaration:update', async (_event, id: string, data: unknown) => {
    const d = data as any
    if (!d || typeof d !== 'object') {
      return { success: false, error: '无效的申报单数据' }
    }
    if (!d.transport_info || !Array.isArray(d.cargo_details)) {
      return { success: false, error: '数据缺少必要字段（transport_info 或 cargo_details）' }
    }

    transaction(() => {
      execute("UPDATE declarations SET data = ?, updated_at = datetime('now','localtime') WHERE id = ?", [
        JSON.stringify(data), id,
      ])
      execute('DELETE FROM cargo_details WHERE declaration_id = ?', [id])
      const details = d.cargo_details || []
      for (let i = 0; i < details.length; i++) {
        const cd = details[i]
        execute(
          `INSERT INTO cargo_details (id, declaration_id, domestic_transport_tool_name, bill_of_lading_number,
            container_number, cargo_name, pieces, weight, customs_lock_number, quantity, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), id,
            cd.domestic_transport_tool_name || null, cd.bill_of_lading_number || null,
            cd.container_number || null, cd.cargo_name || null,
            cd.pieces || 0, cd.weight || 0,
            cd.customs_lock_number || null, cd.quantity || 1, i,
          ]
        )
      }
    })

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

function getTransportName(data: any): string {
  const t = data?.transport_info
  if (!t) return ''
  const name = t.entry_exit_transport_tool_name || ''
  const voyage = t.voyage_flight_number || ''
  return voyage ? `${name} / ${voyage}` : name
}

function getPreEntryNumber(data: any): string | null {
  return data?.pre_entry_number || null
}

// Use bill of lading number as primary display ID; fall back to pre-entry number
function getDisplayNumber(data: any): string | null {
  const details = data?.cargo_details
  if (Array.isArray(details) && details.length > 0) {
    const firstBl = details[0]?.bill_of_lading_number
    if (firstBl) return firstBl
  }
  return data?.pre_entry_number || null
}
