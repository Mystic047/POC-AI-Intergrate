export interface AIProviderConfig {
  baseUrl: string;
  model: string;
  token?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface IAIProvider {
  getName(): string;
  checkConnection(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;
}

export type AIProviderType = 'ollama' | 'github';
