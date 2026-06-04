import { ipcMain } from 'electron'
import { classifyHsCode, saveToHistory, getHistory, initHsClassifierDb } from '../hs-code/classifier'

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

  ipcMain.handle('hs:history', async () => {
    try {
      return getHistory()
    } catch (err: any) {
      console.error('[ipc:hs:history]', err.message)
      return []
    }
  })
}
