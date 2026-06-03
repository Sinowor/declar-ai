import { v4 as uuid } from 'uuid'
import { getDb, queryAll, queryOne, execute, transaction } from '../db'
import { getAIClient, getModel } from './client'
import { getExtractionPrompt, getReviewPrompt } from './prompts'
import type { DeclarationData, ExtractionNote } from '../../shared/types'

export async function runAIExtraction(declarationId: string): Promise<{
  success: boolean
  data?: DeclarationData
  extraction_notes?: ExtractionNote[]
  error?: string
}> {
  const db = await getDb()

  const declaration = queryOne('SELECT * FROM declarations WHERE id = ?', [declarationId])
  if (!declaration) {
    return { success: false, error: '申报单不存在' }
  }

  const files = queryAll('SELECT * FROM declaration_files WHERE declaration_id = ?', [declarationId])
  if (files.length === 0) {
    return { success: false, error: '请先导入单证文件' }
  }

  execute("UPDATE declarations SET status = 'processing', updated_at = datetime('now','localtime') WHERE id = ?", [declarationId])

  try {
    const fileContents = files
      .map((f: any) => `### 文件: ${f.file_name}\n${f.extracted_text || '(文本未提取)'}`)
      .join('\n\n---\n\n')

    const systemPrompt = getExtractionPrompt()
    const client = getAIClient()

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请从以下贸易单证中提取数据，按照要求的 JSON Schema 返回：\n\n${fileContents}` },
      ],
      temperature: 0.1,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 未返回有效响应')

    let extractedData: DeclarationData
    try {
      const parsed = JSON.parse(content)
      extractedData = parsed.data || parsed
      if (!extractedData.transport_info || !extractedData.cargo_details) {
        throw new Error('返回的 JSON 缺少必要字段（transport_info 或 cargo_details）')
      }
      if (!extractedData.cargo_summary) {
        extractedData.cargo_summary = { bill_of_lading_total: 0, cargo_total_pieces: 0, cargo_total_weight: 0, container_total: 0, domestic_transport_tool: null }
      }
      if (!extractedData.extraction_notes) {
        extractedData.extraction_notes = []
      }
    } catch (parseErr: any) {
      throw new Error(`AI 返回的 JSON 解析失败: ${parseErr.message}`)
    }

    // Recalculate summaries
    extractedData.cargo_summary.cargo_total_pieces = extractedData.cargo_details.reduce((sum, d) => sum + (d.pieces || 0), 0)
    extractedData.cargo_summary.cargo_total_weight = extractedData.cargo_details.reduce((sum, d) => sum + (d.weight || 0), 0)
    extractedData.cargo_summary.container_total = new Set(extractedData.cargo_details.map(d => d.container_number).filter(Boolean)).size
    extractedData.cargo_summary.bill_of_lading_total = new Set(extractedData.cargo_details.map(d => d.bill_of_lading_number).filter(Boolean)).size

    transaction(() => {
      execute(
        "UPDATE declarations SET data = ?, status = 'review', updated_at = datetime('now','localtime') WHERE id = ?",
        [JSON.stringify(extractedData), declarationId]
      )
      execute('DELETE FROM cargo_details WHERE declaration_id = ?', [declarationId])
      for (let i = 0; i < extractedData.cargo_details.length; i++) {
        const d = extractedData.cargo_details[i]
        execute(
          `INSERT INTO cargo_details (id, declaration_id, domestic_transport_tool_name, bill_of_lading_number,
            container_number, cargo_name, pieces, weight, customs_lock_number, quantity, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), declarationId,
            d.domestic_transport_tool_name || null, d.bill_of_lading_number || null,
            d.container_number || null, d.cargo_name || null,
            d.pieces || 0, d.weight || 0,
            d.customs_lock_number || null, d.quantity || 1, i]
        )
      }
    })

    return { success: true, data: extractedData, extraction_notes: extractedData.extraction_notes }
  } catch (err: any) {
    execute("UPDATE declarations SET status = 'error', updated_at = datetime('now','localtime') WHERE id = ?", [declarationId])
    return { success: false, error: err.message }
  }
}

export async function runAIReview(declarationId: string): Promise<{
  success: boolean
  issues?: Array<{ id: string; field_path: string; issue_type: string; question: string; severity: string; suggestion: string }>
  error?: string
}> {
  const db = await getDb()
  const declaration = queryOne('SELECT * FROM declarations WHERE id = ?', [declarationId])
  if (!declaration) return { success: false, error: '申报单不存在' }

  try {
    const data = JSON.parse(declaration.data)
    const client = getAIClient()

    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [{ role: 'user', content: getReviewPrompt(JSON.stringify(data, null, 2)) }],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('AI 审核未返回有效响应')

    let issues: any[] = []
    try {
      const parsed = JSON.parse(content)
      const raw = parsed.issues || parsed
      issues = Array.isArray(raw) ? raw : []
    } catch {
      throw new Error('AI 审核返回格式错误')
    }

    const savedIssues: any[] = []
    for (const issue of issues) {
      const convId = uuid()
      execute(
        "INSERT INTO ai_conversations (id, declaration_id, role, field_path, question, status) VALUES (?, ?, 'ai', ?, ?, 'pending')",
        [convId, declarationId, issue.field_path, issue.question]
      )
      savedIssues.push({ id: convId, ...issue })
    }

    return { success: true, issues: savedIssues }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function submitAnswer(conversationId: string, answer: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb()
  const conv = queryOne('SELECT * FROM ai_conversations WHERE id = ?', [conversationId])
  if (!conv) return { success: false, error: '对话记录不存在' }

  execute("UPDATE ai_conversations SET answer = ?, status = 'resolved' WHERE id = ?", [answer, conversationId])
  execute(
    "INSERT INTO ai_conversations (id, declaration_id, role, field_path, question, answer, status) VALUES (?, ?, 'user', ?, ?, ?, 'resolved')",
    [uuid(), conv.declaration_id, conv.field_path, conv.question, answer]
  )
  return { success: true }
}
