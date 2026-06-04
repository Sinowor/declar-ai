import * as XLSX from 'xlsx'
import { searchTariff, loadSkillPrompt } from './classifier'
import { extractKeywords } from './keywords'
import { getAIClient, getModel } from '../ai/client'

// ═══ Excel Parsing ═══
export function parseExcel(filePath: string): { text: string; rows: string[]; rowCount: number } {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const csvText = XLSX.utils.sheet_to_csv(sheet)
  const lines = csvText.split('\n').filter(l => l.trim())

  return {
    text: csvText,
    rows: lines,
    rowCount: lines.length - 1, // exclude header
  }
}

// ═══ AI Keyword Extraction for batch ═══
async function extractBatchKeywords(allText: string): Promise<string[]> {
  try {
    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: `你是一个关键词提取器。从以下商品清单中提取5-10个用于搜索《中华人民共和国进出口税则》的关键词。清单可能包含多种不同类型的商品。提取最具代表性、覆盖面最广的关键词。优先使用税则中的规范术语。返回JSON：{"keywords":["词1","词2",...]}。只返回JSON。` },
        { role: 'user', content: allText.slice(0, 6000) }, // limit to avoid token overflow
      ],
      temperature: 0.1, max_tokens: 256,
      response_format: { type: 'json_object' },
    })
    const content = response.choices[0]?.message?.content
    if (content) {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0) {
        return parsed.keywords.slice(0, 10)
      }
    }
    throw new Error('Invalid keyword response')
  } catch (err: any) {
    console.warn('[batch] AI keyword extraction failed, fallback to static:', err.message)
    return extractKeywords(allText)
  }
}

// ═══ Batch Classification ═══
export interface BatchResult {
  row_index: number
  product_info: string
  hs_code: string | null
  hs_description: string | null
  confidence: string | null
  mfn_rate: string | null
  vat_rate: string | null
  supervision_conditions: string | null
  rationale: string | null
  tariff_text: string | null
  assumptions: string | null
}

export interface BatchClassifyResponse {
  success: boolean
  results?: BatchResult[]
  error?: string
}

export async function batchClassify(excelText: string): Promise<BatchClassifyResponse> {
  try {
    // Step 1: Extract keywords
    console.log('[batch] Extracting keywords from', excelText.length, 'chars')
    const keywords = await extractBatchKeywords(excelText)
    console.log('[batch] Keywords:', keywords)

    // Step 2: Search tariff once
    const tariffResults = searchTariff(keywords, 40)
    const tariffSection = tariffResults
      ? `\n\n## 税则检索结果\n\n\`\`\`\n${tariffResults}\n\`\`\``
      : '\n\n（税则检索无匹配结果）'

    // Step 3: Build prompt
    const skillPrompt = loadSkillPrompt()
    const systemPrompt = `${skillPrompt}

## 批量归类任务

以下是 Excel 清单的全部文本。第一行为表头（列名），后续每行为一个商品。**自行判断哪一列是品名/商品名称**，其他列作为辅助信息（规格、数量、材质等）。

${tariffSection}

## 规则

1. 逐行分析每个商品，确定 HS 编码
2. 信息不足时合理假设，confidence 标为 "low"，并在 assumptions 字段说明具体假设
3. 信息充足时 confidence 标为 "high"，assumptions 为 null
4. row_index 为数据行在表格中的序号（从 0 开始，跳过表头）

## 输出格式

返回 JSON：
{
  "classifications": [
    {
      "row_index": 0,
      "product_info": "合并该行所有列的文本",
      "hs_code": "10位HS编码",
      "hs_description": "货品名称",
      "confidence": "high|low",
      "mfn_rate": "税率",
      "vat_rate": "增值税率",
      "supervision_conditions": "监管条件",
      "rationale": "归类依据",
      "tariff_text": "引用的税则原文",
      "assumptions": null
    }
  ]
}
只返回 JSON，不要其他文字。`

    // Step 4: Call LLM
    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: excelText.slice(0, 30000) }, // limit token usage
      ],
      temperature: 0.2,
      max_tokens: 16000,
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

    const classifications = parsed.classifications || parsed
    if (!Array.isArray(classifications)) {
      throw new Error('AI 返回的 classifications 不是数组')
    }

    return { success: true, results: classifications }
  } catch (err: any) {
    console.error('[batch] Classification failed:', err.message)
    return { success: false, error: err.message }
  }
}

// ═══ Export to XLSX ═══
export function exportToExcel(results: BatchResult[], outputPath: string): void {
  const wb = XLSX.utils.book_new()

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  }

  const data = [['序号', '商品信息', 'HS编码', '货品名称', '置信度', '最惠国关税', '增值税', '监管条件', '归类依据摘要', 'AI假设']]
  for (const r of results) {
    data.push([
      String(r.row_index + 1),
      r.product_info || '',
      r.hs_code || '',
      r.hs_description || '',
      r.confidence === 'high' ? '高' : '低',
      r.mfn_rate || '',
      r.vat_rate || '',
      r.supervision_conditions || '',
      (r.rationale || '').slice(0, 200),
      r.assumptions || '',
    ])
  }

  const ws = XLSX.utils.aoa_to_sheet(data)

  // Column widths
  ws['!cols'] = [
    { wch: 6 }, { wch: 32 }, { wch: 18 }, { wch: 24 }, { wch: 8 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 36 }, { wch: 30 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'HS归类结果')
  XLSX.writeFile(wb, outputPath)
}
