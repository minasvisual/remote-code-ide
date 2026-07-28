import type { ISftpService } from '../../../domain/ports/ISftpService'
import type { ISshClient } from '../../../domain/ports/ISshClient'
import type { ToolDefinition } from '../../../domain/ports/IAiChatService'
import type { ToolResult } from '../../../domain/entities/AgentTool'
import { listDirectoryDefinition, createListDirectoryTool } from './listDirectoryTool'
import { readFileDefinition, createReadFileTool } from './readFileTool'
import { writeFileDefinition, createWriteFileTool, type WriteFileDiffPreview } from './writeFileTool'
import { runCommandDefinition, createRunCommandTool } from './runCommandTool'

export const WRITE_FILE_TOOL_NAME = writeFileDefinition.name

interface ExecutableEntry {
  definition: ToolDefinition
  mutating: boolean
  execute(sessionId: string, input: unknown): Promise<ToolResult>
}

export class ToolRegistry {
  private readonly executable: ExecutableEntry[]
  private readonly writeFilePrepare: (sessionId: string, input: unknown) => Promise<WriteFileDiffPreview>

  constructor(sftp: ISftpService, ssh: ISshClient) {
    this.executable = [
      { definition: listDirectoryDefinition, mutating: false, execute: createListDirectoryTool(sftp) },
      { definition: readFileDefinition, mutating: false, execute: createReadFileTool(sftp) },
      { definition: runCommandDefinition, mutating: true, execute: createRunCommandTool(ssh) }
    ]
    this.writeFilePrepare = createWriteFileTool(sftp)
  }

  /** All tool definitions, including `write_file`, to advertise to the model. */
  get definitions(): ToolDefinition[] {
    return [...this.executable.map((e) => e.definition), writeFileDefinition]
  }

  isWriteFile(name: string): boolean {
    return name === WRITE_FILE_TOOL_NAME
  }

  isMutating(name: string): boolean {
    if (this.isWriteFile(name)) return true
    return this.executable.find((e) => e.definition.name === name)?.mutating ?? false
  }

  /** Read-only tools and `run_command` (only call for `run_command` after approval). */
  async execute(sessionId: string, name: string, input: unknown): Promise<ToolResult> {
    const entry = this.executable.find((e) => e.definition.name === name)
    if (!entry) return { content: `Unknown tool: ${name}`, isError: true }
    return entry.execute(sessionId, input)
  }

  /** `write_file` only: prepares the diff preview. Never mutates — safe to run unconditionally. */
  async prepareWriteFileDiff(sessionId: string, input: unknown): Promise<WriteFileDiffPreview> {
    return this.writeFilePrepare(sessionId, input)
  }
}
