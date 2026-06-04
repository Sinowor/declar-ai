import { ipcMain, app, BrowserWindow, Menu, dialog } from 'electron'
import { getConfig, saveConfig, getStorageRoot } from '../config'

export function registerAppIpc() {
  ipcMain.handle('app:config', () => {
    return {
      apiBaseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro',
    }
  })

  ipcMain.handle('app:getConfig', () => {
    return { ...getConfig(), storageRoot: getStorageRoot() }
  })

  ipcMain.handle('app:saveConfig', (_event, updates: Record<string, any>) => {
    saveConfig(updates)
    return { ...getConfig(), storageRoot: getStorageRoot() }
  })

  ipcMain.handle('app:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '选择数据存储位置',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('app:about', () => {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.send('app:open-about')
    }
  })
}

export function setupAppMenu() {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: '关于 DeclarAI', click: () => {
          const win = BrowserWindow.getFocusedWindow()
          if (win) win.webContents.send('app:open-about')
        }},
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    {
      label: '文件',
      submenu: isMac ? [{ role: 'close' as const }] : [
        { label: '关于 DeclarAI', click: () => {
          const win = BrowserWindow.getFocusedWindow()
          if (win) win.webContents.send('app:open-about')
        }},
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

