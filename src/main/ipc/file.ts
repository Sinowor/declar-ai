import { ipcMain, dialog, app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getDb, queryAll, queryOne, execute, uuid } from '../db'
import { extractText, isArchive, detectFileType } from '../file/extractor'
import { extractArchive } from '../file/archive'

export async function registerFileIpc() {
  const db = await getDb()

  ipcMain.handle('file:dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: '所有支持文件', extensions: ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'txt', 'csv', 'zip', 'rar', 'jpg', 'png', 'jpeg'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Word', extensions: ['docx', 'doc'] },
        { name: '压缩包', extensions: ['zip', 'rar'] },
      ],
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('file:import', async (_event, declarationId: string, filePaths: string[]) => {
    const decl = queryOne('SELECT id FROM declarations WHERE id = ?', [declarationId])
    if (!decl) {
      return [{ error: '申报单不存在，请先创建申报单' }]
    }

    const storageDir = path.join(app.getPath('userData'), 'files', declarationId)
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }

    const imported: any[] = []

    for (const srcPath of filePaths) {
      try {
        const fileName = path.basename(srcPath)
        const fileSize = fs.statSync(srcPath).size

        if (isArchive(srcPath)) {
          const extractDir = path.join(storageDir, `_extracted_${path.parse(fileName).name}`)
          const extractedPaths = await extractArchive(srcPath, extractDir)

          for (const extPath of extractedPaths) {
            if (!fs.existsSync(extPath)) continue
            const extFileName = path.basename(extPath)
            const extFileSize = fs.statSync(extPath).size
            const extText = await extractText(extPath)
            const id = uuid()
            execute(
              `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, extracted_text)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, declarationId, `${fileName} / ${extFileName}`, extPath, detectFileType(extPath), extFileSize, extText]
            )
            imported.push({ id, file_name: `${fileName} / ${extFileName}`, extracted_text: extText })
          }
        } else {
          const destPath = path.join(storageDir, fileName)
          fs.copyFileSync(srcPath, destPath)
          const text = await extractText(destPath)
          const id = uuid()
          execute(
            `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, extracted_text)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, declarationId, fileName, destPath, detectFileType(destPath), fileSize, text]
          )
          imported.push({ id, file_name: fileName, extracted_text: text })
        }
      } catch (err: any) {
        console.error(`Failed to import ${srcPath}:`, err.message)
        imported.push({ error: err.message, file_name: path.basename(srcPath) })
      }
    }

    return imported
  })

  ipcMain.handle('file:extract-text', async (_event, fileId: string) => {
    const file = queryOne('SELECT * FROM declaration_files WHERE id = ?', [fileId])
    if (!file) return null
    const text = await extractText(file.file_path)
    execute('UPDATE declaration_files SET extracted_text = ? WHERE id = ?', [text, fileId])
    return text
  })

  ipcMain.handle('file:list', async (_event, declarationId: string) => {
    return queryAll('SELECT * FROM declaration_files WHERE declaration_id = ? ORDER BY created_at', [declarationId])
  })

  ipcMain.handle('file:delete', async (_event, fileId: string) => {
    const file = queryOne('SELECT file_path FROM declaration_files WHERE id = ?', [fileId])
    if (file && fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path)
    }
    execute('DELETE FROM declaration_files WHERE id = ?', [fileId])
    return { success: true }
  })
}
