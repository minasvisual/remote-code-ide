import { useState, useCallback, useMemo } from 'react'
import { Button } from '../commons/Button'
import { Input } from '../commons/Input'
import { Spinner } from '../commons/Spinner'
import { useApp } from '../../../application/contexts/AppContext'
import { useExtensionTheme } from '../../../application/hooks/useExtensionTheme'

interface Extension {
  namespace: string
  name: string
  displayName: string
  version: string
  description: string
  averageRating?: number
  downloadCount?: number
  files?: { assetType: string; source: string }[]
}

const OPENVSX_API = 'https://open-vsx.org/api'

export function ExtensionsPanel() {
  const { notify } = useApp()
  const { installed, install, uninstall, setEnabled } = useExtensionTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Extension[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const installedIds = useMemo(() => new Set(installed.map((e) => e.id)), [installed])

  const search = useCallback(async () => {
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const resp = await fetch(
        `${OPENVSX_API}/-/search?query=${encodeURIComponent(query)}&size=20`,
        { headers: { Accept: 'application/json' } }
      )
      if (!resp.ok) throw new Error(`OpenVSX error: ${resp.status}`)
      const data = await resp.json()
      setResults(data.extensions ?? [])
    } catch (err: unknown) {
      notify('error', `Extension search failed: ${(err as Error).message}`)
    } finally {
      setIsSearching(false)
    }
  }, [query, notify])

  const handleInstall = useCallback(
    async (ext: Extension) => {
      const key = `${ext.namespace}.${ext.name}`
      setInstalling(key)
      try {
        const entry = await install(ext.namespace, ext.name, ext.version)
        notify('success', `Installed ${entry.displayName}`)
      } catch (err: unknown) {
        notify('error', `Install failed: ${(err as Error).message}`)
      } finally {
        setInstalling(null)
      }
    },
    [install, notify]
  )

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      setBusyId(id)
      try {
        await setEnabled(id, enabled)
      } catch (err: unknown) {
        notify('error', `Failed to update extension: ${(err as Error).message}`)
      } finally {
        setBusyId(null)
      }
    },
    [setEnabled, notify]
  )

  const handleUninstall = useCallback(
    async (id: string) => {
      setBusyId(id)
      try {
        await uninstall(id)
        notify('info', 'Extension uninstalled')
      } catch (err: unknown) {
        notify('error', `Uninstall failed: ${(err as Error).message}`)
      } finally {
        setBusyId(null)
      }
    },
    [uninstall, notify]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-ide-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted">
          Extensions (OpenVSX)
        </span>
      </div>

      <div className="flex gap-2 px-3 py-2 border-b border-ide-border">
        <Input
          className="flex-1"
          placeholder="Search extensions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <Button size="sm" onClick={search} disabled={isSearching}>
          {isSearching ? <Spinner size="sm" /> : '🔍'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {installed.length > 0 && (
          <div>
            <div className="px-3 py-1.5 bg-ide-hover/40">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ide-text-muted">
                Installed
              </span>
            </div>
            {installed.map((ext) => (
              <div
                key={ext.id}
                className="flex items-start gap-2 px-3 py-2 hover:bg-ide-hover border-b border-ide-border/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ide-text font-medium truncate">{ext.displayName}</p>
                  <p className="text-xs text-ide-text-muted truncate">v{ext.version}</p>
                  {!ext.hasBasicModeContribution && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-ide-hover text-ide-text-muted">
                      not activatable in basic mode
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(ext.id, !ext.enabled)}
                    disabled={busyId === ext.id}
                  >
                    {busyId === ext.id ? <Spinner size="sm" /> : ext.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUninstall(ext.id)}
                    disabled={busyId === ext.id}
                    title="Uninstall"
                  >
                    🗑
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 0 && !isSearching && installed.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <div className="text-3xl opacity-20">🧩</div>
            <p className="text-xs text-ide-text-muted">
              Search for VSCode-compatible extensions from the OpenVSX registry.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="px-3 py-1.5 bg-ide-hover/40">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ide-text-muted">
              Search Results
            </span>
          </div>
        )}
        {results.map((ext) => {
          const key = `${ext.namespace}.${ext.name}`
          const alreadyInstalled = installedIds.has(key)
          return (
            <div
              key={key}
              className="flex items-start gap-2 px-3 py-2 hover:bg-ide-hover border-b border-ide-border/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ide-text font-medium truncate">{ext.displayName}</p>
                <p className="text-xs text-ide-text-muted truncate">
                  {ext.namespace} · v{ext.version}
                </p>
                <p className="text-xs text-ide-text-muted mt-0.5 line-clamp-2">
                  {ext.description}
                </p>
              </div>
              {alreadyInstalled ? (
                <span className="text-xs text-ide-text-muted shrink-0 px-1 py-1">Already installed</span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleInstall(ext)}
                  disabled={installing === key}
                  className="shrink-0"
                >
                  {installing === key ? <Spinner size="sm" /> : '⬇'}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
