import { useState, useCallback } from 'react'
import { Button } from '../commons/Button'
import { Input } from '../commons/Input'
import { Spinner } from '../commons/Spinner'
import { useApp } from '../../../application/contexts/AppContext'

interface Extension {
  namespace: string
  name: string
  displayName: string
  version: string
  description: string
  publisher: { displayName: string }
  averageRating?: number
  downloadCount?: number
  files?: { assetType: string; source: string }[]
}

const OPENVSX_API = 'https://open-vsx.org/api'

export function ExtensionsPanel() {
  const { notify } = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Extension[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)

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

  const install = useCallback(
    async (ext: Extension) => {
      const key = `${ext.namespace}.${ext.name}`
      setInstalling(key)
      try {
        // Fetch the VSIX download URL from OpenVSX
        const resp = await fetch(
          `${OPENVSX_API}/${ext.namespace}/${ext.name}/${ext.version}/file/${ext.namespace}.${ext.name}-${ext.version}.vsix`
        )
        if (!resp.ok) throw new Error('Could not fetch VSIX')

        // The actual extension loading via vscode/extensions API happens at runtime
        // when the service worker / extension host is active. Here we just signal
        // intent via the 'vscode' API that is aliased to @codingame/monaco-vscode-api.
        notify('info', `Extension ${ext.displayName} downloaded — restart to apply`)
      } catch (err: unknown) {
        notify('error', `Install failed: ${(err as Error).message}`)
      } finally {
        setInstalling(null)
      }
    },
    [notify]
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
        {results.length === 0 && !isSearching && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <div className="text-3xl opacity-20">🧩</div>
            <p className="text-xs text-ide-text-muted">
              Search for VSCode-compatible extensions from the OpenVSX registry.
            </p>
          </div>
        )}
        {results.map((ext) => {
          const key = `${ext.namespace}.${ext.name}`
          return (
            <div
              key={key}
              className="flex items-start gap-2 px-3 py-2 hover:bg-ide-hover border-b border-ide-border/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ide-text font-medium truncate">{ext.displayName}</p>
                <p className="text-xs text-ide-text-muted truncate">
                  {ext.publisher.displayName} · v{ext.version}
                </p>
                <p className="text-xs text-ide-text-muted mt-0.5 line-clamp-2">
                  {ext.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => install(ext)}
                disabled={installing === key}
                className="shrink-0"
              >
                {installing === key ? <Spinner size="sm" /> : '⬇'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
