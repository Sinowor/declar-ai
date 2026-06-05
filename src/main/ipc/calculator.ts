import { ipcMain } from 'electron'
import { queryOne, queryAll, execute, uuid } from '../db'

// ═══ Tariff lookup — from DB ═══

interface TaxRate {
  code: string
  description: string
  mfn_rate: number | null
  general_rate: number | null
  vat_rate: number
  consumption_tax: number
  supervision: string | null
  unit: string
}

function lookupFromDb(hsCode: string): TaxRate | null {
  // Strip dots and spaces for fuzzy matching
  const cleaned = hsCode.replace(/[.\s]/g, '').trim()
  if (!cleaned) return null

  // Exact match (also try with dots)
  let row = queryOne('SELECT * FROM tax_rates WHERE REPLACE(code, \'.\', \'\') = ?', [cleaned]) as any
  if (row) return row

  // Prefix match by length (8-digit, 6-digit, 4-digit)
  const prefixes = [10, 8, 6, 4].filter(n => cleaned.length >= n)
  for (const len of prefixes) {
    row = queryOne('SELECT * FROM tax_rates WHERE REPLACE(code, \'.\', \'\') LIKE ? LIMIT 1', [cleaned.substring(0, len) + '%'])
    if (row) return row
  }

  return null
}

// ═══ IPC Handlers ═══

export function registerCalculatorIpc() {
  // Tax rate lookup
  ipcMain.handle('calculator:lookup', async (_event, hsCode: string) => {
    const entry = lookupFromDb(hsCode)
    if (!entry) return { success: false, error: '税则中未找到该 HS 编码，请在设置 > 税率管理中补充' }
    return { success: true, data: entry }
  })

  // History
  ipcMain.handle('calculator:history-list', async () => {
    return queryAll('SELECT * FROM calculator_history ORDER BY created_at DESC LIMIT 20')
  })

  ipcMain.handle('calculator:history-save', async (_event, record: any) => {
    const id = uuid()
    execute(
      `INSERT INTO calculator_history (id, hs_code, hs_description, country_code, cif_value, quantity,
        duty_rate, duty_amount, vat_rate, vat_amount, consumption_tax_rate, consumption_tax_amount,
        total_tax, total_price, result_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, record.hs_code, record.hs_description || null, record.country_code || null,
       record.cif_value, record.quantity || 1,
       record.duty_rate, record.duty_amount, record.vat_rate, record.vat_amount,
       record.consumption_tax_rate || null, record.consumption_tax_amount || 0,
       record.total_tax, record.total_price, record.result_json || null]
    )
    return { success: true, id }
  })
}
