import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { closeDb } from './db'
import { loadEnv } from './config'
import { registerDeclarationIpc } from './ipc/declaration'
import { registerSchemaIpc } from './ipc/schema'
import { registerAppIpc, setupAppMenu } from './ipc/app'
import { registerFileIpc } from './ipc/file'
import { registerAIIpc } from './ipc/ai'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

async function initApp() {
  loadEnv()
  setupAppMenu()
  registerSchemaIpc()
  registerAppIpc()
  await registerDeclarationIpc()
  await registerFileIpc()
  registerAIIpc()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'DeclarAI - 过境转关报关单自动化制单',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform === 'darwin' ? true : true,
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

app.whenReady().then(async () => {
  app.setAboutPanelOptions({
    applicationName: 'DeclarAI',
    applicationVersion: '1.0.0',
    copyright: 'Copyright © 2026 Sinowor. All rights reserved.',
    credits: '基于 AI LLM 的过境转关报关单自动化制单系统',
    website: 'https://github.com/Sinowor/declar-ai',
  })
  await initApp()
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
