import { Injectable } from '@nestjs/common';
import { AIService } from './ai/ai.service';
import { ChatMessage, ToolCall } from './ai/ai.interface';
import { MAINTENANCE_TOOLS, TOOL_API_MAPPING, AGENT_SYSTEM_PROMPT } from './tools';
import { ConversationStore } from './conversation.store';

/**
 * Tool execution result
 */
interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  result: any;
  success: boolean;
  error?: string;
}

/**
 * Agent response
 */
export interface AgentResponse {
  answer: string;
  toolsUsed: string[];
  sessionId: string;
  executionSteps: {
    step: number;
    action: string;
    details: any;
  }[];
}

/**
 * AgentService - AI Agent with Function Calling + Conversation Memory
 * 
 * This service implements the Function Calling pattern with memory:
 * 1. User asks a question (with optional sessionId for context)
 * 2. AI analyzes question + previous context
 * 3. AI decides which tool(s) to call
 * 4. Tools call the internal API to get real data
 * 5. AI formats the data into a natural language response
 * 6. Conversation is stored for future reference
 */
@Injectable()
export class AgentService {
  private readonly apiBaseUrl: string;

  constructor(
    private readonly aiService: AIService,
    private readonly conversationStore: ConversationStore,
  ) {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Process a user question through the AI Agent
   * 
   * @param question - User's question
   * @param sessionId - Optional session ID for conversation memory
   */
  async chat(question: string, sessionId?: string): Promise<AgentResponse> {
    const executionSteps: AgentResponse['executionSteps'] = [];
    const toolsUsed: string[] = [];

    // Create or reuse session
    const actualSessionId = sessionId || this.conversationStore.generateSessionId();
    const isNewSession = !sessionId;

    // Get existing conversation history (only user and simple assistant messages)
    const existingMessages = this.conversationStore.getMessages(actualSessionId);
    
    // Strip numbers from assistant responses to prevent AI from copying them
    // This forces the AI to call tools instead of guessing from previous answers
    const cleanHistory = existingMessages
      .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.tool_calls))
      .map(m => {
        if (m.role === 'assistant' && m.content) {
          // Replace all numbers with [DATA] placeholder
          return {
            ...m,
            content: '[Previous answer provided data about this topic]',
          };
        }
        return m;
      });
    
    executionSteps.push({
      step: 1,
      action: 'CONTEXT_LOADED',
      details: { 
        sessionId: actualSessionId,
        isNewSession,
        previousMessages: cleanHistory.length,
      },
    });

    // Build messages array with history
    const messages: ChatMessage[] = [
      { role: 'system', content: AGENT_SYSTEM_PROMPT },
      ...cleanHistory, // Add clean history (no tool messages, no numbers)
    ];

    // If there's conversation history, add a system reminder to use tools
    if (cleanHistory.length > 0) {
      messages.push({
        role: 'system',
        content: 'IMPORTANT: You must call a tool NOW to answer this question. The previous answer placeholder has no data.',
      });
    }

    messages.push({ role: 'user', content: question });

    executionSteps.push({
      step: 2,
      action: 'INTENT_DETECTION',
      details: { 
        question, 
        totalMessages: messages.length,
        toolsProvided: MAINTENANCE_TOOLS.map(t => t.function.name),
      },
    });

    const firstResponse = await this.aiService.generateWithTools(messages, MAINTENANCE_TOOLS);

    // Check if AI wants to call tools
    if (firstResponse.finishReason === 'tool_calls' && firstResponse.toolCalls?.length) {
      executionSteps.push({
        step: 3,
        action: 'TOOL_CALLS_REQUESTED',
        details: { 
          toolCalls: firstResponse.toolCalls.map(tc => ({
            name: tc.function.name,
            arguments: tc.function.arguments,
          })),
        },
      });

      // Execute each tool call
      const toolResults: ToolExecutionResult[] = [];
      
      for (const toolCall of firstResponse.toolCalls) {
        const result = await this.executeTool(toolCall);
        toolResults.push(result);
        toolsUsed.push(toolCall.function.name);
      }

      executionSteps.push({
        step: 4,
        action: 'TOOLS_EXECUTED',
        details: { 
          results: toolResults.map(r => ({
            tool: r.toolName,
            success: r.success,
            dataPreview: r.success ? 'Data retrieved' : r.error,
          })),
        },
      });

      // Build conversation with tool results
      const messagesWithToolResults: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          content: firstResponse.content || '',
          tool_calls: firstResponse.toolCalls,
        },
        ...toolResults.map(result => ({
          role: 'tool' as const,
          tool_call_id: result.toolCallId,
          content: JSON.stringify(result.result),
        })),
      ];

      const finalResponse = await this.aiService.generateWithTools(
        messagesWithToolResults,
        MAINTENANCE_TOOLS
      );

      // Log for debugging
      console.log('[Agent] Final response:', finalResponse.content ? 'Has content' : 'No content', 
        'Finish reason:', finalResponse.finishReason);

      const answer = finalResponse.content || 'ขออภัย ไม่สามารถสร้างคำตอบได้ กรุณาลองใหม่อีกครั้ง';

      // Save to conversation history (only user question and final answer)
      this.conversationStore.addMessage(actualSessionId, { role: 'user', content: question });
      this.conversationStore.addMessage(actualSessionId, { role: 'assistant', content: answer });

      executionSteps.push({
        step: 5,
        action: 'CONVERSATION_SAVED',
        details: { 
          sessionId: actualSessionId,
          totalMessagesNow: this.conversationStore.getMessages(actualSessionId).length,
        },
      });

      return {
        answer,
        toolsUsed,
        sessionId: actualSessionId,
        executionSteps,
      };
    }

    // No tools needed - direct response
    console.log('[Agent] Direct response:', firstResponse.content ? 'Has content' : 'No content');
    const answer = firstResponse.content || 'ขออภัย ไม่สามารถสร้างคำตอบได้ กรุณาลองใหม่อีกครั้ง';

    // Save to conversation history
    this.conversationStore.addMessage(actualSessionId, { role: 'user', content: question });
    this.conversationStore.addMessage(actualSessionId, { role: 'assistant', content: answer });

    executionSteps.push({
      step: 3,
      action: 'DIRECT_RESPONSE_SAVED',
      details: { 
        reason: 'No tools needed',
        sessionId: actualSessionId,
      },
    });

    return {
      answer,
      toolsUsed: [],
      sessionId: actualSessionId,
      executionSteps,
    };
  }

  /**
   * Clear conversation history for a session
   */
  clearSession(sessionId: string): void {
    this.conversationStore.clear(sessionId);
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string) {
    return this.conversationStore.getSessionInfo(sessionId);
  }

  /**
   * List all active sessions
   */
  listSessions() {
    return this.conversationStore.listSessions();
  }

  /**
   * Execute a tool call by calling the internal API
   */
  private async executeTool(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const toolName = toolCall.function.name;
    const apiMapping = TOOL_API_MAPPING[toolName];

    if (!apiMapping) {
      return {
        toolCallId: toolCall.id,
        toolName,
        result: null,
        success: false,
        error: `Unknown tool: ${toolName}`,
      };
    }

    try {
      // Parse arguments from AI
      const args = JSON.parse(toolCall.function.arguments || '{}');
      
      // Build query string for GET requests
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      }

      const url = `${this.apiBaseUrl}${apiMapping.endpoint}?${queryParams.toString()}`;
      
      console.log(`[Agent] Calling API: ${url}`);

      // Call the internal API
      const response = await fetch(url, {
        method: apiMapping.method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        toolCallId: toolCall.id,
        toolName,
        result: data,
        success: true,
      };
    } catch (error: any) {
      console.error(`[Agent] Tool execution error (${toolName}):`, error);
      return {
        toolCallId: toolCall.id,
        toolName,
        result: null,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get information about available tools
   */
  getAvailableTools(): { name: string; description: string }[] {
    return MAINTENANCE_TOOLS.map(tool => ({
      name: tool.function.name,
      description: tool.function.description.split('\n')[0], // First line only
    }));
  }
}
