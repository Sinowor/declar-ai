import { ipcMain } from 'electron'

export function registerAppIpc() {
  ipcMain.handle('app:config', () => {
    return {
      apiBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    }
  })
}
