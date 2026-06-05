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

  // ═══ Templates ═══

  ipcMain.handle('data:templates:list', async (_event, typeKey?: string) => {
    if (typeKey) {
      return queryAll('SELECT * FROM declaration_templates WHERE type_key = ? ORDER BY created_at DESC', [typeKey])
    }
    return queryAll('SELECT * FROM declaration_templates ORDER BY created_at DESC')
  })

  ipcMain.handle('data:templates:save', async (_event, template: { id?: string; name: string; type_key: string; template_data: string }) => {
    if (template.id) {
      execute('UPDATE declaration_templates SET name = ?, template_data = ? WHERE id = ?', [template.name, template.template_data, template.id])
    } else {
      execute('INSERT INTO declaration_templates (id, name, type_key, template_data) VALUES (?, ?, ?, ?)', [uuid(), template.name, template.type_key, template.template_data])
    }
    return { success: true }
  })

  ipcMain.handle('data:templates:delete', async (_event, id: string) => {
    execute('DELETE FROM declaration_templates WHERE id = ?', [id])
    return { success: true }
  })

  // ═══ Generic basic data (currencies, packaging, countries) ═══
  const registerSimpleCrud = (channel: string, table: string, codeField = 'code', nameField = 'name') => {
    ipcMain.handle(`data:${channel}:list`, async () => {
      return queryAll(`SELECT * FROM ${table} ORDER BY ${codeField}`)
    })
    ipcMain.handle(`data:${channel}:save`, async (_event, item: { code: string; name: string }) => {
      const existing = queryOne(`SELECT ${codeField} FROM ${table} WHERE ${codeField} = ?`, [item.code])
      if (existing) {
        execute(`UPDATE ${table} SET ${nameField} = ? WHERE ${codeField} = ?`, [item.name, item.code])
      } else {
        execute(`INSERT INTO ${table} (${codeField}, ${nameField}) VALUES (?, ?)`, [item.code, item.name])
      }
      return { success: true }
    })
    ipcMain.handle(`data:${channel}:delete`, async (_event, code: string) => {
      execute(`DELETE FROM ${table} WHERE ${codeField} = ?`, [code])
      return { success: true }
    })
  }

  registerSimpleCrud('currencies', 'currencies')
  registerSimpleCrud('packaging', 'packaging_types')
  registerSimpleCrud('countries', 'countries')

  // Tax rates — full CRUD with extra fields
  ipcMain.handle('data:tax-rates:list', async () => {
    return queryAll('SELECT * FROM tax_rates ORDER BY code')
  })
  ipcMain.handle('data:tax-rates:save', async (_event, item: any) => {
    const existing = queryOne('SELECT code FROM tax_rates WHERE code = ?', [item.code])
    if (existing) {
      execute(`UPDATE tax_rates SET description=?, mfn_rate=?, general_rate=?, vat_rate=?, consumption_tax=?, supervision=?, unit=? WHERE code=?`,
        [item.description || '', item.mfn_rate || null, item.general_rate || null, item.vat_rate || 13, item.consumption_tax || 0, item.supervision || null, item.unit || '个', item.code])
    } else {
      execute(`INSERT INTO tax_rates (code, description, mfn_rate, general_rate, vat_rate, consumption_tax, supervision, unit) VALUES (?,?,?,?,?,?,?,?)`,
        [item.code, item.description || '', item.mfn_rate || null, item.general_rate || null, item.vat_rate || 13, item.consumption_tax || 0, item.supervision || null, item.unit || '个'])
    }
    return { success: true }
  })
  ipcMain.handle('data:tax-rates:delete', async (_event, code: string) => {
    execute('DELETE FROM tax_rates WHERE code = ?', [code])
    return { success: true }
  })
  ipcMain.handle('data:tax-rates:search', async (_event, q: string) => {
    return queryAll("SELECT * FROM tax_rates WHERE code LIKE ? OR description LIKE ? ORDER BY code", [`%${q}%`, `%${q}%`])
  })
}
