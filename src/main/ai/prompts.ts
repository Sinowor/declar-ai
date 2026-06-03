import { readFileSync } from 'fs'
import * as path from 'path'
import { app } from 'electron'

let extractionPrompt: string | null = null
let reviewPrompt: string | null = null

export function getExtractionPrompt(): string {
  if (extractionPrompt) return extractionPrompt

  const promptPath = path.join(app.getAppPath(), 'prompts', 'extraction-system-prompt.md')

  try {
    extractionPrompt = readFileSync(promptPath, 'utf-8')
  } catch {
    // Fallback: load from project root in dev mode
    const devPath = path.join(process.cwd(), 'prompts', 'extraction-system-prompt.md')
    try {
      extractionPrompt = readFileSync(devPath, 'utf-8')
    } catch {
      extractionPrompt = `
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

  return extractionPrompt
}

export function getReviewPrompt(declarationData: string): string {
  const baseReviewPrompt = `
# Role: 海关报关审核专家

你是一位严格的报关审核专家。请审核以下申报单数据，找出潜在问题。

## 审核项目
1. 数据完整性 — 哪些关键字段缺失？
2. 数据一致性 — cargo_summary 汇总值是否与 cargo_details 明细累加一致？
3. 逻辑合理性 — 运输方式与运输工具名称是否匹配？重量、件数是否在合理范围？
4. 格式规范性 — 编号格式、日期格式是否正确？

## 输出格式
返回 JSON 数组，每个问题包含：
- field_path: 字段路径
- issue_type: "missing" | "inconsistency" | "logic" | "format"
- question: 用中文描述的明确问题
- severity: "high" | "medium" | "low"
- suggestion: 建议的修正方向

只返回有问题的地方，如果没有问题返回空数组 []。
  `.trim()

  return `${baseReviewPrompt}\n\n## 申报单数据\n${declarationData}`
}
