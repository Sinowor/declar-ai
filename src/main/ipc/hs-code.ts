import { ipcMain, dialog } from 'electron'
import { classifyHsCode, saveToHistory, getHistory, initHsClassifierDb } from '../hs-code/classifier'
import { batchClassify, parseExcel, exportToExcel } from '../hs-code/batch-classifier'

export async function registerHsCodeIpc() {
  await initHsClassifierDb()

  ipcMain.handle('hs:classify', async (_event, productDescription: string, skipInfoCheck?: boolean) => {
    try {
      const result = await classifyHsCode(productDescription, skipInfoCheck)
      if (result.success && result.result) {
        saveToHistory(result.result)
      }
      return result
    } catch (err: any) {
      console.error('[ipc:hs:classify]', err.message)
      return { success: false, error: `归类失败: ${err.message}` }
    }
  })

  ipcMain.handle('hs:batchClassify', async (_event, filePath: string) => {
    try {
      const { text } = parseExcel(filePath)
      return await batchClassify(text)
    } catch (err: any) {
      console.error('[ipc:hs:batchClassify]', err.message)
      return { success: false, error: `批量归类失败: ${err.message}` }
    }
  })

  ipcMain.handle('hs:history', async () => {
    try {
      return getHistory()
    } catch (err: any) {
      console.error('[ipc:hs:history]', err.message)
      return []
    }
  })

  ipcMain.handle('hs:exportExcel', async (_event, results: any[]) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '导出 HS 归类结果',
        defaultPath: 'HS归类结果.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      })
      if (result.canceled || !result.filePath) return { success: false, error: '取消导出' }
      exportToExcel(results, result.filePath)
      return { success: true, path: result.filePath }
    } catch (err: any) {
      console.error('[ipc:hs:exportExcel]', err.message)
      return { success: false, error: `导出失败: ${err.message}` }
    }
  })

  ipcMain.handle('hs:openBatchFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
