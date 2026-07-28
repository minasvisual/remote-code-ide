import type { InstalledExtension } from '../entities/InstalledExtension'

export interface IExtensionService {
  install(namespace: string, name: string, version: string): Promise<InstalledExtension>
  list(): Promise<InstalledExtension[]>
  uninstall(id: string): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<InstalledExtension>
  readThemeFile(id: string): Promise<string>
}
