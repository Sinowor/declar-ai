import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

const ROOT_NAME = 'DeclarAI'

export function getStorageRoot(): string {
  return path.join(app.getPath('documents'), ROOT_NAME)
}

export function ensureStorageRoot(): string {
  const root = getStorageRoot()
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true })
  return root
}

export function ensureFolder(folderPath: string): void {
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true })
}

export function sequenceToFolderName(seq: number, displayName: string): string {
  const padded = String(seq).padStart(6, '0')
  const slug = displayName.replace(/[^a-zA-Z0-9一-鿿_-]/g, '_').slice(0, 40)
  return `D${padded}-${slug || 'unnamed'}`
}

export function folderPath(seq: number, displayName: string): string {
  return path.join(ensureStorageRoot(), sequenceToFolderName(seq, displayName))
}

export function declarationJsonPath(folder: string): string {
  return path.join(folder, 'declaration.json')
}

export function filesDir(folder: string): string {
  const dir = path.join(folder, 'files')
  ensureFolder(dir)
  return dir
}

export function exportsDir(folder: string): string {
  const dir = path.join(folder, 'exports')
  ensureFolder(dir)
  return dir
}

export function readJsonFile(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function writeJsonFile(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function importFileToFolder(folder: string, srcPath: string): string {
  const fileName = path.basename(srcPath)
  let destPath = path.join(filesDir(folder), fileName)
  // Deduplicate on name collision
  if (fs.existsSync(destPath)) {
    const ext = path.extname(fileName)
    const base = path.basename(fileName, ext)
    let counter = 1
    while (fs.existsSync(destPath)) {
      destPath = path.join(filesDir(folder), `${base}_${counter}${ext}`)
      counter++
    }
  }
  fs.copyFileSync(srcPath, destPath)
  return destPath
}

export function deleteFolder(folderPath: string): void {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true })
  }
}
