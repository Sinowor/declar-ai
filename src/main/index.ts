import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { getDb, closeDb } from './db'
import { loadEnv } from './config'
import { registerDeclarationIpc } from './ipc/declaration'
import { registerSchemaIpc } from './ipc/schema'
import { registerAppIpc } from './ipc/app'
import { registerFileIpc } from './ipc/file'
import { registerAIIpc } from './ipc/ai'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function initApp() {
  loadEnv()
  getDb()
  registerDeclarationIpc()
  registerSchemaIpc()
  registerAppIpc()
  registerFileIpc()
  registerAIIpc()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'DeclarAI - 过境转关报关单自动化制单',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initApp()
  createWindow()
})

app.on('before-quit', () => {
  closeDb()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
