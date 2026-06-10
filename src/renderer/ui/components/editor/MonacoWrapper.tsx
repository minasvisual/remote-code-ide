import { useEffect, useRef, useCallback } from 'react'
import Editor, { useMonaco, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type * as MonacoType from 'monaco-editor'
import { useEditor } from '../../../application/contexts/EditorContext'
import { Spinner } from '../commons/Spinner'

// Workers must be imported as ?worker so Vite bundles them as blob: URLs.
// This avoids CDN loading (which the CSP blocks in production).
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Set up MonacoEnvironment before loader.config so Monaco finds the workers.
;(window as Window & { MonacoEnvironment?: unknown }).MonacoEnvironment = {
  getWorker(_: string, label: string): Worker {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

// Tell @monaco-editor/react to use the already-bundled Monaco instance
// instead of loading it dynamically from a CDN <script> tag.
loader.config({ monaco })

export function MonacoWrapper() {
  const { tabs, activeTabId, updateContent, saveActiveFile, isSaving } = useEditor()
  const monacoInstance = useMonaco()
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null)
  const saveActiveFileRef = useRef(saveActiveFile)
  saveActiveFileRef.current = saveActiveFile
  const tab = tabs.find((t) => t.id === activeTabId)

  // Reuse Monaco models across tab switches to preserve undo history.
  // Guard on isLoading: the model must be created with real content, not the empty placeholder.
  useEffect(() => {
    if (!editorRef.current || !monacoInstance || !tab || tab.isLoading) return
    const uri = monacoInstance.Uri.parse(`remote://${tab.sessionId}${tab.remotePath}`)
    let model = monacoInstance.editor.getModel(uri)
    if (!model) {
      model = monacoInstance.editor.createModel(tab.content, tab.language, uri)
    }
    if (editorRef.current.getModel()?.uri.toString() !== uri.toString()) {
      editorRef.current.setModel(model)
    }
  }, [tab?.id, tab?.isLoading, monacoInstance])

  const handleMount = useCallback(
    (editor: MonacoType.editor.IStandaloneCodeEditor, monacoArg: typeof MonacoType) => {
      editorRef.current = editor
      editor.addCommand(
        monacoArg.KeyMod.CtrlCmd | monacoArg.KeyCode.KeyS,
        () => saveActiveFileRef.current()
      )
    },
    []
  )

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (tab && value !== undefined) updateContent(tab.id, value)
    },
    [tab?.id, updateContent]
  )

  if (!tab) return null

  // Editor is always mounted to prevent Monaco's InstantiationService from being
  // disposed mid-tab-switch. A loading overlay covers it while content is fetching.
  return (
    <div className="relative w-full h-full">
      <Editor
        height="100%"
        theme="vs-dark"
        defaultValue=""
        onMount={handleMount}
        onChange={handleChange}
        options={{
          fontSize: 14,
          fontFamily: 'Consolas, "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
          fontLigatures: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          smoothScrolling: true,
          cursorBlinking: 'blink',
          renderLineHighlight: 'all',
          overviewRulerBorder: false,
          scrollbar: {
            useShadows: false,
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
          }
        }}
        loading={<div className="flex items-center justify-center h-full"><Spinner /></div>}
      />
      {tab.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ide-bg z-10">
          <Spinner />
        </div>
      )}
      {isSaving && (
        <div className="absolute top-2 right-4 bg-ide-sidebar/90 text-xs text-ide-text px-2 py-1 rounded flex items-center gap-1 z-10">
          <Spinner size="sm" /> Saving…
        </div>
      )}
    </div>
  )
}
