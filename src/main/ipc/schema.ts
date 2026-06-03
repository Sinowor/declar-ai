import { ipcMain } from 'electron'
import { schemaRegistry } from '../../shared/schemas/transit-transport'

export function registerSchemaIpc() {
  ipcMain.handle('schema:get', (_event, type: string) => {
    return schemaRegistry[type] || null
  })

  ipcMain.handle('schema:list', () => {
    return Object.values(schemaRegistry).map((s) => ({
      type: s.type,
      title: s.title,
      description: s.description,
    }))
  })
}
