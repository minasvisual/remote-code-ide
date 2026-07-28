import type { IAiChatService, ResolvedProviderConfig } from '../../domain/ports/IAiChatService'
import { AnthropicChatAdapter } from './AnthropicChatAdapter'
import { OpenAiCompatibleChatAdapter } from './OpenAiCompatibleChatAdapter'

export class AiChatServiceFactory {
  private readonly anthropic = new AnthropicChatAdapter()
  private readonly openAiCompatible = new OpenAiCompatibleChatAdapter()

  forConfig(config: Pick<ResolvedProviderConfig, 'providerType'>): IAiChatService {
    return config.providerType === 'anthropic' ? this.anthropic : this.openAiCompatible
  }
}
