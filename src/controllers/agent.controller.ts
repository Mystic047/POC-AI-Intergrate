import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { AgentService, AgentResponse } from '../services/agent.service';

/**
 * Request DTO for chat endpoint
 */
interface ChatRequest {
  question: string;
  sessionId?: string; // Optional: for conversation memory
}

/**
 * Response DTO for chat endpoint
 */
interface ChatResponse {
  success: boolean;
  data: {
    answer: string;
    toolsUsed: string[];
    sessionId: string; // Return sessionId for follow-up questions
    executionSteps?: any[];
  };
  debug?: boolean;
}

/**
 * AgentController - REST API for AI Agent with Conversation Memory
 * 
 * This controller provides chat endpoints with memory support:
 * 
 * POST /agent/chat
 * {
 *   "question": "ค่าใช้จ่ายปี 2025 เท่าไหร่?",
 *   "sessionId": "optional-for-follow-up"
 * }
 * 
 * Flow:
 * 1. First question: no sessionId → creates new session
 * 2. Follow-up questions: include sessionId → remembers context
 * 3. "แล้วปี 2024 ล่ะ?" → AI understands from context
 */
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  /**
   * POST /agent/chat
   * 
   * Main chat endpoint with conversation memory.
   * 
   * @example First question (creates session):
   * POST /agent/chat
   * { "question": "เปรียบเทียบค่าใช้จ่าย breakdown vs preventive ปี 2025" }
   * 
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "answer": "...",
   *     "sessionId": "session_123456_abc"  // Use this for follow-up!
   *   }
   * }
   * 
   * @example Follow-up question (with context):
   * POST /agent/chat
   * { 
   *   "question": "แล้วปี 2024 ล่ะ?",
   *   "sessionId": "session_123456_abc"
   * }
   */
  @Post('chat')
  async chat(@Body() body: ChatRequest): Promise<ChatResponse> {
    const { question, sessionId } = body;

    if (!question || question.trim() === '') {
      return {
        success: false,
        data: {
          answer: 'Please provide a question.',
          toolsUsed: [],
          sessionId: '',
        },
      };
    }

    try {
      const result = await this.agentService.chat(question, sessionId);
      
      const includeDebug = process.env.DEBUG_MODE === 'true';

      return {
        success: true,
        data: {
          answer: result.answer,
          toolsUsed: result.toolsUsed,
          sessionId: result.sessionId,
          ...(includeDebug && { executionSteps: result.executionSteps }),
        },
        debug: includeDebug,
      };
    } catch (error: any) {
      console.error('[AgentController] Chat error:', error);
      return {
        success: false,
        data: {
          answer: `Error processing question: ${error.message}`,
          toolsUsed: [],
          sessionId: sessionId || '',
        },
      };
    }
  }

  /**
   * GET /agent/session/:sessionId
   * 
   * Get information about a conversation session
   */
  @Get('session/:sessionId')
  getSessionInfo(@Param('sessionId') sessionId: string) {
    return {
      success: true,
      data: this.agentService.getSessionInfo(sessionId),
    };
  }

  /**
   * DELETE /agent/session/:sessionId
   * 
   * Clear conversation history for a session (start fresh)
   */
  @Delete('session/:sessionId')
  clearSession(@Param('sessionId') sessionId: string) {
    this.agentService.clearSession(sessionId);
    return {
      success: true,
      message: `Session ${sessionId} cleared`,
    };
  }

  /**
   * GET /agent/sessions
   * 
   * List all active sessions (for debugging)
   */
  @Get('sessions')
  listSessions() {
    return {
      success: true,
      data: this.agentService.listSessions(),
    };
  }

  /**
   * POST /agent/chat/debug
   * 
   * Same as /chat but always includes execution steps for debugging.
   */
  @Post('chat/debug')
  async chatDebug(@Body() body: ChatRequest): Promise<ChatResponse> {
    const { question, sessionId } = body;

    if (!question || question.trim() === '') {
      return {
        success: false,
        data: {
          answer: 'Please provide a question.',
          toolsUsed: [],
          sessionId: '',
          executionSteps: [],
        },
      };
    }

    try {
      const result = await this.agentService.chat(question, sessionId);

      return {
        success: true,
        data: {
          answer: result.answer,
          toolsUsed: result.toolsUsed,
          sessionId: result.sessionId,
          executionSteps: result.executionSteps,
        },
        debug: true,
      };
    } catch (error: any) {
      console.error('[AgentController] Chat debug error:', error);
      return {
        success: false,
        data: {
          answer: `Error: ${error.message}`,
          toolsUsed: [],
          sessionId: sessionId || '',
          executionSteps: [],
        },
      };
    }
  }

  /**
   * GET /agent/tools
   * 
   * Get list of available tools the agent can use.
   */
  @Get('tools')
  getTools() {
    return {
      success: true,
      data: {
        tools: this.agentService.getAvailableTools(),
      },
    };
  }

  /**
   * GET /agent/health
   * 
   * Health check endpoint.
   */
  @Get('health')
  healthCheck() {
    return {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
