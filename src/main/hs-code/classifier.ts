import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import * as path from 'path'
import { app } from 'electron'
import { extractKeywords } from './keywords'
import { getAIClient, getModel } from '../ai/client'
import { v4 as uuid } from 'uuid'
import { getDb, queryAll, queryOne, execute } from '../db'

// ═══ Tariff file paths ═══
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

// ═══ Grep Search ═══
export function searchTariff(keywords: string[], limit: number = 30): string {
  if (keywords.length === 0) return ''

  try {
    const tariffPath = findTariffPath()
    const pattern = keywords.join('|')

    try {
      const command = `grep -n -E "${pattern}" "${tariffPath}" | head -${limit}`
      const result = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 10000,
      })
      return result
    } catch {
      // grep failed or no results, try Node.js fallback
      const fileContent = readFileSync(tariffPath, 'utf-8')
      const lines = fileContent.split('\n')
      const results: string[] = []
      const regex = new RegExp(keywords.join('|'), 'i')

      for (let i = 0; i < lines.length && results.length < limit; i++) {
        if (regex.test(lines[i])) {
          results.push(`${i + 1}:${lines[i]}`)
        }
      }
      return results.join('\n')
    }
  } catch (err: any) {
    console.error('[hs-code] Tariff search failed:', err.message)
    return ''
  }
}

// ═══ AI Classification ═══
export interface HsClassificationResult {
  id: string
  product_description: string
  hs_code: string | null
  hs_description: string | null
  confidence: string | null
  mfn_rate: string | null
  vat_rate: string | null
  supervision_conditions: string | null
  rationale: string | null
  alternatives: string | null
  full_result_json: string
  created_at: string
}

export async function classifyHsCode(productDescription: string): Promise<{
  success: boolean
  result?: HsClassificationResult
  error?: string
}> {
  try {
    const keywords = extractKeywords(productDescription)
    console.log('[hs-code] Keywords:', keywords)

    const tariffResults = searchTariff(keywords, 30)
    const resultsCount = tariffResults ? tariffResults.split('\n').filter(l => l.trim()).length : 0
    console.log(`[hs-code] Tariff search: ${resultsCount} matching lines`)

    const tariffSection = tariffResults
      ? `\n\n## 从税则检索到的相关内容\n\n基于关键词「${keywords.join('、')}」检索到以下内容（格式：行号:内容）：\n\n\`\`\`\n${tariffResults}\n\`\`\`\n\n请基于上述税则原文进行归类分析，引用行号作为依据。`
      : ''

    const systemPrompt = `# Role: 海关商品归类专家

你是一位资深的海关商品归类专家，精通《中华人民共和国进出口税则》。

## 归类规则
1. 根据商品名称、材质、用途、技术参数确定适用的类、章
2. 应用归类总规则一至六确定具体税目和子目
3. 查阅类注、章注确认有无排他条款
4. 比较可能的候选编码，选出最合适的

## 输出格式
返回 JSON 对象：
{
  "hs_code": "推荐HS编码（10位，如8414.10.00.00）",
  "hs_description": "官方货品名称",
  "confidence": "high|medium|low",
  "mfn_rate": "最惠国关税税率",
  "vat_rate": "增值税率",
  "supervision_conditions": "监管条件",
  "rationale": "归类依据，引用税则原文和归类规则",
  "alternatives": "候选编码及排除理由"
}
只返回 JSON，不要其他文字。${tariffSection}`

    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请对以下商品进行HS编码归类：\n\n${productDescription}` },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 未返回有效响应')

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch {
      throw new Error('AI 返回格式错误')
    }

    const id = uuid()
    const result: HsClassificationResult = {
      id,
      product_description: productDescription,
      hs_code: parsed.hs_code || null,
      hs_description: parsed.hs_description || null,
      confidence: parsed.confidence || null,
      mfn_rate: parsed.mfn_rate || null,
      vat_rate: parsed.vat_rate || null,
      supervision_conditions: parsed.supervision_conditions || null,
      rationale: parsed.rationale || null,
      alternatives: parsed.alternatives || null,
      full_result_json: content,
      created_at: new Date().toISOString(),
    }

    return { success: true, result }
  } catch (err: any) {
    console.error('[hs-code] Classification failed:', err.message)
    return { success: false, error: err.message }
  }
}

// ═══ History CRUD ═══
export function saveToHistory(result: HsClassificationResult): void {
  execute(
    `INSERT OR REPLACE INTO hs_classifications
     (id, product_description, hs_code, hs_description, confidence, mfn_rate, vat_rate, supervision_conditions, full_result_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [result.id, result.product_description, result.hs_code, result.hs_description,
     result.confidence, result.mfn_rate, result.vat_rate, result.supervision_conditions,
     result.full_result_json, result.created_at]
  )
}

export function getHistory(): HsClassificationResult[] {
  return queryAll('SELECT * FROM hs_classifications ORDER BY created_at DESC LIMIT 100') as any[]
}

export function getHistoryItem(id: string): HsClassificationResult | null {
  return queryOne('SELECT * FROM hs_classifications WHERE id = ?', [id]) as any
}

export function initHsClassifierDb(): void {
  getDb().then(() => {
    if (!queryOne("SELECT name FROM sqlite_master WHERE type='table' AND name='hs_classifications'")) {
      execute(`
        CREATE TABLE IF NOT EXISTS hs_classifications (
          id TEXT PRIMARY KEY,
          product_description TEXT NOT NULL,
          hs_code TEXT,
          hs_description TEXT,
          confidence TEXT,
          mfn_rate TEXT,
          vat_rate TEXT,
          supervision_conditions TEXT,
          full_result_json TEXT NOT NULL,
          report_path TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        )
      `)
    }
  })
}
