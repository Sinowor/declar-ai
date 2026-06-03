import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Declaration CRUD
  getDeclarations: (search?: string) => ipcRenderer.invoke('declaration:list', search),
  getDeclaration: (id: string) => ipcRenderer.invoke('declaration:get', id),
  createDeclaration: () => ipcRenderer.invoke('declaration:create'),
  updateDeclaration: (id: string, data: unknown) => ipcRenderer.invoke('declaration:update', id, data),
  deleteDeclaration: (id: string) => ipcRenderer.invoke('declaration:delete', id),

  // File operations
  openFileDialog: () => ipcRenderer.invoke('file:dialog'),
  importFiles: (declarationId: string, filePaths: string[]) => ipcRenderer.invoke('file:import', declarationId, filePaths),
  extractText: (fileId: string) => ipcRenderer.invoke('file:extract-text', fileId),
  getFiles: (declarationId: string) => ipcRenderer.invoke('file:list', declarationId),
  deleteFile: (fileId: string) => ipcRenderer.invoke('file:delete', fileId),

  // AI operations
  aiExtract: (declarationId: string) => ipcRenderer.invoke('ai:extract', declarationId),
  aiReview: (declarationId: string) => ipcRenderer.invoke('ai:review', declarationId),
  aiAnswer: (conversationId: string, answer: string) => ipcRenderer.invoke('ai:answer', conversationId, answer),

  // Schema
  getSchema: (type: string) => ipcRenderer.invoke('schema:get', type),

  // App
  getAppConfig: () => ipcRenderer.invoke('app:config'),
  showAbout: () => ipcRenderer.invoke('app:about'),
  onOpenAbout: (callback: () => void) => {
    ipcRenderer.on('app:open-about', callback)
    return () => ipcRenderer.removeListener('app:open-about', callback)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
