import type { AiProviderConfig, NewAiProviderConfig, UpdateAiProviderConfig } from '../entities/AiProviderConfig'

export interface IAiProviderRepo {
  list(): Promise<AiProviderConfig[]>
  get(id: string): Promise<AiProviderConfig>
  /** Decrypts and returns the plaintext key for internal use (chat requests) — never exposed over IPC. */
  getDecryptedApiKey(id: string): Promise<string>
  save(config: NewAiProviderConfig): Promise<AiProviderConfig>
  update(config: UpdateAiProviderConfig): Promise<AiProviderConfig>
  delete(id: string): Promise<void>
  setDefault(id: string): Promise<void>
}
