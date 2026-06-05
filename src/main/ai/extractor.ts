import { v4 as uuid } from 'uuid'
import * as fs from 'fs'
import { queryAll, queryOne, execute } from '../db'
import { getAIClient, getModel } from './client'
import { getExtractionPrompt, getReviewPrompt, getSystemDateContext } from './prompts'
import { declarationJsonPath, readJsonFile, writeJsonFile } from '../storage'
import type { UniversalDeclarationData, ExtractionNote, ReviewIssue } from '../../shared/types'

// ═══ AI File Tagging ═══
const TAG_OPTIONS = ['箱单', '发票', '合同', '提单', '运单', '原产地证', '报关单', '其他']

async function tagFileWithAI(fileName: string, textSample: string): Promise<string[]> {
  try {
    const client = getAIClient()
    const response = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: `${getSystemDateContext()}\n\n你是一个贸易单证识别器。根据文件名和文本内容，判断文件类型。从以下选项中选择最匹配的 1-2 个标签：箱单、发票、合同、提单、运单、原产地证、报关单、其他。如果无法判断或不属于以上类型，返回["其他"]。返回JSON：{"tags":["标签1","标签2"]}。只返回JSON。` },
        { role: 'user', content: `文件名: ${fileName}\n\n内容预览:\n${textSample.slice(0, 500)}` },
      ],
      temperature: 0.1, max_tokens: 128,
      response_format: { type: 'json_object' },
    })
    const content = response.choices[0]?.message?.content
    if (content) {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.tags) && parsed.tags.length > 0) {
        return parsed.tags.filter((t: string) => TAG_OPTIONS.includes(t)).slice(0, 2)
      }
    }
    throw new Error('Invalid tag response')
  } catch (err: any) {
    console.warn('[extractor] AI file tagging failed:', err.message)
    return ['其他']
  }
}

export async function tagUploadedFiles(declarationId: string): Promise<void> {
  const files = queryAll('SELECT id, file_name, extracted_text FROM declaration_files WHERE declaration_id = ? AND category = ?', [declarationId, 'uploaded'])
  await Promise.all((files as any[]).map(async (f) => {
    try {
      const tags = await tagFileWithAI(f.file_name, f.extracted_text || '')
      execute('UPDATE declaration_files SET tags = ? WHERE id = ?', [JSON.stringify(tags), f.id])
      console.log(`[extractor] Tagged file ${f.file_name}:`, tags)
    } catch (err: any) {
      console.warn(`[extractor] Failed to tag file ${f.file_name}:`, err.message)
    }
  }))
}

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

    // Auto-tag uploaded files
    tagUploadedFiles(declarationId).catch(err => console.warn('[extractor] File tagging failed (non-fatal):', err.message))

    const row: any = queryOne('SELECT folder_path FROM declarations WHERE id = ?', [declarationId])
    if (row) {
      writeJsonFile(declarationJsonPath(row.folder_path), extractedData)
      // Record as generated file
      const jsonPath = declarationJsonPath(row.folder_path)
      const existing = queryOne("SELECT id FROM declaration_files WHERE declaration_id = ? AND output_type = 'extraction_json'", [declarationId])
      if (existing) {
        execute('UPDATE declaration_files SET file_name = ?, file_path = ?, file_size = ?, created_at = datetime("now","localtime") WHERE id = ?', ['提取结果.json', jsonPath, fs.statSync(jsonPath).size, (existing as any).id])
      } else {
        execute(
          `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, category, tags, purpose, output_type)
           VALUES (?, ?, ?, ?, ?, ?, 'generated', NULL, ?, ?)`,
          [uuid(), declarationId, '提取结果.json', jsonPath, 'json', fs.statSync(jsonPath).size, 'AI 提取的结构化数据', 'extraction_json']
        )
      }
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
