import { ipcMain, dialog } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { getDb, queryOne, queryAll, execute, uuid } from '../db'
import { extractText, isArchive, detectFileType } from '../file/extractor'
import { extractArchive } from '../file/archive'
import { importFileToFolder, filesDir, ensureFolder } from '../storage'

export async function registerFileIpc() {
  await getDb()

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
    const row: any = queryOne('SELECT folder_path FROM declarations WHERE id = ?', [declarationId])
    if (!row) return [{ error: '申报单不存在，请先创建申报单' }]

    const folder = row.folder_path
    ensureFolder(folder)

    const imported: any[] = []

    for (const srcPath of filePaths) {
      try {
        const fileName = path.basename(srcPath)

        if (isArchive(srcPath)) {
          const extractDir = path.join(filesDir(folder), `_extracted_${path.parse(fileName).name}`)
          ensureFolder(extractDir)
          const extractedPaths = await extractArchive(srcPath, extractDir)

          for (const extPath of extractedPaths) {
            if (!fs.existsSync(extPath)) continue
            const extFileName = path.basename(extPath)
            // Move extracted file into files dir
            const destPath = importFileToFolder(folder, extPath)
            // Cleanup extracted dir
            try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch {}
            const text = await extractText(destPath)
            const id = uuid()
            execute(
              `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, extracted_text)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, declarationId, `${fileName} / ${extFileName}`, destPath, detectFileType(destPath), fs.statSync(destPath).size, text]
            )
            imported.push({ id, file_name: `${fileName} / ${extFileName}`, extracted_text: text })
          }
        } else {
          const destPath = importFileToFolder(folder, srcPath)
          const text = await extractText(destPath)
          const id = uuid()
          execute(
            `INSERT INTO declaration_files (id, declaration_id, file_name, file_path, file_type, file_size, extracted_text)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, declarationId, fileName, destPath, detectFileType(destPath), fs.statSync(destPath).size, text]
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
    const file: any = queryOne('SELECT * FROM declaration_files WHERE id = ?', [fileId])
    if (!file) return null
    const text = await extractText(file.file_path)
    execute('UPDATE declaration_files SET extracted_text = ? WHERE id = ?', [text, fileId])
    return text
  })

  ipcMain.handle('file:list', async (_event, declarationId: string) => {
    return queryAll('SELECT * FROM declaration_files WHERE declaration_id = ? ORDER BY created_at', [declarationId])
  })

  ipcMain.handle('file:delete', async (_event, fileId: string) => {
    const file: any = queryOne('SELECT file_path FROM declaration_files WHERE id = ?', [fileId])
    if (file && fs.existsSync(file.file_path)) {
      fs.unlinkSync(file.file_path)
    }
    execute('DELETE FROM declaration_files WHERE id = ?', [fileId])
    return { success: true }
  })
}
