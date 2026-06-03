import { ipcMain } from 'electron'
import { getDb, uuid } from '../db'

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

export function registerDeclarationIpc() {
  const db = getDb()

  ipcMain.handle('declaration:list', (_event, search?: string) => {
    let query = `SELECT id, type, status, data, created_at, updated_at FROM declarations ORDER BY updated_at DESC`
    const params: string[] = []

    if (search) {
      query = `SELECT id, type, status, data, created_at, updated_at FROM declarations
        WHERE data LIKE ? ORDER BY updated_at DESC`
      // Escape SQLite LIKE wildcards so % and _ match literally
      const escaped = search.replace(/[%_]/g, '\\$&')
      params.push(`%${escaped}%`)
    }

    const rows = db.prepare(query).all(...params) as any[]
    return rows.map((r) => {
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
      }
    })
  })

  ipcMain.handle('declaration:get', (_event, id: string) => {
    const row = db.prepare('SELECT * FROM declarations WHERE id = ?').get(id) as any
    if (!row) return null

    const cargoDetails = db
      .prepare('SELECT * FROM cargo_details WHERE declaration_id = ? ORDER BY sort_order')
      .all(id) as any[]

    return {
      ...row,
      data: JSON.parse(row.data),
      cargo_details: cargoDetails,
    }
  })

  ipcMain.handle('declaration:create', () => {
    const id = uuid()
    db.prepare('INSERT INTO declarations (id, type, status, data) VALUES (?, ?, ?, ?)').run(
      id,
      'transit_transport',
      'draft',
      JSON.stringify(EMPTY_DATA)
    )
    return { id, status: 'draft', data: EMPTY_DATA }
  })

  ipcMain.handle('declaration:update', (_event, id: string, data: unknown) => {
    const d = data as any
    if (!d || typeof d !== 'object') {
      return { success: false, error: '无效的申报单数据' }
    }
    if (!d.transport_info || !Array.isArray(d.cargo_details)) {
      return { success: false, error: '数据缺少必要字段（transport_info 或 cargo_details）' }
    }
    db.prepare(
      "UPDATE declarations SET data = ?, updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(JSON.stringify(data), id)
    return { success: true }
  })

  ipcMain.handle('declaration:delete', (_event, id: string) => {
    db.prepare('DELETE FROM declarations WHERE id = ?').run(id)
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
