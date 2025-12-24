import { Injectable } from '@nestjs/common';
import { IAIProvider, AIProviderType, ChatMessage } from './ai.interface';
import { AIProviderFactory } from './ai-provider.factory';
import { WoType, CostType } from '../../types';

export interface ParsedQuery {
  year?: number;
  monthStart?: number;
  monthEnd?: number;
  woType?: WoType;
  costType?: CostType;
  compareWoTypes?: [WoType, WoType];
  queryType: 'total' | 'compare' | 'breakdown' | 'list';
}

@Injectable()
export class AIService {
  private provider: IAIProvider;

  constructor() {
    this.provider = AIProviderFactory.createFromEnv();
  }

  getProviderName(): string {
    return this.provider.getName();
  }

  async checkConnection(): Promise<boolean> {
    return this.provider.checkConnection();
  }

  async listModels(): Promise<string[]> {
    return this.provider.listModels();
  }

  switchProvider(type: AIProviderType): void {
    this.provider = AIProviderFactory.create(type);
  }

  async generate(prompt: string): Promise<string> {
    return this.provider.generate(prompt);
  }

  async generateChat(messages: ChatMessage[]): Promise<string> {
    return this.provider.generateChat(messages);
  }

  async parseQuestion(question: string): Promise<ParsedQuery> {
    const prompt = this.buildParsePrompt(question);

    try {
      const response = await this.provider.generate(prompt);
      return this.extractJsonFromResponse(response);
    } catch (error) {
      console.error('Error parsing question:', error);
      return { queryType: 'breakdown' };
    }
  }

  private buildParsePrompt(question: string): string {
    return `You are a query parser. Extract filter criteria from the user's question about maintenance costs.

The data has these fields:
- year: 2024 or 2025
- month: 1-12
- woType: "breakdown", "corrective", or "preventive"
- costType: "manhrs", "sparepart", or "outsource"

Return ONLY a valid JSON object with these optional fields:
{
  "year": number or null,
  "monthStart": number or null (1-12),
  "monthEnd": number or null (1-12),
  "woType": "breakdown" | "corrective" | "preventive" | null,
  "costType": "manhrs" | "sparepart" | "outsource" | null,
  "compareWoTypes": ["type1", "type2"] or null (if comparing two work order types),
  "queryType": "total" | "compare" | "breakdown" | "list"
}

Examples:
- "total sparepart cost for preventive in 2025 months 1-6" → {"year":2025,"monthStart":1,"monthEnd":6,"woType":"preventive","costType":"sparepart","queryType":"total"}
- "compare breakdown vs preventive in 2025" → {"year":2025,"compareWoTypes":["breakdown","preventive"],"queryType":"compare"}
- "all costs in January 2025" → {"year":2025,"monthStart":1,"monthEnd":1,"queryType":"breakdown"}

User question: "${question}"

Return ONLY the JSON object, no explanation:`;
  }

  private extractJsonFromResponse(response: string): ParsedQuery {
    let jsonStr = response.trim();

    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }

    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }

    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    return {
      year: parsed.year || undefined,
      monthStart: parsed.monthStart || undefined,
      monthEnd: parsed.monthEnd || undefined,
      woType: parsed.woType || undefined,
      costType: parsed.costType || undefined,
      compareWoTypes: parsed.compareWoTypes || undefined,
      queryType: parsed.queryType || 'breakdown',
    };
  }

  async formatResponse(question: string, calculatedData: string): Promise<string> {
    const prompt = `You are a senior maintenance cost analyst with 15+ years of experience. The user asked: "${question}"

Here are the ACCURATE CALCULATED RESULTS (use these exact numbers):

${calculatedData}

RESPONSE RULES:
1. Answer like an expert analyst speaking to management - confident, direct, insightful
2. DO NOT use markdown formatting (no **, no ##, no bullet points with -)
3. Use plain text only with numbers formatted with commas (e.g., 52,100 THB)
4. Provide brief expert insight or observation about the numbers when relevant
5. Keep it concise - 2-4 sentences max for simple queries
6. Sound natural and professional, not robotic
7. LANGUAGE: Detect the language of the user's question and respond in the SAME language. If the question is in Thai, respond in Thai. If the question is in English, respond in English.`;

    return this.provider.generate(prompt);
  }

  async askWithCalculatedData(question: string, calculatedContext: string): Promise<string> {
    const prompt = `You are a maintenance cost expert analyzing data. 

${calculatedContext}

IMPORTANT RULES:
1. Use ONLY the numbers provided above - they are 100% accurate
2. DO NOT calculate or estimate - the calculations are already done
3. Format numbers with commas (e.g., 52,100 THB)
4. If asked to compare, use the exact totals provided

User question: "${question}"

Provide a clear, accurate answer using the data above:`;

    return this.provider.generate(prompt);
  }
}
