import { readFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'
import * as path from 'path'
import { app } from 'electron'
import { extractKeywords } from './keywords'
import { getAIClient, getModel } from '../ai/client'
import { v4 as uuid } from 'uuid'
import { getDb, queryAll, queryOne, execute } from '../db'

// ═══ Tariff file paths ═══
function loadSkillPrompt(): string {
  const candidates = [
    path.join(app.getAppPath(), 'prompts', 'hs-classifier-skill.md'),
    path.join(process.cwd(), 'prompts', 'hs-classifier-skill.md'),
  ]
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, 'utf-8').trim()
  }
  // Inline fallback (minimal)
  return `# Role: 海关商品归类专家\n\n根据商品描述和税则检索结果，推荐HS编码。返回JSON。`
}

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

// ═══ HS Code Verification ═══
// Verify AI-returned code actually exists in tariff. Non-LLM safety net against hallucination.
export function verifyHsCode(code: string | null): boolean {
  if (!code) return false
  try {
    const tariffPath = findTariffPath()
    // Search for 8-digit prefix (more likely to match than exact 10-digit)
    const prefix = code.replace(/\./g, '\\.').slice(0, 10)
    const command = `grep -c "${prefix}" "${tariffPath}"`
    const result = execSync(command, { encoding: 'utf-8', timeout: 3000 })
    return parseInt(result.trim()) > 0
  } catch {
    return false
  }
}

// ═══ AI Keyword Extraction (dynamic, not static dictionary) ═══
async function extractKeywordsWithAI(productDescription: string): Promise<string[]> {
  try {
    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: `你是一个关键词提取器。根据商品描述，提取5-8个用于搜索税则的关键词。规则：提取核心名称、材质、用途、技术特征；优先使用税则中的规范术语而非口语；包含同义词；每个词2-6字。返回JSON：{"keywords":["词1","词2",...]}。只返回JSON。` },
        { role: 'user', content: productDescription },
      ],
      temperature: 0.1, max_tokens: 256,
      response_format: { type: 'json_object' },
    })
    const content = response.choices[0]?.message?.content
    if (content) {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
        return parsed.keywords.slice(0, 8)
      }
    }
    throw new Error('Invalid keyword response')
  } catch (err: any) {
    console.warn('[hs-code] AI keyword extraction failed, fallback to static:', err.message)
    return extractKeywords(productDescription)
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
  tariff_text: string | null
  code_verified: boolean
  full_result_json: string
  created_at: string
}

export interface HsClassifyResponse {
  success: boolean
  result?: HsClassificationResult
  needsMoreInfo?: boolean
  missingFields?: string[]
  question?: string
  infoAssumed?: boolean
  assumptions?: string
  error?: string
}

export async function classifyHsCode(productDescription: string, skipInfoCheck = false): Promise<HsClassifyResponse> {
  try {
    // Step 1: AI extracts search keywords (dynamic, not static dictionary)
    const keywords = await extractKeywordsWithAI(productDescription)
    console.log('[hs-code] AI Keywords:', keywords)

    const tariffResults = searchTariff(keywords, 40)
    const resultsCount = tariffResults ? tariffResults.split('\n').filter(l => l.trim()).length : 0
    console.log(`[hs-code] Tariff search: ${resultsCount} matching lines`)

    const tariffSection = tariffResults
      ? `\n\n## 从税则检索到的相关内容\n\n基于关键词「${keywords.join('、')}」检索到以下内容（格式：行号:内容）：\n\n\`\`\`\n${tariffResults}\n\`\`\`\n\n请优先基于上述税则原文进行归类。如果检索结果不充分，请根据你的专业知识补充，并在 confidence 中标为 "low"。`
      : '\n\n## ⚠ 税则检索无结果\n\n未能从税则文件中检索到匹配内容。请根据你对《中华人民共和国进出口税则》的专业知识给出最佳归类建议，confidence 必须标为 "low"，并在 rationale 中说明"税则检索无匹配，基于通用知识归类"。'

    const skipInstruction = skipInfoCheck
      ? '\n\n## ⚠ 跳过信息完整性检查\n\n用户已选择跳过信息补充。缺失的信息（材质、技术参数、用途等）请根据商品名称和常识进行合理假设。不要返回 needs_more_info。直接进行归类。在输出的 JSON 中增加 "assumptions" 字段，详细列出你做了哪些假设（例如："假设材质为常见不锈钢"、"假设为通用工业用途"）。confidence 标为 "low"。'
      : ''

    const systemPrompt = `${loadSkillPrompt()}${skipInstruction}${tariffSection}`

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

    // Check if AI requests more information (only in non-skip mode)
    if (parsed.needs_more_info && !skipInfoCheck) {
      return {
        success: true,
        needsMoreInfo: true,
        missingFields: parsed.missing_fields || [],
        question: parsed.question || '请补充更多商品信息以便准确归类',
      }
    }

    // Skip mode: capture AI's assumptions
    const infoAssumed = skipInfoCheck || parsed.confidence === 'low'
    const assumptions = parsed.assumptions || null

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
      tariff_text: parsed.tariff_text || null,
      code_verified: verifyHsCode(parsed.hs_code),
      full_result_json: content,
      created_at: new Date().toISOString(),
    }

    return { success: true, result, infoAssumed: infoAssumed || false, assumptions }
  } catch (err: any) {
    console.error('[hs-code] Classification failed:', err.message)
    return { success: false, error: err.message }
  }
}

// ═══ History CRUD ═══
export function saveToHistory(result: HsClassificationResult): void {
  execute(
    `INSERT OR REPLACE INTO hs_classifications
     (id, product_description, hs_code, hs_description, confidence, mfn_rate, vat_rate,
      supervision_conditions, rationale, alternatives, tariff_text, full_result_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [result.id, result.product_description, result.hs_code, result.hs_description,
     result.confidence, result.mfn_rate, result.vat_rate, result.supervision_conditions,
     result.rationale || null, result.alternatives || null, result.tariff_text || null,
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
    // Drop old table if it lacks the new columns (rationale, alternatives, tariff_text)
    const oldTable = queryOne("SELECT sql FROM sqlite_master WHERE type='table' AND name='hs_classifications'") as any
    if (oldTable && !oldTable.sql?.includes('rationale')) {
      execute('DROP TABLE hs_classifications')
    }
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
        rationale TEXT,
        alternatives TEXT,
        tariff_text TEXT,
        full_result_json TEXT NOT NULL,
        report_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      )
    `)
  })
}
