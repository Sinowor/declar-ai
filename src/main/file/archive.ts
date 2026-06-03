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
    const normalizedDest = path.resolve(destDir)

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue

      // Zip Slip prevention: reject paths that escape the destination directory
      const resolvedPath = path.resolve(path.join(normalizedDest, entry.entryName))
      if (!resolvedPath.startsWith(normalizedDest + path.sep) && resolvedPath !== normalizedDest) {
        console.warn(`[archive] 安全拦截: 跳过可疑路径 ${entry.entryName}`)
        continue
      }

      // Use adm-zip's built-in extraction with path structure preserved
      zip.extractEntryTo(entry, normalizedDest, true, true)
      extractedFiles.push(resolvedPath)
    }
  } else if (ext === '.rar') {
    throw new Error(`RAR 格式暂不支持: ${path.basename(filePath)}。请解压为 ZIP 后重试。`)
  }

  return extractedFiles
}
