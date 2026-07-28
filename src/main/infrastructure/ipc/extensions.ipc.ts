import { ipcMain } from 'electron'
import type { IExtensionService } from '../../domain/ports/IExtensionService'

export function registerExtensionsIpc(service: IExtensionService): void {
  ipcMain.handle('extensions:install', async (_e, namespace: string, name: string, version: string) => {
    try {
      const data = await service.install(namespace, name, version)
      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('extensions:list', async () => {
    try {
      const data = await service.list()
      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('extensions:uninstall', async (_e, id: string) => {
    try {
      await service.uninstall(id)
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('extensions:setEnabled', async (_e, id: string, enabled: boolean) => {
    try {
      const data = await service.setEnabled(id, enabled)
      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('extensions:readThemeFile', async (_e, id: string) => {
    try {
      const data = await service.readThemeFile(id)
      return { success: true, data }
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message }
    }
  })
}
