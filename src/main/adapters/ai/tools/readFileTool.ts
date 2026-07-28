import type { ISftpService } from '../../../domain/ports/ISftpService'
import type { ToolDefinition } from '../../../domain/ports/IAiChatService'
import type { ToolResult } from '../../../domain/entities/AgentTool'

const MAX_READ_BYTES = 5 * 1024 * 1024

export const readFileDefinition: ToolDefinition = {
  name: 'read_file',
  description: 'Reads the full text content of a file at an absolute path on the connected remote server.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute path to the file on the remote server' }
    },
    required: ['path']
  }
}

export function createReadFileTool(sftp: ISftpService) {
  return async function execute(sessionId: string, input: unknown): Promise<ToolResult> {
    const { path } = input as { path: string }
    try {
      const buffer = await sftp.readFile(sessionId, path)
      const truncated = buffer.length > MAX_READ_BYTES
      const content = (truncated ? buffer.subarray(0, MAX_READ_BYTES) : buffer).toString('utf8')
      return {
        content: truncated ? `${content}\n…(truncated to 5 MB)` : content,
        isError: false
      }
    } catch (err: unknown) {
      return { content: `Failed to read ${path}: ${(err as Error).message}`, isError: true }
    }
  }
}
