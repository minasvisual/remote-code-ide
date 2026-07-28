import type { ISftpService } from '../../../domain/ports/ISftpService'
import type { ToolDefinition } from '../../../domain/ports/IAiChatService'
import type { ToolResult } from '../../../domain/entities/AgentTool'

export const listDirectoryDefinition: ToolDefinition = {
  name: 'list_directory',
  description:
    'Lists the files and subdirectories at an absolute path on the connected remote server.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute path on the remote server, e.g. /var/www' }
    },
    required: ['path']
  }
}

export function createListDirectoryTool(sftp: ISftpService) {
  return async function execute(sessionId: string, input: unknown): Promise<ToolResult> {
    const { path } = input as { path: string }
    try {
      const nodes = await sftp.listDir(sessionId, path)
      if (nodes.length === 0) return { content: '(empty directory)', isError: false }
      const lines = nodes.map((n) => `${n.type === 'directory' ? 'd' : '-'} ${n.name}`)
      return { content: lines.join('\n'), isError: false }
    } catch (err: unknown) {
      return { content: `Failed to list ${path}: ${(err as Error).message}`, isError: true }
    }
  }
}
