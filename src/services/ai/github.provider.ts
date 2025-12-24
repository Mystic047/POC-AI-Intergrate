import { Injectable } from '@nestjs/common';
import {
  IAIProvider,
  AIProviderConfig,
  ChatMessage,
  GenerateOptions,
} from './ai.interface';

@Injectable()
export class GitHubProvider implements IAIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly token: string;

  static readonly AVAILABLE_MODELS = [
    'gpt-4o',
    'gpt-4o-mini',
    'o1-preview',
    'o1-mini',
  ];

  constructor(config?: Partial<AIProviderConfig>) {
    this.baseUrl = config?.baseUrl || 'https://models.inference.ai.azure.com';
    this.model = config?.model || process.env.GITHUB_MODEL || 'gpt-4o-mini';
    this.token = config?.token || process.env.GITHUB_TOKEN || '';
  }

  getName(): string {
    return `GitHub Models (${this.model})`;
  }

  async checkConnection(): Promise<boolean> {
    if (!this.token || this.token === 'your_github_token_here') {
      console.error('GitHub token not configured');
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('GitHub Models connection error:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    return GitHubProvider.AVAILABLE_MODELS;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    return this.generateChat(messages, options);
  }

  async generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      throw new Error(`GitHub Models generate failed: ${error.message}`);
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }
}
