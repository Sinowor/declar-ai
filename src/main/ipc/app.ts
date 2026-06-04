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
  const appName = app.name || 'DeclarAI'

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: appName,
      submenu: [
        { label: `关于 ${appName}`, click: () => {
          const win = BrowserWindow.getFocusedWindow()
          if (win) win.webContents.send('app:open-about')
        }},
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ],
    }] : []),
    ...(isMac ? [] : [{
      label: '文件',
      submenu: [{ role: 'quit' as const }],
    }] as any),
    {
      label: '编辑',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
      ],
    },
    {
      label: '显示',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize' as const },
        { role: 'zoom' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
        ] : [{ role: 'close' as const }]),
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

