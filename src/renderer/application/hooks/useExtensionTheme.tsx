import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import * as monaco from 'monaco-editor'
import { getRemoteApi } from '../../adapters/api/WindowRemoteApi'
import type { InstalledExtension } from '../../domain/entities/InstalledExtension'

const DEFAULT_THEME = 'vs-dark'

interface VscodeThemeJson {
  type?: string
  colors?: Record<string, string>
  tokenColors?: {
    scope?: string | string[]
    settings?: { foreground?: string; background?: string; fontStyle?: string }
  }[]
}

function baseForType(type?: string): monaco.editor.BuiltinTheme {
  if (type === 'light') return 'vs'
  if (type === 'hc' || type === 'hc-black') return 'hc-black'
  return 'vs-dark'
}

// Monaco's defineTheme only accepts `/^[a-z0-9-]+$/i` — extension ids contain
// `.` (namespace.name), so non-matching characters must be replaced.
function themeIdFor(extensionId: string): string {
  return `ext-theme-${extensionId.replace(/[^a-zA-Z0-9-]/g, '-')}`
}

function toMonacoThemeData(json: VscodeThemeJson): monaco.editor.IStandaloneThemeData {
  const rules: monaco.editor.ITokenThemeRule[] = []
  for (const tokenColor of json.tokenColors ?? []) {
    const scopes = Array.isArray(tokenColor.scope)
      ? tokenColor.scope
      : tokenColor.scope
        ? [tokenColor.scope]
        : []
    for (const scope of scopes) {
      rules.push({
        token: scope,
        foreground: tokenColor.settings?.foreground?.replace('#', ''),
        background: tokenColor.settings?.background?.replace('#', ''),
        fontStyle: tokenColor.settings?.fontStyle
      })
    }
  }
  return {
    base: baseForType(json.type),
    inherit: true,
    rules,
    colors: json.colors ?? {}
  }
}

interface ExtensionThemeContextValue {
  installed: InstalledExtension[]
  activeThemeId: string
  refresh(): Promise<void>
  install(namespace: string, name: string, version: string): Promise<InstalledExtension>
  uninstall(id: string): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<void>
}

const ExtensionThemeContext = createContext<ExtensionThemeContextValue | null>(null)

export function ExtensionThemeProvider({ children }: { children: ReactNode }) {
  const api = getRemoteApi()
  const [installed, setInstalled] = useState<InstalledExtension[]>([])
  const [activeThemeId, setActiveThemeId] = useState(DEFAULT_THEME)

  const refresh = useCallback(async () => {
    const list = await api.extensions.list()
    setInstalled(list)
  }, [api])

  useEffect(() => {
    refresh().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const activateTheme = useCallback(
    async (ext: InstalledExtension) => {
      const raw = await api.extensions.readThemeFile(ext.id)
      const json = JSON.parse(raw) as VscodeThemeJson
      const themeId = themeIdFor(ext.id)
      monaco.editor.defineTheme(themeId, toMonacoThemeData(json))
      setActiveThemeId(themeId)
    },
    [api]
  )

  const install = useCallback(
    async (namespace: string, name: string, version: string) => {
      const entry = await api.extensions.install(namespace, name, version)
      setInstalled((prev) => [...prev.filter((e) => e.id !== entry.id), entry])
      return entry
    },
    [api]
  )

  const uninstallExtension = useCallback(
    async (id: string) => {
      const wasActive = activeThemeId === themeIdFor(id)
      await api.extensions.uninstall(id)
      setInstalled((prev) => prev.filter((e) => e.id !== id))
      if (wasActive) setActiveThemeId(DEFAULT_THEME)
    },
    [api, activeThemeId]
  )

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const updated = await api.extensions.setEnabled(id, enabled)
      setInstalled((prev) => prev.map((e) => (e.id === id ? updated : e)))

      if (!updated.hasBasicModeContribution) return

      if (enabled) {
        await activateTheme(updated)
      } else if (activeThemeId === themeIdFor(id)) {
        setActiveThemeId(DEFAULT_THEME)
      }
    },
    [api, activeThemeId, activateTheme]
  )

  return (
    <ExtensionThemeContext.Provider
      value={{ installed, activeThemeId, refresh, install, uninstall: uninstallExtension, setEnabled }}
    >
      {children}
    </ExtensionThemeContext.Provider>
  )
}

export function useExtensionTheme(): ExtensionThemeContextValue {
  const ctx = useContext(ExtensionThemeContext)
  if (!ctx) throw new Error('useExtensionTheme must be used within ExtensionThemeProvider')
  return ctx
}
