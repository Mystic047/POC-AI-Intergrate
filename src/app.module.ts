import { Module } from '@nestjs/common';
import { AIService } from './services/ai';
import { CsvService } from './services/csv.service';
import { CalculatorService } from './services/calculator.service';
import { QueryService } from './services/query.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AIService, CsvService, CalculatorService, QueryService],
  exports: [AIService, CsvService, CalculatorService, QueryService],
})
export class AppModule {}
