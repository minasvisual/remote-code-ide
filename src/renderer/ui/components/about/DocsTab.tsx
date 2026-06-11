const SHORTCUTS = [
  { keys: 'Ctrl+S', description: 'Save current file' },
  { keys: 'Ctrl+W', description: 'Close active tab' },
  { keys: 'Ctrl+Tab', description: 'Cycle to next tab' },
  { keys: 'Ctrl+Shift+Tab', description: 'Cycle to previous tab' },
  { keys: 'Ctrl+`', description: 'Toggle terminal panel' }
]

const INSTRUCTIONS = [
  {
    title: 'Connect to a server',
    body: 'Click the Connections icon (⚡) in the activity bar, then press "New Connection". Fill in host, port, username and password, then click "Connect".'
  },
  {
    title: 'Browse and open files',
    body: 'Once connected, the Explorer panel opens automatically. Click any file to open it in the editor. Right-click for rename, delete, or new file options.'
  },
  {
    title: 'Use the terminal',
    body: 'Click the "Terminal ▸" toggle at the bottom of the editor area to open an integrated SSH terminal for the active session.'
  },
  {
    title: 'Install extensions',
    body: 'Click the Extensions icon (🧩) to search and install language extensions from the OpenVSX registry.'
  }
]

const FAQ = [
  {
    q: 'Can I have multiple connections open at once?',
    a: 'Currently one session is active at a time. Disconnect the current session before opening a new one.'
  },
  {
    q: 'Where are credentials stored?',
    a: "Credentials are encrypted using your OS keychain via Electron's safeStorage API — they are never stored in plain text."
  },
  {
    q: 'How do I upload files?',
    a: 'Right-click a folder in the Explorer and choose "Upload Files" or "Upload Folder".'
  }
]

export function DocsTab() {
  return (
    <div className="p-4 text-ide-text text-sm overflow-y-auto h-full">
      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">Keyboard Shortcuts</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ide-border">
              <th className="text-left py-1 pr-3 text-ide-text-muted font-normal">Keys</th>
              <th className="text-left py-1 text-ide-text-muted font-normal">Description</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys} className="border-b border-ide-border">
                <td className="py-1 pr-3">
                  <kbd className="bg-ide-hover border border-ide-border rounded px-1 font-mono text-[11px]">{s.keys}</kbd>
                </td>
                <td className="py-1 text-ide-text-muted">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">How To</h3>
        <div className="space-y-3">
          {INSTRUCTIONS.map((item) => (
            <div key={item.title}>
              <p className="font-semibold text-ide-text text-xs">{item.title}</p>
              <p className="text-ide-text-muted text-xs mt-0.5 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">FAQ</h3>
        <div className="space-y-3">
          {FAQ.map((item) => (
            <div key={item.q}>
              <p className="font-semibold text-ide-text text-xs">{item.q}</p>
              <p className="text-ide-text-muted text-xs mt-0.5 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
