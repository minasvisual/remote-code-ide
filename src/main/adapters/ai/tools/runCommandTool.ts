import type { ISshClient } from '../../../domain/ports/ISshClient'
import type { ToolDefinition } from '../../../domain/ports/IAiChatService'
import type { ToolResult } from '../../../domain/entities/AgentTool'

export const runCommandDefinition: ToolDefinition = {
  name: 'run_command',
  description:
    'Runs a single non-interactive shell command on the connected remote server and returns its ' +
    'stdout, stderr, and exit code. This is a real remote server — commands can have lasting ' +
    'effects. Requires explicit user approval before it runs (unless auto-approved for this turn).',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'The shell command to run' }
    },
    required: ['command']
  }
}

export function createRunCommandTool(ssh: ISshClient) {
  return async function execute(sessionId: string, input: unknown): Promise<ToolResult> {
    const { command } = input as { command: string }
    try {
      const { stdout, stderr, exitCode } = await ssh.execCommand(sessionId, command)
      const content = [`exit code: ${exitCode}`, `stdout:\n${stdout || '(empty)'}`, `stderr:\n${stderr || '(empty)'}`].join('\n\n')
      return { content, isError: exitCode !== 0 }
    } catch (err: unknown) {
      return { content: `Failed to run command: ${(err as Error).message}`, isError: true }
    }
  }
}
