import { Client } from 'ssh2'
import { v4 as uuidv4 } from 'uuid'
import type {
  ISshClient,
  SshConnectConfig,
  TestResult,
  ExecCommandOptions,
  ExecCommandResult
} from '../../domain/ports/ISshClient'

const DEFAULT_EXEC_TIMEOUT_MS = 30_000
const MAX_EXEC_OUTPUT_CHARS = 64 * 1024

function appendCapped(current: string, chunk: string): string {
  if (current.endsWith('\n…(truncated)')) return current
  const combined = current + chunk
  if (combined.length <= MAX_EXEC_OUTPUT_CHARS) return combined
  return `${combined.slice(0, MAX_EXEC_OUTPUT_CHARS)}\n…(truncated)`
}

export class Ssh2Client implements ISshClient {
  private sessions = new Map<string, Client>()
  private onDisconnectedCallbacks: ((sessionId: string) => void)[] = []

  onDisconnected(cb: (sessionId: string) => void): void {
    this.onDisconnectedCallbacks.push(cb)
  }

  async connect(config: SshConnectConfig): Promise<string> {
    const client = new Client()
    const sessionId = uuidv4()

    await new Promise<void>((resolve, reject) => {
      client.once('ready', resolve)
      client.once('error', reject)
      client.connect(this.buildConnectConfig(config))
    })

    client.on('end', () => this.handleDisconnect(sessionId))
    client.on('close', () => this.handleDisconnect(sessionId))
    client.on('error', () => this.handleDisconnect(sessionId))

    this.sessions.set(sessionId, client)
    return sessionId
  }

  async disconnect(sessionId: string): Promise<void> {
    const client = this.sessions.get(sessionId)
    if (client) {
      client.end()
      this.sessions.delete(sessionId)
    }
  }

  async disconnectAll(): Promise<void> {
    const entries = [...this.sessions.entries()]
    this.sessions.clear()
    for (const [, client] of entries) {
      try { client.end() } catch { /* continue on per-session error */ }
    }
  }

  async test(config: SshConnectConfig): Promise<TestResult> {
    const client = new Client()
    return new Promise<TestResult>((resolve) => {
      const timeout = setTimeout(() => {
        client.destroy()
        resolve({ success: false, message: 'Connection timed out' })
      }, 10000)

      client.once('ready', () => {
        clearTimeout(timeout)
        client.end()
        resolve({ success: true, message: 'Connection successful' })
      })

      client.once('error', (err) => {
        clearTimeout(timeout)
        resolve({ success: false, message: err.message })
      })

      client.connect(this.buildConnectConfig(config))
    })
  }

  isConnected(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  async execCommand(
    sessionId: string,
    command: string,
    options: ExecCommandOptions = {}
  ): Promise<ExecCommandResult> {
    const client = this.getClient(sessionId)
    const timeoutMs = options.timeoutMs ?? DEFAULT_EXEC_TIMEOUT_MS

    return new Promise<ExecCommandResult>((resolve, reject) => {
      client.exec(command, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        let stdout = ''
        let stderr = ''
        let settled = false

        const timeout = setTimeout(() => {
          if (settled) return
          settled = true
          stream.destroy()
          reject(Object.assign(new Error(`Command timed out after ${timeoutMs}ms`), { code: 'TIMEOUT' }))
        }, timeoutMs)

        stream.on('data', (chunk: Buffer) => {
          stdout = appendCapped(stdout, chunk.toString('utf8'))
        })
        stream.stderr.on('data', (chunk: Buffer) => {
          stderr = appendCapped(stderr, chunk.toString('utf8'))
        })

        stream.on('close', (code: number | null) => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          resolve({ stdout, stderr, exitCode: code ?? -1 })
        })

        stream.on('error', (streamErr: Error) => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          reject(streamErr)
        })
      })
    })
  }

  getClient(sessionId: string): Client {
    const client = this.sessions.get(sessionId)
    if (!client) throw new Error(`Session ${sessionId} not found`)
    return client
  }

  private buildConnectConfig(config: SshConnectConfig) {
    const { connection, plainPassword, plainPrivateKey } = config
    return {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      password: connection.authType === 'password' ? plainPassword : undefined,
      privateKey:
        connection.authType === 'privateKey' && plainPrivateKey
          ? plainPrivateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
          : undefined,
      keepaliveInterval: 10000,
      keepaliveCountMax: 3
    }
  }

  private handleDisconnect(sessionId: string): void {
    if (this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId)
      this.onDisconnectedCallbacks.forEach((cb) => cb(sessionId))
    }
  }
}
