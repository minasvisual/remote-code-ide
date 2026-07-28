import type { FileContext } from '../../domain/ports/IAiChatService'

const BASE_INSTRUCTIONS = `You are an AI coding assistant embedded in a remote IDE. The user is editing files on a remote server over SFTP.

When the user asks for a code change to the file they currently have open, respond with the complete new file content in a single fenced code block labeled with the file's exact path, for example:

\`\`\`src/App.tsx
<full file content here>
\`\`\`

Only do this when proposing a full-file edit to the currently open file. For everything else (explaining code, answering questions, general conversation), respond normally in plain text with no fenced path label.`

export function buildSystemPrompt(fileContext: FileContext | null): string {
  if (!fileContext) return BASE_INSTRUCTIONS

  const truncatedNotice = fileContext.truncated
    ? ' (truncated to 5 MB; the file is larger than what is shown below)'
    : ''

  return `${BASE_INSTRUCTIONS}

The user currently has this file open — path: ${fileContext.path}${truncatedNotice}

\`\`\`
${fileContext.content}
\`\`\``
}
