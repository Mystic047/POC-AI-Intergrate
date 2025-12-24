import { Injectable } from '@nestjs/common';
import {
  IAIProvider,
  AIProviderConfig,
  ChatMessage,
  GenerateOptions,
} from './ai.interface';

@Injectable()
export class OllamaProvider implements IAIProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config?: Partial<AIProviderConfig>) {
    this.baseUrl = config?.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = config?.model || process.env.OLLAMA_TEXT_MODEL || 'llama3.2';
  }

  getName(): string {
    return `Ollama (${this.model})`;
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error('Ollama connection error:', error);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: options?.stream ?? false,
          options: {
            temperature: options?.temperature ?? 0.3,
            num_predict: options?.maxTokens ?? 1000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error: any) {
      throw new Error(`Ollama generate failed: ${error.message}`);
    }
  }

  async generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: options?.stream ?? false,
          options: {
            temperature: options?.temperature ?? 0.3,
            num_predict: options?.maxTokens ?? 1000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Chat API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error: any) {
      throw new Error(`Ollama chat failed: ${error.message}`);
    }
  }
}
