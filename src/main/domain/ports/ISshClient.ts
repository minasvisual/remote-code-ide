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

export interface ExecCommandOptions {
  timeoutMs?: number
}

export interface ExecCommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

export interface ISshClient {
  connect(config: SshConnectConfig): Promise<string>
  disconnect(sessionId: string): Promise<void>
  disconnectAll(): Promise<void>
  test(config: SshConnectConfig): Promise<TestResult>
  isConnected(sessionId: string): boolean
  /**
   * Runs a single non-interactive command over a dedicated exec channel (not the PTY-based
   * shell used by `terminal:*`) and resolves once it exits, capturing stdout/stderr/exitCode.
   * Rejects with a timeout error if the command doesn't finish within `options.timeoutMs`.
   */
  execCommand(sessionId: string, command: string, options?: ExecCommandOptions): Promise<ExecCommandResult>
}
