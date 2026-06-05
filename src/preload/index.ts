import { contextBridge, ipcRenderer, webUtils } from 'electron'

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
  getFilePath: (file: File) => webUtils.getPathForFile(file),
  openFile: (fileId: string) => ipcRenderer.invoke('file:open', fileId),
  revealFile: (fileId: string) => ipcRenderer.invoke('file:reveal', fileId),
  listAllFiles: (declarationId: string) => ipcRenderer.invoke('file:list-all', declarationId),
  updateFileTags: (fileId: string, tags: string[]) => ipcRenderer.invoke('file:update-tags', fileId, tags),

  // AI operations
  aiExtract: (declarationId: string) => ipcRenderer.invoke('ai:extract', declarationId),
  aiReview: (declarationId: string) => ipcRenderer.invoke('ai:review', declarationId),
  aiAnswer: (conversationId: string, answer: string) => ipcRenderer.invoke('ai:answer', conversationId, answer),

  // HS Code
  hsClassify: (productDescription: string, skipInfoCheck?: boolean) => ipcRenderer.invoke('hs:classify', productDescription, skipInfoCheck),
  hsBatchClassify: (filePath: string) => ipcRenderer.invoke('hs:batchClassify', filePath),
  hsExportExcel: (results: any[]) => ipcRenderer.invoke('hs:exportExcel', results),
  hsOpenBatchFile: () => ipcRenderer.invoke('hs:openBatchFile'),
  hsHistory: () => ipcRenderer.invoke('hs:history'),

  // Schema
  getSchema: (type: string) => ipcRenderer.invoke('schema:get', type),
  getSchemaList: () => ipcRenderer.invoke('schema:list'),
  getSchemaAll: () => ipcRenderer.invoke('schema:all'),
  setDeclarationType: (id: string, typeKey: string) => ipcRenderer.invoke('declaration:setType', id, typeKey),

  // Data management
  customsOfficesList: (search?: string) => ipcRenderer.invoke('data:customs-offices:list', search),
  customsOfficesSave: (office: { code: string; name: string; parent_name?: string }) => ipcRenderer.invoke('data:customs-offices:save', office),
  customsOfficesDelete: (code: string) => ipcRenderer.invoke('data:customs-offices:delete', code),
  enterprisesList: () => ipcRenderer.invoke('data:enterprises:list'),
  enterprisesSave: (enterprise: { id?: string; credit_code?: string; customs_code?: string; name: string; short_name?: string }) => ipcRenderer.invoke('data:enterprises:save', enterprise),
  enterprisesDelete: (id: string) => ipcRenderer.invoke('data:enterprises:delete', id),
  enterprisesSetDefault: (id: string) => ipcRenderer.invoke('data:enterprises:set-default', id),
  enterprisesGetDefault: () => ipcRenderer.invoke('data:enterprises:get-default'),
  templatesList: (typeKey?: string) => ipcRenderer.invoke('data:templates:list', typeKey),
  templatesSave: (template: { id?: string; name: string; type_key: string; template_data: string }) => ipcRenderer.invoke('data:templates:save', template),
  templatesDelete: (id: string) => ipcRenderer.invoke('data:templates:delete', id),
  exportTransitExcel: (declarationId: string) => ipcRenderer.invoke('export:transit-excel', declarationId),
  exportTransitPdf: (declarationId: string) => ipcRenderer.invoke('export:transit-pdf', declarationId),

  // App
  getAppConfig: () => ipcRenderer.invoke('app:config'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  getConfig: () => ipcRenderer.invoke('app:getConfig'),
  saveConfig: (updates: Record<string, any>) => ipcRenderer.invoke('app:saveConfig', updates),
  selectFolder: () => ipcRenderer.invoke('app:selectFolder'),
  showAbout: () => ipcRenderer.invoke('app:about'),
  onOpenAbout: (callback: () => void) => {
    ipcRenderer.on('app:open-about', callback)
    return () => ipcRenderer.removeListener('app:open-about', callback)
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
