import { v4 as uuid } from 'uuid'
import { queryAll, queryOne, execute } from '../db'
import { getAIClient, getModel } from './client'
import { getExtractionPrompt, getReviewPrompt } from './prompts'
import { declarationJsonPath, readJsonFile, writeJsonFile } from '../storage'
import type { UniversalDeclarationData, ExtractionNote, ReviewIssue } from '../../shared/types'

export async function runAIExtraction(declarationId: string): Promise<{
  success: boolean
  data?: UniversalDeclarationData
  extraction_notes?: ExtractionNote[]
  issues?: ReviewIssue[]
  error?: string
}> {
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
    // Separate unreadable files from valid content
    const codeWarnings: Array<{ file_name: string; reason: string }> = []
    const validFiles = files.filter((f: any) => {
      const text = f.extracted_text || ''
      if (text.startsWith('[')) {
        codeWarnings.push({ file_name: f.file_name, reason: text.replace(/^\[|\]$/g, '') })
        return false
      }
      return true
    })

    const fileContents = validFiles.length > 0
      ? validFiles
          .map((f: any) => `### 文件: ${f.file_name}\n${f.extracted_text || '(文本未提取)'}`)
          .join('\n\n---\n\n')
      : '(所有文件均无法解析文本内容)'

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

    let extractedData: UniversalDeclarationData
    try {
      const parsed = JSON.parse(content)
      const data = parsed.data || parsed
      extractedData = {
        fields: data.fields || {},
        cargo_details: Array.isArray(data.cargo_details) ? data.cargo_details : [],
        extraction_notes: Array.isArray(data.extraction_notes) ? data.extraction_notes : [],
        file_warnings: Array.isArray(data.file_warnings) ? data.file_warnings : [],
      }
    } catch (parseErr: any) {
      throw new Error(`AI 返回的 JSON 解析失败: ${parseErr.message}`)
    }

    // Merge code-level file warnings with AI-detected ones
    if (codeWarnings.length > 0) {
      extractedData.file_warnings = [...codeWarnings, ...extractedData.file_warnings]
    }

    const row: any = queryOne('SELECT folder_path FROM declarations WHERE id = ?', [declarationId])
    if (row) {
      writeJsonFile(declarationJsonPath(row.folder_path), extractedData)
    }
    execute(
      "UPDATE declarations SET status = 'review', updated_at = datetime('now','localtime') WHERE id = ?",
      [declarationId]
    )

    // Auto-run review after successful extraction
    let issues: ReviewIssue[] = []
    try {
      const reviewResult = await runAIReview(declarationId)
      if (reviewResult.success && reviewResult.issues) {
        issues = reviewResult.issues
      }
    } catch (reviewErr: any) {
      console.warn('[extractor] Auto-review failed (non-fatal):', reviewErr.message)
    }

    return { success: true, data: extractedData, extraction_notes: extractedData.extraction_notes, issues }
  } catch (err: any) {
    execute("UPDATE declarations SET status = 'error', updated_at = datetime('now','localtime') WHERE id = ?", [declarationId])
    return { success: false, error: err.message }
  }
}

export async function runAIReview(declarationId: string): Promise<{
  success: boolean
  issues?: ReviewIssue[]
  error?: string
}> {
  const row: any = queryOne('SELECT folder_path FROM declarations WHERE id = ?', [declarationId])
  if (!row) return { success: false, error: '申报单不存在' }

  try {
    const data = readJsonFile(declarationJsonPath(row.folder_path))
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
  const conv = queryOne('SELECT * FROM ai_conversations WHERE id = ?', [conversationId])
  if (!conv) return { success: false, error: '对话记录不存在' }

  execute("UPDATE ai_conversations SET answer = ?, status = 'resolved' WHERE id = ?", [answer, conversationId])
  execute(
    "INSERT INTO ai_conversations (id, declaration_id, role, field_path, question, answer, status) VALUES (?, ?, 'user', ?, ?, ?, 'resolved')",
    [uuid(), conv.declaration_id, conv.field_path, conv.question, answer]
  )
  return { success: true }
}
