import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'

declare const __APP_VERSION__: string

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2026-06-11',
    notes: ['Initial release with SSH/SFTP support, Monaco editor, integrated terminal, and Extensions panel.']
  }
]

export function AboutTab() {
  const { node, electron, chrome } = getRemoteApi().versions

  return (
    <div className="p-4 text-ide-text text-sm overflow-y-auto h-full">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-ide-text mb-1">MyCodAny</h2>
        <p className="text-ide-text-muted">Version {__APP_VERSION__}</p>
      </div>

      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">Runtime</h3>
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-ide-border">
              <td className="py-1 pr-3 text-ide-text-muted">Electron</td>
              <td className="py-1 font-mono">{electron}</td>
            </tr>
            <tr className="border-b border-ide-border">
              <td className="py-1 pr-3 text-ide-text-muted">Node.js</td>
              <td className="py-1 font-mono">{node}</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 text-ide-text-muted">Chromium</td>
              <td className="py-1 font-mono">{chrome}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">About</h3>
        <p className="text-ide-text-muted text-xs leading-relaxed">
          Author: Ulisses Mantovani
        </p>
        <p className="text-ide-text-muted text-xs mt-1">License: MIT</p>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">Changelog</h3>
        <div className="space-y-3">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <p className="font-semibold text-ide-text">
                v{entry.version} <span className="text-ide-text-muted font-normal">— {entry.date}</span>
              </p>
              <ul className="mt-1 space-y-0.5">
                {entry.notes.map((note, i) => (
                  <li key={i} className="text-ide-text-muted text-xs before:content-['•'] before:mr-2">{note}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
