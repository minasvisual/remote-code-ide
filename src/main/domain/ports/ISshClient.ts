import type { Connection } from '../entities/Connection'

export interface SshConnectConfig {
  connection: Connection
  plainPassword?: string
  plainPrivateKey?: string
}

export interface TestResult {
  success: boolean
  message: string
}

export interface ISshClient {
  connect(config: SshConnectConfig): Promise<string>
  disconnect(sessionId: string): Promise<void>
  test(config: SshConnectConfig): Promise<TestResult>
  isConnected(sessionId: string): boolean
}
