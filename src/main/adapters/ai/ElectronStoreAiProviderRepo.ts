import Store = require('electron-store')
import { v4 as uuidv4 } from 'uuid'
import type { IAiProviderRepo } from '../../domain/ports/IAiProviderRepo'
import type {
  AiProviderConfig,
  AiProviderType,
  NewAiProviderConfig,
  UpdateAiProviderConfig
} from '../../domain/entities/AiProviderConfig'
import type { ICryptoService } from '../../domain/ports/ICryptoService'

const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com'

interface StoredProvider {
  id: string
  label: string
  providerType: AiProviderType
  baseUrl?: string
  model: string
  encryptedApiKey: string
  isDefault: boolean
}

interface StoreSchema {
  providers: StoredProvider[]
}

function toPublic(p: StoredProvider): AiProviderConfig {
  return {
    id: p.id,
    label: p.label,
    providerType: p.providerType,
    baseUrl: p.baseUrl,
    model: p.model,
    hasApiKey: !!p.encryptedApiKey,
    isDefault: p.isDefault
  }
}

export class ElectronStoreAiProviderRepo implements IAiProviderRepo {
  private store: Store<StoreSchema>
  private crypto: ICryptoService

  constructor(crypto: ICryptoService) {
    this.crypto = crypto
    this.store = new Store<StoreSchema>({
      name: 'ai-providers',
      defaults: { providers: [] }
    })
  }

  async list(): Promise<AiProviderConfig[]> {
    return this.store.get('providers', []).map(toPublic)
  }

  async get(id: string): Promise<AiProviderConfig> {
    const found = this.store.get('providers', []).find((p) => p.id === id)
    if (!found) throw new Error(`AI provider ${id} not found`)
    return toPublic(found)
  }

  async getDecryptedApiKey(id: string): Promise<string> {
    const found = this.store.get('providers', []).find((p) => p.id === id)
    if (!found) throw new Error(`AI provider ${id} not found`)
    return this.crypto.decrypt(found.encryptedApiKey)
  }

  async save(config: NewAiProviderConfig): Promise<AiProviderConfig> {
    const providers = this.store.get('providers', [])
    const stored: StoredProvider = {
      id: uuidv4(),
      label: config.label,
      providerType: config.providerType,
      baseUrl: config.baseUrl || (config.providerType === 'anthropic' ? DEFAULT_ANTHROPIC_BASE_URL : undefined),
      model: config.model,
      encryptedApiKey: this.crypto.encrypt(config.plainApiKey),
      isDefault: providers.length === 0
    }
    this.store.set('providers', [...providers, stored])
    return toPublic(stored)
  }

  async update(config: UpdateAiProviderConfig): Promise<AiProviderConfig> {
    const providers = this.store.get('providers', [])
    const existing = providers.find((p) => p.id === config.id)
    if (!existing) throw new Error(`AI provider ${config.id} not found`)

    const updated: StoredProvider = {
      ...existing,
      label: config.label,
      providerType: config.providerType,
      baseUrl: config.baseUrl || (config.providerType === 'anthropic' ? DEFAULT_ANTHROPIC_BASE_URL : undefined),
      model: config.model,
      encryptedApiKey: config.plainApiKey ? this.crypto.encrypt(config.plainApiKey) : existing.encryptedApiKey
    }
    this.store.set(
      'providers',
      providers.map((p) => (p.id === config.id ? updated : p))
    )
    return toPublic(updated)
  }

  async delete(id: string): Promise<void> {
    const providers = this.store.get('providers', [])
    this.store.set('providers', providers.filter((p) => p.id !== id))
  }

  async setDefault(id: string): Promise<void> {
    const providers = this.store.get('providers', [])
    if (!providers.some((p) => p.id === id)) throw new Error(`AI provider ${id} not found`)
    this.store.set(
      'providers',
      providers.map((p) => ({ ...p, isDefault: p.id === id }))
    )
  }
}
