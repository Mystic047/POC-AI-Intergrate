import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './services/ai';
import { CsvService } from './services/csv.service';
import { CalculatorService } from './services/calculator.service';
import { QueryService } from './services/query.service';
import { AgentService } from './services/agent.service';
import { WorkOrderService } from './services/workorder.service';
import { ConversationStore } from './services/conversation.store';
import { MaintenanceController } from './controllers/maintenance.controller';
import { AgentController } from './controllers/agent.controller';
import { WorkOrderController } from './controllers/workorder.controller';

@Module({
  imports: [
    // Load .env file
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [MaintenanceController, AgentController, WorkOrderController],
  providers: [
    AIService, 
    CsvService, 
    CalculatorService, 
    QueryService, 
    AgentService, 
    WorkOrderService,
    ConversationStore, // For conversation memory
  ],
  exports: [
    AIService, 
    CsvService, 
    CalculatorService, 
    QueryService, 
    AgentService, 
    WorkOrderService,
    ConversationStore,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly csvService: CsvService,
    private readonly workOrderService: WorkOrderService,
  ) {}

  /**
   * Initialize data when module starts
   * This ensures all CSV data is loaded before any API calls
   */
  async onModuleInit() {
    console.log('Loading data from CSV files...');
    
    // Load maintenance costs
    await this.csvService.loadData();
    console.log('✓ ' + this.csvService.getSummary());
    
    // Load work order counts
    await this.workOrderService.loadData();
    console.log('✓ ' + this.workOrderService.getSummary());
    
    console.log('All data loaded successfully!');
  }
}
