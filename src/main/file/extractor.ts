import { readFileSync } from 'fs'
import * as path from 'path'

const SUPPORTED_EXTS: Record<string, string> = {
  '.pdf': 'pdf',
  '.xlsx': 'xlsx',
  '.xls': 'xls',
  '.docx': 'docx',
  '.doc': 'doc',
  '.txt': 'txt',
  '.csv': 'csv',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
}

const ARCHIVE_EXTS = new Set(['.zip', '.rar'])

export function detectFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return SUPPORTED_EXTS[ext] || 'unknown'
}

export function isArchive(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return ARCHIVE_EXTS.has(ext)
}

export async function extractText(filePath: string): Promise<string> {
  const fileType = detectFileType(filePath)

  switch (fileType) {
    case 'pdf':
      return extractPdfText(filePath)
    case 'docx':
      return extractDocxText(filePath)
    case 'xlsx':
    case 'xls':
      return extractXlsxText(filePath)
    case 'txt':
    case 'csv':
      return readFileSync(filePath, 'utf-8')
    case 'doc':
      return `[无法解析旧版 .doc 文件: ${path.basename(filePath)}。请转换为 .docx 格式后重试。]`
    case 'image':
      return `[图片文件: ${path.basename(filePath)}。需要 OCR 识别，当前版本暂不支持。]`
    default:
      return `[不支持的文件格式: ${path.basename(filePath)}]`
  }
}

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist')
    const data = new Uint8Array(readFileSync(filePath))
    const doc = await pdfjsLib.getDocument({ data }).promise

    const pages: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const text = content.items
        .map((item: any) => item.str)
        .join(' ')
      pages.push(text)
    }
    return pages.join('\n')
  } catch (err: any) {
    return `[PDF 解析失败: ${err.message}]`
  }
}

async function extractDocxText(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  } catch (err: any) {
    return `[DOCX 解析失败: ${err.message}]`
  }
}

function extractXlsxText(filePath: string): string {
  try {
    const XLSX = require('xlsx')
    const workbook = XLSX.readFile(filePath)
    const sheets: string[] = []

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const csvText = XLSX.utils.sheet_to_csv(sheet)
      sheets.push(`--- Sheet: ${sheetName} ---\n${csvText}`)
    }
    return sheets.join('\n\n')
  } catch (err: any) {
    return `[XLSX 解析失败: ${err.message}]`
  }
}
