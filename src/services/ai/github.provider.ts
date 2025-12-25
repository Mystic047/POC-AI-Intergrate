import { Injectable } from '@nestjs/common';
import {
  IAIProvider,
  AIProviderConfig,
  ChatMessage,
  GenerateOptions,
  ToolDefinition,
  ToolCall,
  GenerateWithToolsResponse,
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

  /**
   * Generate response with Function Calling / Tool Use support
   * 
   * This is the key method for AI Agent functionality.
   * The AI will analyze the user's question and decide which tools to call.
   */
  async generateWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options?: GenerateOptions
  ): Promise<GenerateWithToolsResponse> {
    try {
      // Convert messages to API format (handle tool messages)
      const apiMessages = messages.map(msg => {
        if (msg.role === 'tool') {
          return {
            role: 'tool' as const,
            tool_call_id: msg.tool_call_id,
            content: msg.content,
          };
        }
        if (msg.role === 'assistant' && msg.tool_calls) {
          return {
            role: 'assistant' as const,
            content: msg.content || null,
            tool_calls: msg.tool_calls,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: apiMessages,
          tools,
          tool_choice: 'auto', // Let AI decide when to use tools
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Models API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      const finishReason = choice?.finish_reason;

      // Check if AI wants to call tools
      if (message?.tool_calls && message.tool_calls.length > 0) {
        return {
          content: message.content || undefined,
          toolCalls: message.tool_calls as ToolCall[],
          finishReason: 'tool_calls',
        };
      }

      // No tools called, return regular response
      return {
        content: message?.content || '',
        toolCalls: undefined,
        finishReason: finishReason === 'stop' ? 'stop' : 'stop',
      };
    } catch (error: any) {
      console.error('generateWithTools error:', error);
      return {
        content: `Error: ${error.message}`,
        finishReason: 'error',
      };
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }
}
