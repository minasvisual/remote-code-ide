import Store = require('electron-store')
import { app } from 'electron'
import { join, resolve, sep } from 'path'
import { promises as fsp, mkdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import extract from 'extract-zip'
import { v4 as uuidv4 } from 'uuid'
import type { IExtensionService } from '../../domain/ports/IExtensionService'
import type { InstalledExtension } from '../../domain/entities/InstalledExtension'

const NAME_PATTERN = /^[a-zA-Z0-9_-]+$/
const OPENVSX_API = 'https://open-vsx.org/api'

interface StoreSchema {
  extensions: InstalledExtension[]
}

interface ExtensionManifest {
  name?: string
  displayName?: string
  contributes?: {
    themes?: { label?: string; path: string }[]
  }
}

function resolveWithinDir(baseDir: string, relPath: string): string {
  const base = resolve(baseDir)
  const resolved = resolve(base, relPath)
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    throw new Error('Resolved path escapes the extension install directory')
  }
  return resolved
}

export class VsixExtensionService implements IExtensionService {
  private store: Store<StoreSchema>
  private extensionsRoot: string

  constructor() {
    this.store = new Store<StoreSchema>({ name: 'extensions', defaults: { extensions: [] } })
    this.extensionsRoot = join(app.getPath('userData'), 'extensions')
    mkdirSync(this.extensionsRoot, { recursive: true })
  }

  async install(namespace: string, name: string, version: string): Promise<InstalledExtension> {
    if (!NAME_PATTERN.test(namespace) || !NAME_PATTERN.test(name)) {
      throw new Error('Extension namespace/name contains invalid characters')
    }

    const id = `${namespace}.${name}`
    const installDir = join(this.extensionsRoot, `${namespace}.${name}-${version}`)
    const vsixUrl = `${OPENVSX_API}/${namespace}/${name}/${version}/file/${namespace}.${name}-${version}.vsix`
    const tempZipPath = join(tmpdir(), `${namespace}.${name}-${version}-${uuidv4()}.vsix`)

    let response: Response
    try {
      response = await fetch(vsixUrl)
    } catch (err: unknown) {
      throw new Error(`Failed to download extension: ${(err as Error).message}`)
    }
    if (!response.ok) {
      throw new Error(`Failed to download extension: HTTP ${response.status}`)
    }

    try {
      const buffer = Buffer.from(await response.arrayBuffer())
      await fsp.writeFile(tempZipPath, buffer)

      mkdirSync(installDir, { recursive: true })
      await extract(tempZipPath, { dir: installDir })

      const manifestPath = join(installDir, 'extension', 'package.json')
      const manifestRaw = await fsp.readFile(manifestPath, 'utf8')
      const manifest = JSON.parse(manifestRaw) as ExtensionManifest

      const themes = manifest.contributes?.themes ?? []
      const hasBasicModeContribution = themes.length > 0
      const themeFile = hasBasicModeContribution ? themes[0].path : undefined

      const entry: InstalledExtension = {
        id,
        namespace,
        name,
        version,
        displayName: manifest.displayName ?? manifest.name ?? name,
        enabled: false,
        hasBasicModeContribution,
        installDir,
        themeFile
      }

      const extensions = this.store.get('extensions', []).filter((e) => e.id !== id)
      this.store.set('extensions', [...extensions, entry])

      return entry
    } catch (err: unknown) {
      rmSync(installDir, { recursive: true, force: true })
      throw new Error(`Failed to install extension: ${(err as Error).message}`)
    } finally {
      rmSync(tempZipPath, { force: true })
    }
  }

  async list(): Promise<InstalledExtension[]> {
    return this.store.get('extensions', [])
  }

  async uninstall(id: string): Promise<void> {
    const extensions = this.store.get('extensions', [])
    const entry = extensions.find((e) => e.id === id)
    if (!entry) throw new Error(`Extension ${id} is not installed`)

    rmSync(entry.installDir, { recursive: true, force: true })
    this.store.set('extensions', extensions.filter((e) => e.id !== id))
  }

  async setEnabled(id: string, enabled: boolean): Promise<InstalledExtension> {
    const extensions = this.store.get('extensions', [])
    const entry = extensions.find((e) => e.id === id)
    if (!entry) throw new Error(`Extension ${id} is not installed`)

    const updated: InstalledExtension = { ...entry, enabled }
    this.store.set('extensions', extensions.map((e) => (e.id === id ? updated : e)))
    return updated
  }

  async readThemeFile(id: string): Promise<string> {
    const extensions = this.store.get('extensions', [])
    const entry = extensions.find((e) => e.id === id)
    if (!entry) throw new Error(`Extension ${id} is not installed`)
    if (!entry.themeFile) throw new Error(`Extension ${id} has no theme contribution`)

    const extensionDir = join(entry.installDir, 'extension')
    const themePath = resolveWithinDir(extensionDir, entry.themeFile)
    return fsp.readFile(themePath, 'utf8')
  }
}
