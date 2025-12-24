import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { QueryService } from './services';

// Load environment variables from .env file
dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function printBanner() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║                                                                ║
║   ${colors.bright}🔧 Maintenance Cost AI Assistant${colors.reset}${colors.cyan}                          ║
║   ${colors.reset}Powered by Ollama / GitHub Models + NestJS${colors.cyan}                  ║
║                                                                ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
  `);
}

function printHelp() {
  console.log(`
${colors.yellow}📖 Available Commands:${colors.reset}
  ${colors.green}help${colors.reset}            - Show this help message
  ${colors.green}summary${colors.reset}         - Show data summary statistics
  ${colors.green}models${colors.reset}          - List available AI models
  ${colors.green}provider${colors.reset}        - Show current AI provider
  ${colors.green}load <path>${colors.reset}     - Load a different CSV file
  ${colors.green}reload${colors.reset}          - Reload the current CSV file
  ${colors.green}exit${colors.reset}            - Exit the program

${colors.yellow}💡 Example Questions:${colors.reset}
  • What is the total cost of sparepart for preventive maintenance in 2025 from month 1 to 6?
  • Show me all breakdown costs in January 2025
  • What is the total manhrs cost for corrective work orders in 2025?
  • Compare preventive vs breakdown costs in 2025
  • What month had the highest outsource cost in 2025?

${colors.yellow}📂 Load Custom CSV:${colors.reset}
  load ./my_data.csv
  load C:/path/to/your/file.csv
  `);
}

async function main() {
  printBanner();
  
  // Create NestJS application context
  console.log(`${colors.blue}⏳ Initializing...${colors.reset}`);
  
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // Disable NestJS logging for cleaner CLI output
  });

  const queryService = app.get(QueryService);

  // Check AI connection
  console.log(`${colors.blue}🔍 Checking AI connection...${colors.reset}`);
  const isConnected = await queryService.checkConnection();
  const providerName = queryService.getProviderName();
  
  if (!isConnected) {
    const provider = process.env.AI_PROVIDER || 'ollama';
    
    if (provider === 'github') {
      console.log(`
${colors.red}❌ Cannot connect to GitHub Models!${colors.reset}

${colors.yellow}Please check:${colors.reset}
1. Your GITHUB_TOKEN is set correctly in .env
2. The token has access to GitHub Models
3. Internet connection is available
`);
    } else {
      console.log(`
${colors.red}❌ Cannot connect to Ollama!${colors.reset}

${colors.yellow}Please make sure:${colors.reset}
1. Docker is running
2. Ollama container is started:
   ${colors.cyan}docker start ollama${colors.reset}
   
   Or create it:
   ${colors.cyan}docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama${colors.reset}

3. Model is downloaded:
   ${colors.cyan}docker exec -it ollama ollama pull llama3.2${colors.reset}
`);
    }
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Connected to ${providerName}${colors.reset}`);

  // Load CSV data
  try {
    await queryService.initialize();
    console.log(`${colors.green}✅ Data loaded successfully!${colors.reset}\n`);
  } catch (error: any) {
    console.log(`${colors.red}❌ Failed to load data: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  // Print help
  printHelp();

  // Create readline interface for interactive input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(`\n${colors.magenta}🤖 Ask me about maintenance costs: ${colors.reset}`, async (input) => {
      const trimmedInput = input.trim().toLowerCase();

      if (!input.trim()) {
        prompt();
        return;
      }

      // Handle special commands
      if (trimmedInput === 'exit' || trimmedInput === 'quit' || trimmedInput === 'q') {
        console.log(`\n${colors.green}👋 Goodbye!${colors.reset}\n`);
        rl.close();
        await app.close();
        process.exit(0);
      }

      if (trimmedInput === 'help' || trimmedInput === 'h') {
        printHelp();
        prompt();
        return;
      }

      if (trimmedInput === 'summary') {
        console.log(`\n${colors.cyan}${queryService.getSummary()}${colors.reset}`);
        prompt();
        return;
      }

      if (trimmedInput === 'models') {
        const models = await queryService.listModels();
        console.log(`\n${colors.cyan}📦 Available Models:${colors.reset}`);
        models.forEach(m => console.log(`  - ${m}`));
        prompt();
        return;
      }

      if (trimmedInput === 'provider') {
        console.log(`\n${colors.cyan}🤖 Current Provider: ${queryService.getProviderName()}${colors.reset}`);
        prompt();
        return;
      }

      // Load custom CSV file
      if (trimmedInput.startsWith('load ')) {
        const filePath = input.trim().substring(5).trim();
        if (!filePath) {
          console.log(`\n${colors.red}❌ Please specify a file path: load ./path/to/file.csv${colors.reset}`);
          prompt();
          return;
        }
        
        console.log(`\n${colors.blue}📂 Loading CSV file: ${filePath}${colors.reset}`);
        try {
          await queryService.initialize(filePath);
          console.log(`${colors.green}✅ Data loaded successfully!${colors.reset}`);
          console.log(`\n${colors.cyan}${queryService.getSummary()}${colors.reset}`);
        } catch (error: any) {
          console.log(`${colors.red}❌ Failed to load file: ${error.message}${colors.reset}`);
        }
        prompt();
        return;
      }

      // Reload current CSV file
      if (trimmedInput === 'reload') {
        console.log(`\n${colors.blue}🔄 Reloading CSV data...${colors.reset}`);
        try {
          await queryService.initialize();
          console.log(`${colors.green}✅ Data reloaded successfully!${colors.reset}`);
          console.log(`\n${colors.cyan}${queryService.getSummary()}${colors.reset}`);
        } catch (error: any) {
          console.log(`${colors.red}❌ Failed to reload: ${error.message}${colors.reset}`);
        }
        prompt();
        return;
      }

      // Process the question with AI
      console.log(`\n${colors.blue}⏳ Analyzing data...${colors.reset}`);
      
      try {
        const startTime = Date.now();
        const result = await queryService.processQuery(input.trim());
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        
        console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.cyan}📊 Answer:${colors.reset}\n`);
        console.log(result.answer);
        console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.yellow}⏱️  Response time: ${elapsed}s${colors.reset}`);
      } catch (error: any) {
        console.log(`\n${colors.red}❌ Error: ${error.message}${colors.reset}`);
      }

      prompt();
    });
  };

  prompt();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.green}👋 Goodbye!${colors.reset}\n`);
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
