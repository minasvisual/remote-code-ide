import { useState } from 'react'

interface Props {
  onClose(): void
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative group/code">
      <pre className="bg-[#1e1e1e] border border-ide-border rounded px-3 py-2 text-xs text-ide-text font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[10px] rounded bg-ide-activitybar border border-ide-border text-ide-text-muted hover:text-ide-text opacity-0 group-hover/code:opacity-100 transition-opacity"
      >
        {copied ? 'copied!' : 'copy'}
      </button>
    </div>
  )
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ide-text border-b border-ide-border pb-1">{title}</h3>
      <div className="flex flex-col gap-2 text-xs text-ide-text leading-relaxed">{children}</div>
    </div>
  )
}

export function SshKeyTutorialModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <div className="bg-ide-sidebar border border-ide-border rounded-lg shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ide-border shrink-0">
          <span className="text-sm font-semibold text-ide-text">
            How to generate an OpenSSH key from your private key
          </span>
          <button
            onClick={onClose}
            className="text-ide-text-muted hover:text-ide-text text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-5">

          {/* 1 — identify key type */}
          <SectionBlock title="1. Identify your key type">
            <p>Open the key file and check the header line:</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-ide-border">
                  <th className="text-left py-1 pr-4 text-ide-text-muted font-medium">Header</th>
                  <th className="text-left py-1 text-ide-text-muted font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ide-border">
                {[
                  ['-----BEGIN RSA PRIVATE KEY-----', 'RSA classic PEM — ready to use ✓'],
                  ['-----BEGIN OPENSSH PRIVATE KEY-----', 'OpenSSH native — ready to use ✓'],
                  ['-----BEGIN EC PRIVATE KEY-----', 'ECDSA PEM — ready to use ✓'],
                  ['-----BEGIN DSA PRIVATE KEY-----', 'DSA PEM — ready to use ✓'],
                  ['.ppk file', 'PuTTY format — needs conversion'],
                ].map(([header, type]) => (
                  <tr key={header}>
                    <td className="py-1.5 pr-4 font-mono text-[11px] text-ide-text">{header}</td>
                    <td className="py-1.5 text-ide-text-muted">{type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-ide-text-muted">
              If the header matches any of the first four rows, paste the <strong className="text-ide-text">full content</strong> (including the <code className="text-ide-accent">-----BEGIN ...-----</code> and <code className="text-ide-accent">-----END ...-----</code> lines) directly into the <em>Private Key</em> field.
            </p>
          </SectionBlock>

          {/* 2 — PuTTY */}
          <SectionBlock title="2. Convert a PuTTY key (.ppk) to OpenSSH">
            <p className="text-ide-text-muted font-medium">Windows — PuTTYgen (GUI):</p>
            <ol className="list-decimal list-inside flex flex-col gap-1 text-ide-text-muted ml-1">
              <li>Open <strong className="text-ide-text">PuTTYgen</strong></li>
              <li>Click <strong className="text-ide-text">Load</strong> and select your <code className="text-ide-accent">.ppk</code> file</li>
              <li>Go to <strong className="text-ide-text">Conversions → Export OpenSSH key</strong></li>
              <li>Save the file and paste its contents into the <em>Private Key</em> field</li>
            </ol>
            <p className="text-ide-text-muted font-medium mt-1">Linux / macOS — command line:</p>
            <Code>puttygen key.ppk -O private-openssh -o key_openssh.pem</Code>
          </SectionBlock>

          {/* 3 — new openssh to classic PEM */}
          <SectionBlock title="3. Convert a new-format OpenSSH key to classic PEM (RSA)">
            <p className="text-ide-text-muted">
              Recent versions of <code className="text-ide-accent">ssh-keygen</code> produce keys with a <code className="text-ide-accent">BEGIN OPENSSH PRIVATE KEY</code> header. To convert to classic RSA PEM:
            </p>
            <Code>{`cp ~/.ssh/id_rsa ~/.ssh/id_rsa.bak\nssh-keygen -p -m PEM -f ~/.ssh/id_rsa\n# leave the new passphrase empty (press Enter) if you don't want one`}</Code>
          </SectionBlock>

          {/* 4 — generate new RSA */}
          <SectionBlock title="4. Generate a new RSA key pair">
            <Code>{`ssh-keygen -t rsa -b 4096 -C "your@email.com" -f ~/.ssh/id_rsa`}</Code>
            <p className="text-ide-text-muted">Copy the public key to your server:</p>
            <Code>{`ssh-copy-id -i ~/.ssh/id_rsa.pub user@server`}</Code>
            <p className="text-ide-text-muted">Paste the contents of <code className="text-ide-accent">~/.ssh/id_rsa</code> into the <em>Private Key</em> field.</p>
          </SectionBlock>

          {/* 5 — Ed25519 */}
          <SectionBlock title="5. Generate a new Ed25519 key pair (recommended)">
            <Code>{`ssh-keygen -t ed25519 -C "your@email.com" -f ~/.ssh/id_ed25519`}</Code>
            <p className="text-ide-text-muted">Copy the public key to your server:</p>
            <Code>{`ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server`}</Code>
            <p className="text-ide-text-muted">Paste the contents of <code className="text-ide-accent">~/.ssh/id_ed25519</code> into the <em>Private Key</em> field.</p>
          </SectionBlock>

          {/* tip */}
          <SectionBlock title="Tip: print the key content to your terminal">
            <p className="text-ide-text-muted">Linux / macOS:</p>
            <Code>cat ~/.ssh/id_rsa</Code>
            <p className="text-ide-text-muted">Windows (PowerShell):</p>
            <Code>{`Get-Content $HOME\\.ssh\\id_rsa`}</Code>
            <p className="text-ide-text-muted">
              Select and copy <strong className="text-ide-text">everything</strong>, including the <code className="text-ide-accent">-----BEGIN ...-----</code> and <code className="text-ide-accent">-----END ...-----</code> lines.
            </p>
          </SectionBlock>
        </div>

        {/* footer */}
        <div className="flex justify-end px-4 py-3 border-t border-ide-border shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-ide-accent hover:bg-ide-accent/80 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
