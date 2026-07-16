import { getRemoteApi } from '../../../adapters/api/WindowRemoteApi'

declare const __APP_VERSION__: string

const CHANGELOG = [
  {
    version: 'Unreleased',
    date: '2026-07-16',
    notes: [
      'Added Copy/Paste to the file explorer: duplicate a file or folder entirely server-side (recursive for folders), with an overwrite-confirmation dialog and a guard against pasting a folder into itself.',
      'Downloads (file and folder) now report byte-level progress and can be cancelled mid-transfer, with partial files cleaned up automatically.',
      'Closing the app while a download is in progress now asks for confirmation ("Cancel downloads and close" / "Keep downloading") instead of interrupting the transfer silently.'
    ]
  },
  {
    version: '0.1.6',
    date: '2026-07-13',
    notes: [
      'Fixed release pipeline: package-lock.json now stays in sync with the release version, and electron-builder no longer auto-publishes on tag builds.'
    ]
  },
  {
    version: '0.1.5',
    date: '2026-07-13',
    notes: [
      'Scoped the native build skip to cpu-features and fixed tag push in the release workflow.'
    ]
  },
  {
    version: '0.1.4',
    date: '2026-07-13',
    notes: [
      'Added scripts/tag.js for tagging releases independently of publishing.',
      'CI: skip optional dependencies during npm ci to avoid native build hangs.'
    ]
  },
  {
    version: '0.1.3',
    date: '2026-07-13',
    notes: [
      'Fixed an overbroad .gitignore rule that was excluding TempFileManager from version control.'
    ]
  },
  {
    version: '0.1.2',
    date: '2026-07-13',
    notes: [
      'CI: use Node 24 in the release workflow to match the npm 11 lockfile.'
    ]
  },
  {
    version: '0.1.1',
    date: '2026-07-13',
    notes: [
      'Added SSH key setup tutorial modal to the connection form.',
      'Terminal now auto-starts with the session, opens in the connection\'s Initial Directory automatically, and supports a right-click context menu (copy/paste).',
      'Added an "Open Terminal Here" action to folder context menus in the file explorer.',
      'Added drag-to-resize panels and an unsaved changes confirmation dialog.',
      'Added file and folder download from the remote file explorer (including download-folder-as-zip).'
    ]
  },
  {
    version: '0.1.0',
    date: '2026-06-11',
    notes: [
      'Initial release with SSH/SFTP support, Monaco editor, integrated terminal, and connection manager (context menu, edit flow, keyboard shortcuts).',
      'Added file explorer support for new file creation and rename/delete via context menu.',
      'Added file uploads to the remote file explorer.',
      'Added an optional "Initial Directory" field to connections, so the explorer starts there instead of at "/".',
      'Added the About panel (app info, runtime versions, changelog, and a Docs tab with keyboard shortcuts and FAQ).'
    ]
  }
]

export function AboutTab() {
  const { node, electron, chrome } = getRemoteApi().versions

  return (
    <div className="p-4 text-ide-text text-sm overflow-y-auto h-full">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-ide-text mb-1">Remote Code IDE</h2>
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
        <p className="text-xs mt-1">
          <a
            href="https://github.com/minasvisual/remote-code-ide"
            target="_blank"
            rel="noreferrer"
            className="text-ide-accent hover:underline"
          >
            github.com/minasvisual/remote-code-ide
          </a>
        </p>
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted mb-2">Changelog</h3>
        <div className="space-y-3">
          {CHANGELOG.map((entry) => (
            <div key={entry.version}>
              <p className="font-semibold text-ide-text">
                {entry.version === 'Unreleased' ? 'Unreleased' : `v${entry.version}`}{' '}
                <span className="text-ide-text-muted font-normal">— {entry.date}</span>
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
