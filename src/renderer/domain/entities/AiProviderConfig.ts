export type AiProviderType = 'anthropic' | 'openai-compatible'

/** Safe shape returned by the main process — never carries the key or its encrypted form. */
export interface AiProviderConfig {
  id: string
  label: string
  providerType: AiProviderType
  baseUrl?: string
  model: string
  hasApiKey: boolean
  isDefault: boolean
}

export interface NewAiProviderConfig {
  label: string
  providerType: AiProviderType
  baseUrl?: string
  model: string
  plainApiKey: string
}

export interface UpdateAiProviderConfig {
  id: string
  label: string
  providerType: AiProviderType
  baseUrl?: string
  model: string
  /** Omitted or empty keeps the previously stored key. */
  plainApiKey?: string
}

/** Ad-hoc config used to test a connection before it's saved. */
export interface TestAiProviderConfig {
  providerType: AiProviderType
  baseUrl?: string
  model: string
  plainApiKey: string
}
