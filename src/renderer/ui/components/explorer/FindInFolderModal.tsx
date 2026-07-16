import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Spinner } from '../commons/Spinner'
import { Button } from '../commons/Button'
import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'
import { useApp } from '../../../application/contexts/AppContext'
import { useEditor } from '../../../application/contexts/EditorContext'
import type { FileNode } from '../../../domain/entities/FileNode'
import type { SearchFileMatch } from '../../../domain/ports/IRemoteApi'

interface Props {
  sessionId: string
  rootPath: string
  onClose: () => void
}

function HighlightedSnippet({ text, query }: { text: string; query: string }) {
  const idx = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (idx === -1) return <>{text}</>
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + query.length)
  const after = text.slice(idx + query.length)
  return (
    <>
      {before}
      <mark className="bg-ide-accent/40 text-ide-text rounded-sm">{match}</mark>
      {after}
    </>
  )
}

export function FindInFolderModal({ sessionId, rootPath, onClose }: Props) {
  const api = getRemoteApi()
  const { notify } = useApp()
  const { openFile } = useEditor()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchFileMatch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const searchIdRef = useRef<string | null>(null)
  const isSearchingRef = useRef(false)
  const searchedQueryRef = useRef('')

  useEffect(() => { isSearchingRef.current = isSearching }, [isSearching])

  useEffect(() => {
    const unsubscribe = api.sftp.onSearchProgress((event) => {
      if (event.searchId !== searchIdRef.current) return
      if (event.type === 'match' && event.result) {
        setResults((prev) => [...prev, event.result!])
      } else if (event.type === 'done' || event.type === 'cancelled') {
        setIsSearching(false)
      } else if (event.type === 'error') {
        setIsSearching(false)
        notify('error', `Search failed: ${event.error ?? 'Unknown error'}`)
      }
    })
    return () => unsubscribe()
  }, [api, notify])

  const handleClose = useCallback(() => {
    if (isSearchingRef.current && searchIdRef.current) {
      api.sftp.cancelSearch(searchIdRef.current)
    }
    onClose()
  }, [api, onClose])

  // Covers unmount without going through handleClose (e.g. the parent tears the tree down directly)
  useEffect(() => {
    return () => {
      if (isSearchingRef.current && searchIdRef.current) {
        api.sftp.cancelSearch(searchIdRef.current)
      }
    }
  }, [api])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  const startSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    if (searchIdRef.current) {
      api.sftp.cancelSearch(searchIdRef.current)
    }
    setResults([])
    setHasSearched(true)
    searchedQueryRef.current = trimmed
    const { searchId } = await api.sftp.searchInFolder(sessionId, rootPath, trimmed)
    searchIdRef.current = searchId
    setIsSearching(true)
  }, [api, query, sessionId, rootPath])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    startSearch()
  }

  const handleCancelSearch = () => {
    if (searchIdRef.current) {
      api.sftp.cancelSearch(searchIdRef.current)
    }
  }

  const handleResultClick = (result: SearchFileMatch) => {
    const fileNode: FileNode = {
      name: result.name,
      path: result.path,
      type: 'file',
      size: 0,
      modifiedAt: '',
      permissions: '',
      isLoaded: false
    }
    openFile(fileNode, sessionId)
    handleClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-ide-text">Find in Folder</span>
            <span className="block text-xs text-ide-text-muted truncate">{rootPath}</span>
          </div>
          <button
            onClick={handleClose}
            className="text-ide-text-muted hover:text-ide-text text-lg leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-b border-ide-border">
          <input
            autoFocus
            className="flex-1 min-w-0 bg-[#3c3c3c] border border-ide-border rounded px-2 py-1.5 text-sm text-ide-text placeholder-ide-text-muted focus:outline-none focus:border-ide-accent"
            placeholder="Search text..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && <Spinner size="sm" />}
          {isSearching ? (
            <Button type="button" variant="ghost" onClick={handleCancelSearch}>Cancel</Button>
          ) : (
            <Button type="submit" variant="primary" disabled={!query.trim()}>Search</Button>
          )}
        </form>

        <div className="flex-1 overflow-y-auto">
          {!isSearching && hasSearched && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-ide-text-muted text-center">No matches found</p>
          )}
          {results.map((result) => (
            <button
              key={result.path}
              onClick={() => handleResultClick(result)}
              className="w-full text-left px-4 py-2 border-b border-ide-border hover:bg-ide-hover"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-ide-text font-medium truncate">{result.name}</span>
                <span className="text-xs text-ide-text-muted shrink-0">
                  {result.totalMatches} {result.totalMatches === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <div className="text-xs text-ide-text-muted truncate">{result.path}</div>
              <div className="mt-1 flex flex-col gap-0.5">
                {result.matches.map((m) => (
                  <div key={m.line} className="text-xs font-mono text-ide-text-muted truncate">
                    <span className="mr-2">{m.line}:</span>
                    <HighlightedSnippet text={m.text} query={searchedQueryRef.current} />
                  </div>
                ))}
                {result.totalMatches > result.matches.length && (
                  <div className="text-xs text-ide-text-muted italic">
                    +{result.totalMatches - result.matches.length} more
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
