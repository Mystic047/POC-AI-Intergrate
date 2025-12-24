# 🔧 Maintenance Cost AI Assistant

A CLI-based AI assistant that analyzes maintenance cost data using natural language queries. Built with NestJS and powered by local Ollama AI.

## 📊 Data Structure

| Column | Description | Values |
|--------|-------------|--------|
| `year` | Year of record | 2024, 2025, ... |
| `month` | Month (1-12) | 1-12 |
| `woType` | Work Order Type | `breakdown`, `corrective`, `preventive` |
| `costType` | Cost Category | `manhrs`, `sparepart`, `outsource` |
| `cost` | Cost in THB | numeric |

## 🚀 Quick Start

### Option 1: GitHub Models (Cloud AI) ☁️

The fastest way to get started - no Docker or GPU needed!

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
AI_PROVIDER=github
GITHUB_TOKEN=your_github_token_here
GITHUB_MODEL=gpt-4o-mini

# 3. Run the CLI
npm run cli
```

**Get your GitHub Token:**
1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Create a Fine-grained token with default permissions
3. Copy and paste into `.env`

### Option 2: Docker Compose with Ollama (Local AI) 🐳

Run everything locally with GPU acceleration - 100% private!

```bash
# With NVIDIA GPU (recommended for faster inference)
docker-compose up

# Without GPU (CPU only - slower but works everywhere)
docker-compose -f docker-compose.cpu.yml up
```

This will automatically:
1. Start Ollama container
2. Download the AI model (first run only, ~2GB)
3. Build and run the CLI application

### Option 3: Local Development with Ollama

#### Prerequisites

1. **Node.js** (v18 or higher)
2. **Docker Desktop** with GPU support
3. **Ollama** running in Docker (see [LOCAL_AI_SETUP.md](LOCAL_AI_SETUP.md))

#### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure .env for Ollama
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=llama3.2

# 3. Make sure Ollama is running
docker start ollama

# 4. Verify model is available
docker exec -it ollama ollama list

# 5. Run the CLI
npm run cli
```

### 🔄 Switching Between Providers

Edit `.env` to switch:

```env
# Use GitHub Models (Cloud)
AI_PROVIDER=github

# Use Ollama (Local)
AI_PROVIDER=ollama
```

## 💬 Usage

Once running, you can ask natural language questions like:

```
🤖 Ask me about maintenance costs: What is the total cost of sparepart for preventive maintenance in 2025 from month 1 to 6?
```

### Example Questions

- "What is the total cost of sparepart for preventive in 2025 months 1-6?"
- "Show me all breakdown costs in January 2025"
- "What is the total manhrs cost for corrective work orders?"
- "Compare preventive vs breakdown total costs in 2025"
- "Which month had the highest outsource expense?"

### Commands

| Command | Description |
|---------|-------------|
| `help` | Show help and example questions |
| `summary` | Display data statistics |
| `models` | List available AI models |
| `provider` | Show current AI provider |
| `load <path>` | Load a custom CSV file |
| `reload` | Reload the current CSV file |
| `exit` | Exit the program |

## 📁 Project Structure

```
├── data/
│   └── maintenance_costs.csv        # Your data file
├── src/
│   ├── services/
│   │   ├── ai/                      # AI Provider Module
│   │   │   ├── ai.interface.ts      # Provider interface & types
│   │   │   ├── ollama.provider.ts   # Ollama implementation
│   │   │   ├── github.provider.ts   # GitHub Models implementation
│   │   │   ├── ai-provider.factory.ts # Factory for creating providers
│   │   │   ├── ai.service.ts        # Main AI service (parsing, formatting)
│   │   │   └── index.ts             # Module exports
│   │   ├── csv.service.ts           # CSV parsing & data access
│   │   ├── calculator.service.ts    # 100% accurate calculations
│   │   ├── query.service.ts         # 3-step hybrid orchestration
│   │   └── index.ts                 # Services exports
│   ├── types/
│   │   └── maintenance.types.ts     # TypeScript interfaces
│   ├── app.module.ts                # NestJS module
│   └── cli.ts                       # CLI entry point
├── docker-compose.yml               # Docker setup with GPU
├── docker-compose.cpu.yml           # Docker setup without GPU
├── Dockerfile                       # App container image
├── .env                             # Environment variables
└── package.json
```

## 🔄 How It Works (Hybrid Approach)

This project uses a **3-step hybrid approach** for 100% accurate calculations:

```
┌─────────────────────────────────────────────────────────────────┐
│  Step 1: AI PARSES your question                                │
│  "What is sparepart cost for preventive in 2025 months 1-6?"    │
│  → Extracts: {year: 2025, monthStart: 1, monthEnd: 6, ...}      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 2: CODE CALCULATES (TypeScript - 100% accurate)           │
│  → Filters CSV data                                             │
│  → Sums: 2500 + 2200 + 2800 + 2600 + 3000 + 2900 = 16,000      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Step 3: AI FORMATS the response                                │
│  → "The total sparepart cost is 16,000 THB"                     │
└─────────────────────────────────────────────────────────────────┘
```

**Why?** LLMs are bad at math. This approach lets AI handle language while code handles numbers.

## 🏗️ Architecture & Design Patterns

This project follows clean architecture principles and SOLID design patterns:

### AI Provider Pattern (Strategy + Factory)

```
┌─────────────────────────────────────────────────────────────────┐
│                     IAIProvider Interface                        │
│  - getName(): string                                            │
│  - checkConnection(): Promise<boolean>                          │
│  - generate(prompt): Promise<string>                            │
│  - generateChat(messages): Promise<string>                      │
└─────────────────────────────────────────────────────────────────┘
                    ▲                     ▲
                    │                     │
        ┌───────────┴───────┐   ┌────────┴────────┐
        │  OllamaProvider   │   │  GitHubProvider │
        │  (Local Docker)   │   │  (Cloud API)    │
        └───────────────────┘   └─────────────────┘
                    │                     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  AIProviderFactory  │
                    │  createFromEnv()    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │     AIService       │
                    │  parseQuestion()    │
                    │  formatResponse()   │
                    └─────────────────────┘
```

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| `AIService` | AI operations: parsing questions, formatting responses |
| `OllamaProvider` | Ollama-specific API communication |
| `GitHubProvider` | GitHub Models API communication |
| `CalculatorService` | 100% accurate mathematical calculations |
| `CsvService` | Data loading, filtering, and access |
| `QueryService` | Orchestrates the 3-step hybrid flow |

### Adding a New AI Provider

1. Create `src/services/ai/new.provider.ts` implementing `IAIProvider`
2. Add to `AIProviderFactory.create()` switch statement
3. Update `AIProviderType` union type
4. Add environment variables for configuration

## ⚙️ Configuration

Edit `.env` file:

```env
# ===========================================
# AI Provider: "ollama" or "github"
# ===========================================
AI_PROVIDER=github

# ===========================================
# GitHub Models (Cloud)
# ===========================================
GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
GITHUB_MODEL=gpt-4o-mini
# Available: gpt-4o, gpt-4o-mini, Llama-3.3-70B-Instruct, Mistral-large-2411

# ===========================================
# Ollama (Local Docker)
# ===========================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TEXT_MODEL=llama3.2
```

### Provider Comparison

| Feature | GitHub Models | Ollama |
|---------|--------------|--------|
| Setup | Just API token | Docker + GPU |
| Speed | ⚡ Fast (~2-5s) | 🐢 Slower (~5-15s) |
| Privacy | ☁️ Cloud | 🔒 100% Local |
| Cost | Free tier available | Free forever |
| Offline | ❌ Needs internet | ✅ Works offline |

## 📝 Using Your Own Data

Replace `data/maintenance_costs.csv` with your own data. Ensure it has these columns:

```csv
year,month,woType,costType,cost
2025,1,preventive,sparepart,2500
```

## 🐳 Ollama Setup

See [LOCAL_AI_SETUP.md](LOCAL_AI_SETUP.md) for detailed Ollama setup instructions.

Quick commands:

```bash
# Start Ollama container
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Download model
docker exec -it ollama ollama pull llama3.2:7b

# Check status
docker ps
curl http://localhost:11434/api/tags
```

## 📜 License

MIT
