export interface EditorTab {
  id: string
  sessionId: string
  remotePath: string
  localTempPath: string
  filename: string
  language: string
  content: string
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
}

export type ActiveSession = {
  sessionId: string
  connectionId: string
  connectionLabel: string
}
