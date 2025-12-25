export interface AIProviderConfig {
  baseUrl: string;
  model: string;
  token?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

// ============================================
// Function Calling / Tool Use Interfaces
// ============================================

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
      }>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolCallResult {
  tool_call_id: string;
  content: string; // JSON string of the result
}

export interface GenerateWithToolsResponse {
  content?: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

// ============================================
// AI Provider Interface
// ============================================

export interface IAIProvider {
  getName(): string;
  checkConnection(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateChat(messages: ChatMessage[], options?: GenerateOptions): Promise<string>;
  
  // Function Calling support
  generateWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options?: GenerateOptions
  ): Promise<GenerateWithToolsResponse>;
}

export type AIProviderType = 'ollama' | 'github';
