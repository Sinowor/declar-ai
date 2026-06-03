import { ipcMain } from 'electron'
import { runAIExtraction, runAIReview, submitAnswer } from '../ai/extractor'

export function registerAIIpc() {
  ipcMain.handle('ai:extract', async (_event, declarationId: string) => {
    try {
      return await runAIExtraction(declarationId)
    } catch (err: any) {
      console.error('[ipc:ai:extract]', err.message)
      return { success: false, error: `AI 提取异常: ${err.message}` }
    }
  })

  ipcMain.handle('ai:review', async (_event, declarationId: string) => {
    try {
      return await runAIReview(declarationId)
    } catch (err: any) {
      console.error('[ipc:ai:review]', err.message)
      return { success: false, error: `AI 审核异常: ${err.message}` }
    }
  })

  ipcMain.handle('ai:answer', async (_event, conversationId: string, answer: string) => {
    try {
      return await submitAnswer(conversationId, answer)
    } catch (err: any) {
      console.error('[ipc:ai:answer]', err.message)
      return { success: false, error: `保存答复异常: ${err.message}` }
    }
  })
}
