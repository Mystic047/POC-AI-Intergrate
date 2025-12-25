import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for testing
  app.enableCors();
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║          AI Agent with Function Calling is running!                  ║
╠══════════════════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${port}                                   ║
║                                                                      ║
║  🤖 AGENT ENDPOINTS:                                                 ║
║  ├─ POST /agent/chat        - Main AI chat endpoint                  ║
║  ├─ POST /agent/chat/debug  - Chat with execution steps              ║
║  ├─ GET  /agent/tools       - List available tools                   ║
║  └─ GET  /agent/health      - Health check                           ║
║                                                                      ║
║  💰 COST API (maintenance_costs.csv):                                ║
║  ├─ GET  /api/maintenance/cost-summary - Cost data                   ║
║  ├─ GET  /api/maintenance/compare      - Compare costs               ║
║  ├─ GET  /api/maintenance/data         - Raw cost data               ║
║  └─ GET  /api/maintenance/summary      - Cost data overview          ║
║                                                                      ║
║  🔢 WORKORDER API (workorder_counts.csv):                            ║
║  ├─ GET  /api/workorders/summary       - Work order counts           ║
║  ├─ GET  /api/workorders/compare       - Compare WO counts           ║
║  ├─ GET  /api/workorders/data          - Raw WO count data           ║
║  └─ GET  /api/workorders/overview      - WO data overview            ║
╚══════════════════════════════════════════════════════════════════════╝
  `);
}
bootstrap();
