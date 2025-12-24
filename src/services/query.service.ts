import { Injectable } from '@nestjs/common';
import { AIService } from './ai';
import { CsvService } from './csv.service';
import { CalculatorService } from './calculator.service';
import { QueryResult } from '../types';

@Injectable()
export class QueryService {
  constructor(
    private readonly aiService: AIService,
    private readonly csvService: CsvService,
    private readonly calculatorService: CalculatorService
  ) {}

  async initialize(filePath?: string): Promise<void> {
    await this.csvService.loadData(filePath);
  }

  async checkConnection(): Promise<boolean> {
    return this.aiService.checkConnection();
  }

  getProviderName(): string {
    return this.aiService.getProviderName();
  }

  getSummary(): string {
    return this.csvService.getSummary();
  }

  async listModels(): Promise<string[]> {
    return this.aiService.listModels();
  }

  async processQuery(question: string): Promise<QueryResult> {
    const parsedQuery = await this.aiService.parseQuestion(question);

    const filteredData = this.csvService.filterData({
      year: parsedQuery.year,
      monthStart: parsedQuery.monthStart,
      monthEnd: parsedQuery.monthEnd,
      woType: parsedQuery.woType,
    });

    const calculationResult = this.calculatorService.calculate(
      filteredData,
      parsedQuery.costType
    );

    let comparison;
    if (parsedQuery.compareWoTypes) {
      comparison = this.calculatorService.compareWoTypes(
        filteredData.length > 0 ? filteredData : this.csvService.getAllData(),
        parsedQuery.compareWoTypes[0],
        parsedQuery.compareWoTypes[1]
      );
    }

    const calculatedContext = this.calculatorService.buildResultContext(
      parsedQuery,
      calculationResult,
      comparison
    );

    const answer = await this.aiService.formatResponse(
      question,
      calculatedContext
    );

    return {
      question,
      parsedQuery,
      calculationResult,
      answer,
      rawContext: calculatedContext,
    };
  }

  async getSystemStatus(): Promise<{
    aiConnected: boolean;
    aiProvider: string;
    dataLoaded: boolean;
    dataSummary: string;
  }> {
    const aiConnected = await this.aiService.checkConnection();
    const aiProvider = this.aiService.getProviderName();
    const dataSummary = this.csvService.getSummary();

    return {
      aiConnected,
      aiProvider,
      dataLoaded: dataSummary.includes('records'),
      dataSummary,
    };
  }
}
