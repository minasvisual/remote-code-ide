export interface ParsedFileEdit {
  path: string
  content: string
}

const FENCE_RE = /```([^\n`]+)\n([\s\S]*?)```/g

/**
 * Looks for a fenced code block labeled with a file path matching one of the currently
 * open tabs. The assistant is instructed (system prompt) to label proposed edits this way.
 */
export function parseFileEdit(text: string, openPaths: string[]): ParsedFileEdit | null {
  const openSet = new Set(openPaths)
  FENCE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FENCE_RE.exec(text)) !== null) {
    const label = match[1].trim()
    if (openSet.has(label)) {
      return { path: label, content: match[2].replace(/\n$/, '') }
    }
  }
  return null
}
