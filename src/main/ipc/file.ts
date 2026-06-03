import { ipcMain, dialog, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getDb, uuid } from '../db'
import { extractText, isArchive, detectFileType } from '../file/extractor'
import { extractArchive } from '../file/archive'

export function registerFileIpc() {
  const db = getDb()

  // Open file dialog
  ipcMain.handle('file:dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: '所有支持文件',
          extensions: ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'txt', 'csv', 'zip', 'rar', 'jpg', 'png', 'jpeg'],
        },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Word', extensions: ['docx', 'doc'] },
        { name: '压缩包', extensions: ['zip', 'rar'] },
      ],
    })
    return result.canceled ? [] : result.filePaths
  })

  // Import files for a declaration
  ipcMain.handle('file:import', async (_event, declarationId: string, filePaths: string[]) => {
    const storageDir = path.join(app.getPath('userData'), 'files', declarationId)
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }

    const imported: any[] = []

    for (const srcPath of filePaths) {
      try {
        const fileName = path.basename(srcPath)
        const fileSize = fs.statSync(srcPath).size

        // Handle archives
        if (isArchive(srcPath)) {
          const extractDir = path.join(storageDir, `_extracted_${path.parse(fileName).name}`)
          const extractedPaths = await extractArchive(srcPath, extractDir)

          // Filter out error messages
          const actualFiles = extractedPaths.filter((p) => fs.existsSync(p) && !p.startsWith('['))

          for (const extPath of actualFiles) {
            const extFileName = path.basename(extPath)
            const extText = await extractText(extPath)
            const id = uuid()
            db.prepare(
              `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, extracted_text)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).run(id, declarationId, `${fileName} / ${extFileName}`, extPath, detectFileType(extPath), 0, extText)
            imported.push({ id, file_name: `${fileName} / ${extFileName}`, extracted_text: extText })
          }
        } else {
          const destPath = path.join(storageDir, fileName)
          fs.copyFileSync(srcPath, destPath)

          const text = await extractText(destPath)
          const id = uuid()

          db.prepare(
            `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, extracted_text)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(id, declarationId, fileName, destPath, detectFileType(destPath), fileSize, text)

          imported.push({ id, file_name: fileName, extracted_text: text })
        }
      } catch (err: any) {
        console.error(`Failed to import ${srcPath}:`, err.message)
        imported.push({ error: err.message, file_name: path.basename(srcPath) })
      }
    }

    return imported
  })

  // Extract text for a specific file
  ipcMain.handle('file:extract-text', async (_event, fileId: string) => {
    const file = db.prepare('SELECT * FROM declaration_files WHERE id = ?').get(fileId) as any
    if (!file) return null

    const text = await extractText(file.file_path)
    db.prepare('UPDATE declaration_files SET extracted_text = ? WHERE id = ?').run(text, fileId)
    return text
  })

  // List files for a declaration
  ipcMain.handle('file:list', (_event, declarationId: string) => {
    return db
      .prepare('SELECT * FROM declaration_files WHERE declaration_id = ? ORDER BY created_at')
      .all(declarationId)
  })

  // Delete a file
  ipcMain.handle('file:delete', (_event, fileId: string) => {
    const file = db.prepare('SELECT file_path FROM declaration_files WHERE id = ?').get(fileId) as any
    if (file && fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path)
    }
    db.prepare('DELETE FROM declaration_files WHERE id = ?').run(fileId)
    return { success: true }
  })
}
