import type { ISftpService } from '../../../domain/ports/ISftpService'
import type { ToolDefinition } from '../../../domain/ports/IAiChatService'
import type { ToolResult } from '../../../domain/entities/AgentTool'

export const writeFileDefinition: ToolDefinition = {
  name: 'write_file',
  description:
    'Proposes writing the complete new content of a file at an absolute path on the connected ' +
    'remote server. This never writes directly — the user reviews a diff (current vs. proposed ' +
    'content) and must explicitly accept or reject it before anything is written.',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Absolute path to the file on the remote server' },
      content: { type: 'string', description: 'The complete new content for the file' }
    },
    required: ['path', 'content']
  }
}

export interface WriteFileDiffPreview {
  path: string
  currentContent: string
  proposedContent: string
}

/**
 * Not a mutating "execute" — this only prepares the diff preview (current vs. proposed content)
 * shown to the user. The actual write happens client-side (via the diff modal's Accept action,
 * updating an open tab or writing over SFTP directly), reusing the same flow as the non-agent
 * chat's single-file diff review. Read-only, so it always runs immediately (never gated).
 */
export function createWriteFileTool(sftp: ISftpService) {
  return async function prepare(sessionId: string, input: unknown): Promise<WriteFileDiffPreview> {
    const { path, content } = input as { path: string; content: string }
    let currentContent = ''
    try {
      currentContent = (await sftp.readFile(sessionId, path)).toString('utf8')
    } catch {
      // File doesn't exist yet (or isn't readable) — treat as a new file, diff against empty.
    }
    return { path, currentContent, proposedContent: content }
  }
}

export function writeFileOutcomeResult(accepted: boolean): ToolResult {
  return accepted
    ? { content: 'The user accepted this change; the file has been updated.', isError: false }
    : { content: 'The user rejected this change; the file was not modified.', isError: false }
}
