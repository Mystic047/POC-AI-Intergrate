import { Injectable } from '@nestjs/common';
import { ChatMessage } from './ai/ai.interface';

/**
 * Conversation data structure
 */
export interface Conversation {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

/**
 * ConversationStore - In-memory conversation history storage
 * 
 * This service provides "Conversation Memory" (Multi-turn Conversation).
 * It stores chat history per session so the AI can remember context.
 * 
 * Features:
 * - Session-based storage (each user gets their own history)
 * - Auto-cleanup of old conversations (30 min timeout)
 * - Max 50 messages per session to manage token usage
 * 
 * Production alternatives:
 * - Redis (for distributed systems)
 * - Database (for persistence)
 */
@Injectable()
export class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();
  
  // Config
  private readonly MAX_MESSAGES_PER_SESSION = 50; // Prevent token overflow
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup old sessions every 5 minutes
    setInterval(() => this.cleanupOldSessions(), 5 * 60 * 1000);
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get or create a conversation for a session
   */
  getOrCreate(sessionId: string): Conversation {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        sessionId,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      });
    }
    
    const conversation = this.conversations.get(sessionId)!;
    conversation.lastActivity = new Date();
    return conversation;
  }

  /**
   * Get conversation history for a session
   */
  getMessages(sessionId: string): ChatMessage[] {
    const conversation = this.conversations.get(sessionId);
    return conversation?.messages || [];
  }

  /**
   * Add a message to the conversation history
   */
  addMessage(sessionId: string, message: ChatMessage): void {
    const conversation = this.getOrCreate(sessionId);
    conversation.messages.push(message);
    
    // Trim if exceeds max (keep system message + recent messages)
    if (conversation.messages.length > this.MAX_MESSAGES_PER_SESSION) {
      // Keep first message (usually system) and last N messages
      const systemMessages = conversation.messages.filter(m => m.role === 'system');
      const otherMessages = conversation.messages.filter(m => m.role !== 'system');
      const recentMessages = otherMessages.slice(-this.MAX_MESSAGES_PER_SESSION + systemMessages.length);
      conversation.messages = [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Add multiple messages at once
   */
  addMessages(sessionId: string, messages: ChatMessage[]): void {
    messages.forEach(msg => this.addMessage(sessionId, msg));
  }

  /**
   * Clear conversation for a session
   */
  clear(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  /**
   * Get session info (for debugging)
   */
  getSessionInfo(sessionId: string): { 
    exists: boolean; 
    messageCount: number; 
    createdAt?: Date;
    lastActivity?: Date;
  } {
    const conversation = this.conversations.get(sessionId);
    if (!conversation) {
      return { exists: false, messageCount: 0 };
    }
    return {
      exists: true,
      messageCount: conversation.messages.length,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
    };
  }

  /**
   * List all active sessions (for debugging)
   */
  listSessions(): { sessionId: string; messageCount: number; lastActivity: Date }[] {
    return Array.from(this.conversations.values()).map(conv => ({
      sessionId: conv.sessionId,
      messageCount: conv.messages.length,
      lastActivity: conv.lastActivity,
    }));
  }

  /**
   * Cleanup sessions that have been inactive for too long
   */
  private cleanupOldSessions(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [sessionId, conversation] of this.conversations.entries()) {
      if (now - conversation.lastActivity.getTime() > this.SESSION_TIMEOUT_MS) {
        this.conversations.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[ConversationStore] Cleaned up ${cleaned} inactive sessions`);
    }
  }
}
