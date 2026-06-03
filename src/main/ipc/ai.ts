import { ipcMain } from 'electron'
import { runAIExtraction, runAIReview, submitAnswer } from '../ai/extractor'

export function registerAIIpc() {
  ipcMain.handle('ai:extract', async (_event, declarationId: string) => {
    const result = await runAIExtraction(declarationId)
    return result
  })

  ipcMain.handle('ai:review', async (_event, declarationId: string) => {
    const result = await runAIReview(declarationId)
    return result
  })

  ipcMain.handle('ai:answer', async (_event, conversationId: string, answer: string) => {
    const result = await submitAnswer(conversationId, answer)
    return result
  })
}
