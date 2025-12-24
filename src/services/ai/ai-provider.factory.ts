import { Injectable } from '@nestjs/common';
import { IAIProvider, AIProviderType, AIProviderConfig } from './ai.interface';
import { OllamaProvider } from './ollama.provider';
import { GitHubProvider } from './github.provider';

@Injectable()
export class AIProviderFactory {
  static create(type: AIProviderType, config?: Partial<AIProviderConfig>): IAIProvider {
    switch (type) {
      case 'ollama':
        return new OllamaProvider(config);
      case 'github':
        return new GitHubProvider(config);
      default:
        throw new Error(`Unknown AI provider type: ${type}`);
    }
  }

  static createFromEnv(): IAIProvider {
    const providerType = (process.env.AI_PROVIDER as AIProviderType) || 'ollama';
    return AIProviderFactory.create(providerType);
  }

  static getCurrentProviderType(): AIProviderType {
    return (process.env.AI_PROVIDER as AIProviderType) || 'ollama';
  }
}
