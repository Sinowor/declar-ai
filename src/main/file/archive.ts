import * as path from 'path'
import { mkdirSync, existsSync } from 'fs'

export async function extractArchive(
  filePath: string,
  destDir: string
): Promise<string[]> {
  const ext = path.extname(filePath).toLowerCase()
  const extractedFiles: string[] = []

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  if (ext === '.zip') {
    const AdmZip = (await import('adm-zip')).default
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()

    for (const entry of entries) {
      if (entry.isDirectory) continue
      const destPath = path.join(destDir, entry.entryName)
      const destDirPath = path.dirname(destPath)
      if (!existsSync(destDirPath)) {
        mkdirSync(destDirPath, { recursive: true })
      }
      if (existsSync(destPath)) {
        console.warn(`[archive] 文件已存在，将被覆盖: ${destPath}`)
      }
      zip.extractEntryTo(entry, destDir, false, true)
      extractedFiles.push(destPath)
    }
  } else if (ext === '.rar') {
    throw new Error(`RAR 格式暂不支持: ${path.basename(filePath)}。请解压为 ZIP 后重试。`)
  }

  return extractedFiles
}
