import { Injectable } from '@nestjs/common';
import {
  IAIProvider,
  AIProviderConfig,
  ChatMessage,
  GenerateOptions,
  ToolDefinition,
  GenerateWithToolsResponse,
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

  /**
   * Function calling for Ollama (limited support)
   * 
   * Note: Ollama has limited tool support. Only certain models like
   * llama3.1, mistral-nemo support function calling.
   */
  async generateWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options?: GenerateOptions
  ): Promise<GenerateWithToolsResponse> {
    try {
      // Convert messages to Ollama format
      const ollamaMessages = messages.map(m => {
        // Handle tool response messages
        if (m.role === 'tool') {
          return {
            role: 'tool' as const,
            content: m.content,
          };
        }
        // Handle assistant messages with tool calls
        if (m.role === 'assistant' && m.tool_calls) {
          return {
            role: 'assistant' as const,
            content: m.content || '',
            tool_calls: m.tool_calls.map(tc => ({
              function: {
                name: tc.function.name,
                arguments: typeof tc.function.arguments === 'string' 
                  ? JSON.parse(tc.function.arguments) 
                  : tc.function.arguments,
              },
            })),
          };
        }
        return {
          role: m.role,
          content: m.content,
        };
      });

      console.log('[Ollama] Sending messages:', JSON.stringify(ollamaMessages, null, 2));

      // Ollama expects tools in a specific format
      const ollamaTools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        },
      }));

      console.log('[Ollama] Tools:', JSON.stringify(ollamaTools.map(t => t.function.name)));

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: ollamaMessages,
          tools: ollamaTools,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.3,
            num_predict: options?.maxTokens ?? 2000,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Ollama] API error:', errorText);
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const message = data.message;
      
      console.log('[Ollama] Response:', JSON.stringify(message, null, 2));

      // Check if Ollama returned tool calls
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCalls = message.tool_calls
          .map((tc: any, index: number) => {
            const toolName = tc.function?.name || tc.name || '';
            
            // Skip if no valid tool name
            if (!toolName) {
              console.warn('[Ollama] Tool call with empty name, skipping:', tc);
              return null;
            }

            return {
              id: tc.id || `ollama_call_${index}`,
              type: 'function' as const,
              function: {
                name: toolName,
                arguments: typeof tc.function?.arguments === 'string' 
                  ? tc.function.arguments 
                  : JSON.stringify(tc.function?.arguments || {}),
              },
            };
          })
          .filter(Boolean); // Remove nulls

        if (toolCalls.length > 0) {
          return {
            content: message.content || undefined,
            toolCalls,
            finishReason: 'tool_calls',
          };
        }
      }

      return {
        content: message?.content || '',
        finishReason: 'stop',
      };
    } catch (error: any) {
      console.error('Ollama generateWithTools error:', error);
      // Fallback to regular chat if tools not supported
      const content = await this.generateChat(messages, options);
      return {
        content,
        finishReason: 'stop',
      };
    }
  }
}
