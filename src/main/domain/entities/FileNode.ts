export type FileNodeType = 'file' | 'directory' | 'symlink'

export interface FileNode {
  name: string
  path: string
  type: FileNodeType
  size: number
  modifiedAt: string
  permissions: string
  children?: FileNode[]
  isLoaded: boolean
}
