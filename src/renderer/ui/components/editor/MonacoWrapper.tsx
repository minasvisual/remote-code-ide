import { useEffect, useRef, useCallback } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import type * as MonacoType from 'monaco-editor'
import { useEditor } from '../../../application/contexts/EditorContext'
import { Spinner } from '../commons/Spinner'

// 'vscode' resolves to @codingame/monaco-vscode-api via package.json alias,
// enabling VSCode extensions to use the full vscode API surface at runtime.
// Service overrides are loaded lazily in src/renderer/application/vscode/setup.ts
// when extensions are installed via the OpenVSX panel.

export function MonacoWrapper() {
  const { tabs, activeTabId, updateContent, saveActiveFile, isSaving } = useEditor()
  const monaco = useMonaco()
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null)
  const saveActiveFileRef = useRef(saveActiveFile)
  saveActiveFileRef.current = saveActiveFile
  const tab = tabs.find((t) => t.id === activeTabId)

  // Reuse Monaco models across tab switches to preserve undo history
  useEffect(() => {
    if (!editorRef.current || !monaco || !tab) return
    const uri = monaco.Uri.parse(`remote://${tab.sessionId}${tab.remotePath}`)
    let model = monaco.editor.getModel(uri)
    if (!model) {
      model = monaco.editor.createModel(tab.content, tab.language, uri)
    }
    if (editorRef.current.getModel()?.uri.toString() !== uri.toString()) {
      editorRef.current.setModel(model)
    }
  }, [tab?.id, monaco])

  const handleMount = useCallback(
    (editor: MonacoType.editor.IStandaloneCodeEditor, monacoInstance: typeof MonacoType) => {
      editorRef.current = editor
      editor.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
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
  if (tab.isLoading) {
    return <div className="flex items-center justify-center h-full"><Spinner /></div>
  }

  return (
    <div className="relative w-full h-full">
      <Editor
        height="100%"
        language={tab.language}
        value={tab.content}
        theme="vs-dark"
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
      {isSaving && (
        <div className="absolute top-2 right-4 bg-ide-sidebar/90 text-xs text-ide-text px-2 py-1 rounded flex items-center gap-1 z-10">
          <Spinner size="sm" /> Saving…
        </div>
      )}
    </div>
  )
}
