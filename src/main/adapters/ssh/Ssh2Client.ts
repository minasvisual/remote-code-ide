import { Client } from 'ssh2'
import { v4 as uuidv4 } from 'uuid'
import type { ISshClient, SshConnectConfig, TestResult } from '../../domain/ports/ISshClient'

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
