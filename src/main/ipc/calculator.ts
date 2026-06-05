import { ipcMain } from 'electron'
import { readFileSync, existsSync } from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { queryOne, queryAll, execute, uuid } from '../db'

// ═══ Tariff Parser ═══
interface TariffEntry {
  hs_code: string
  description: string
  mfn_rate: number | null
  general_rate: number | null
  vat_rate: number
  has_consumption_tax: boolean
  unit: string
  supervision: string | null
}

let tariffCache: Map<string, TariffEntry> | null = null

function findTariffPath(): string {
  const candidates = [
    path.join(app.getAppPath(), 'prompts', 'china-hscode-rule-2026.md'),
    path.join(process.cwd(), 'prompts', 'china-hscode-rule-2026.md'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  throw new Error('税则文件未找到')
}

function parseTariff(): Map<string, TariffEntry> {
  if (tariffCache) return tariffCache

  const content = readFileSync(findTariffPath(), 'utf-8')
  const lines = content.split('\n')
  const map = new Map<string, TariffEntry>()

  // Known consumption tax items (HS code prefixes)
  const consumptionTaxPrefixes = ['2203', '2204', '2205', '2206', '2207', '2208',  // alcohol
    '2402', '2403',  // tobacco
    '3303', '3304', '3305', '3307',  // cosmetics
    '8703',  // passenger cars
    '8711',  // motorcycles
    '7101', '7102', '7103', '7104', '7105', '7106', '7108', '7109', '7110', '7111', '7112', '7113', '7114', '7115', '7116', '7118',  // jewelry/precious
  ]

  let currentHs: string | null = null
  let currentDesc = ''
  let lineAfterHs = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Match HS code pattern: 4 digits, dot, 4 digits (e.g., "0101.2100")
    const hsMatch = line.match(/^(\d{4}\.\d{2,4})\b\s*(.*)/)
    if (hsMatch && !line.startsWith('ex')) {
      currentHs = hsMatch[1]
      currentDesc = hsMatch[2].replace(/^--?\s*/, '').trim()
      lineAfterHs = 0

      // Look ahead a few lines to find MFN rate (usually the first standalone number)
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const nextLine = lines[j].trim()
        if (!nextLine || nextLine.startsWith('ex')) continue

        // MFN rate: a standalone number (may include △ for provisional)
        const mfnMatch = nextLine.match(/^[△]?(\d+(?:\.\d+)?)\s*$/)
        if (mfnMatch && lineAfterHs === 0) {
          lineAfterHs = j - i
          const mfnRate = parseFloat(mfnMatch[1])
          const generalRate = parseGeneralRate(lines, i, j)
          const hs4 = currentHs.substring(0, 4)

          // Try to find supervision code in nearby lines (single capital letters)
          let supervision: string | null = null
          for (let k = i; k < Math.min(i + 10, lines.length); k++) {
            const supMatch = lines[k].match(/监管条件[：:]\s*([A-Z]+)/)
            if (supMatch) { supervision = supMatch[1]; break }
            // Also check for standalone capital letters like "A", "AB" near the HS code
            if (k > i && k < i + 5) {
              const s = lines[k].trim()
              if (/^[A-Z]{1,4}$/.test(s) && s.length <= 2) { supervision = s; break }
            }
          }

          map.set(currentHs, {
            hs_code: currentHs,
            description: currentDesc || currentHs,
            mfn_rate: !isNaN(mfnRate) ? mfnRate : null,
            general_rate: generalRate != null && !isNaN(generalRate) ? generalRate : null,
            vat_rate: 13,
            has_consumption_tax: consumptionTaxPrefixes.some(p => hs4 >= p.substring(0, 4) && hs4 <= (p.substring(0, 4))),
            unit: guessUnit(currentDesc),
            supervision,
          })
          break
        }
      }
    }
  }

  tariffCache = map
  console.log(`[calculator] Parsed ${map.size} HS codes from tariff file`)
  return map
}

function parseGeneralRate(lines: string[], hsIdx: number, mfnIdx: number): number | null {
  // General rate is usually a few lines after the MFN rate, often the last number before next HS code
  for (let j = mfnIdx + 4; j < Math.min(hsIdx + 12, lines.length); j++) {
    const line = lines[j].trim()
    if (!line || line.startsWith('ex')) continue
    // Skip trade agreement lines (contain Chinese/letters)
    if (/[^\d.\s]/.test(line)) continue
    const match = line.match(/^(\d+(?:\.\d+)?)\s*$/)
    if (match) return parseFloat(match[1])
  }
  return null
}

function guessUnit(desc: string): string {
  if (/千克|公斤|kg/i.test(desc)) return '千克'
  if (/吨/i.test(desc)) return '吨'
  if (/米/i.test(desc)) return '米'
  if (/升/i.test(desc)) return '升'
  if (/平方米/i.test(desc)) return '平方米'
  if (/立方米/i.test(desc)) return '立方米'
  return '个'
}

function lookupHsCode(hsCode: string): TariffEntry | null {
  const map = parseTariff()
  // Exact match
  if (map.has(hsCode)) return map.get(hsCode)!
  // Prefix match (try 8-digit, then 6-digit)
  const prefix8 = hsCode.substring(0, 8)
  for (const [code, entry] of map) {
    if (code.startsWith(prefix8)) return entry
  }
  const prefix6 = hsCode.substring(0, 6)
  for (const [code, entry] of map) {
    if (code.startsWith(prefix6)) return entry
  }
  return null
}

// ═══ IPC Handlers ═══

export function registerCalculatorIpc() {
  ipcMain.handle('calculator:lookup', async (_event, hsCode: string) => {
    try {
      const entry = lookupHsCode(hsCode.trim())
      if (!entry) return { success: false, error: '税则中未找到该 HS 编码' }
      return { success: true, data: entry }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

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
