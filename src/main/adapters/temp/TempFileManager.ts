import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'

export class TempFileManager {
  private readonly baseDir: string
  private createdPaths = new Set<string>()

  constructor() {
    this.baseDir = join(tmpdir(), 'mycodeany')
    mkdirSync(this.baseDir, { recursive: true })
  }

  createTempPath(sessionId: string, filename: string): string {
    const sessionDir = join(this.baseDir, sessionId)
    mkdirSync(sessionDir, { recursive: true })
    const uniqueName = `${uuidv4()}-${filename}`
    const fullPath = join(sessionDir, uniqueName)
    this.createdPaths.add(fullPath)
    return fullPath
  }

  deleteFile(localPath: string): void {
    try {
      if (existsSync(localPath)) rmSync(localPath)
      this.createdPaths.delete(localPath)
    } catch {
      // ignore cleanup errors
    }
  }

  deleteSessionFiles(sessionId: string): void {
    const sessionDir = join(this.baseDir, sessionId)
    try {
      if (existsSync(sessionDir)) rmSync(sessionDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
    for (const p of this.createdPaths) {
      if (p.startsWith(sessionDir)) this.createdPaths.delete(p)
    }
  }

  cleanAll(): void {
    try {
      if (existsSync(this.baseDir)) rmSync(this.baseDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
    this.createdPaths.clear()
  }
}
