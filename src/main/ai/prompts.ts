import { readFileSync } from 'fs'
import * as path from 'path'
import { app } from 'electron'

function loadExtractionPrompt(): string {
  const promptPath = path.join(app.getAppPath(), 'prompts', 'extraction-system-prompt.md')

  try {
    return readFileSync(promptPath, 'utf-8')
  } catch (err: any) {
    console.warn('[prompts] Extraction prompt not found at app path, trying dev path:', err.message)
    const devPath = path.join(process.cwd(), 'prompts', 'extraction-system-prompt.md')
    try {
      return readFileSync(devPath, 'utf-8')
    } catch (err2: any) {
      console.warn('[prompts] Extraction prompt not found at dev path, using inline fallback:', err2.message)
      return `
# Role: 海关报关专家

你是一位资深的海关报关专家，请从提供的贸易单证中提取结构化数据，按照指定JSON Schema返回。

## 重要规则
- 所有数字字段必须是数字类型
- 找不到的字段置为 null 或 0
- 货物名称如为英文，翻译为中文
- 不要编造数据，不确定的字段在 extraction_notes 中标注低置信度
      `.trim()
    }
  }
}

export function getExtractionPrompt(): string {
  return loadExtractionPrompt()
}

function loadReviewPrompt(): string {
  const promptPath = path.join(app.getAppPath(), 'prompts', 'review-system-prompt.md')
  try {
    return readFileSync(promptPath, 'utf-8').trim()
  } catch (err: any) {
    const devPath = path.join(process.cwd(), 'prompts', 'review-system-prompt.md')
    try {
      return readFileSync(devPath, 'utf-8').trim()
    } catch (err2: any) {
      console.warn('[prompts] Review prompt not found, using inline fallback:', err2.message)
      return `
# Role: 海关报关审核专家

你是一位严格的报关审核专家。请审核以下申报单数据，找出潜在问题。

## 审核项目
1. 数据完整性 — 哪些关键字段缺失？
2. 数据一致性 — 汇总值是否与货物明细累加一致？
3. 逻辑合理性 — 运输方式与运输工具名称是否匹配？
4. 格式规范性 — 编号格式、日期格式是否正确？

## 输出格式
返回 JSON 对象，格式为 {"issues": [...]}，只返回有问题的地方，没有问题返回 {"issues": []}。
      `.trim()
    }
  }
}

export function getReviewPrompt(declarationData: string): string {
  return `${loadReviewPrompt()}\n\n## 申报单数据\n${declarationData}`
}
