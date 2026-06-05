import { ipcMain } from 'electron'
import { getDb, queryOne, queryAll, execute, uuid } from '../db'

export function registerDataIpc() {
  // ═══ Customs Offices ═══

  ipcMain.handle('data:customs-offices:list', async (_event, search?: string) => {
    if (search) {
      return queryAll(
        "SELECT * FROM customs_offices WHERE code LIKE ? OR name LIKE ? OR parent_name LIKE ? ORDER BY code",
        [`%${search}%`, `%${search}%`, `%${search}%`]
      )
    }
    return queryAll('SELECT * FROM customs_offices ORDER BY code')
  })

  ipcMain.handle('data:customs-offices:save', async (_event, office: { code: string; name: string; parent_name?: string }) => {
    const existing = queryOne('SELECT code FROM customs_offices WHERE code = ?', [office.code])
    if (existing) {
      execute('UPDATE customs_offices SET name = ?, parent_name = ? WHERE code = ?', [office.name, office.parent_name || null, office.code])
    } else {
      execute('INSERT INTO customs_offices (code, name, parent_name) VALUES (?, ?, ?)', [office.code, office.name, office.parent_name || null])
    }
    return { success: true }
  })

  ipcMain.handle('data:customs-offices:delete', async (_event, code: string) => {
    execute('DELETE FROM customs_offices WHERE code = ?', [code])
    return { success: true }
  })

  // ═══ Enterprises ═══

  ipcMain.handle('data:enterprises:list', async () => {
    return queryAll('SELECT * FROM declaration_enterprises ORDER BY is_default DESC, created_at')
  })

  ipcMain.handle('data:enterprises:save', async (_event, enterprise: { id?: string; credit_code?: string; customs_code?: string; name: string; short_name?: string }) => {
    if (enterprise.id) {
      execute(
        'UPDATE declaration_enterprises SET credit_code = ?, customs_code = ?, name = ?, short_name = ? WHERE id = ?',
        [enterprise.credit_code || null, enterprise.customs_code || null, enterprise.name, enterprise.short_name || null, enterprise.id]
      )
    } else {
      const id = uuid()
      execute(
        'INSERT INTO declaration_enterprises (id, credit_code, customs_code, name, short_name) VALUES (?, ?, ?, ?, ?)',
        [id, enterprise.credit_code || null, enterprise.customs_code || null, enterprise.name, enterprise.short_name || null]
      )
    }
    return { success: true }
  })

  ipcMain.handle('data:enterprises:delete', async (_event, id: string) => {
    execute('DELETE FROM declaration_enterprises WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('data:enterprises:set-default', async (_event, id: string) => {
    execute('UPDATE declaration_enterprises SET is_default = 0')
    execute('UPDATE declaration_enterprises SET is_default = 1 WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('data:enterprises:get-default', async () => {
    return queryOne('SELECT * FROM declaration_enterprises WHERE is_default = 1') || queryOne('SELECT * FROM declaration_enterprises ORDER BY created_at LIMIT 1')
  })
}
