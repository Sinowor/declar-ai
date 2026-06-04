import { ipcMain } from 'electron'
import { getType, getTypeLabels, getAllTypes } from '../declaration-types'

export function registerSchemaIpc() {
  ipcMain.handle('schema:get', (_event, type: string) => {
    return getType(type as any) || null
  })

  ipcMain.handle('schema:list', () => {
    return getTypeLabels()
  })

  ipcMain.handle('schema:all', () => {
    return getAllTypes()
  })
}
