# AI Function Calling Architecture

## Overview

This document explains the **AI Function Calling** (Tool Use) pattern used in the `server.ts` implementation. This is a modern approach for building AI-powered applications that need to interact with external systems (APIs, databases, etc.) based on natural language queries.

---

## 🎯 The Problem This Solves

**Traditional approach (problematic):**
```
User: "What was the total cost in January 2025?"
     ↓
AI generates answer from training data (HALLUCINATION!)
     ↓
Wrong numbers like "1,697,600 THB" (made up)
```

**Function Calling approach (accurate):**
```
User: "What was the total cost in January 2025?"
     ↓
AI decides: "I need to call get_cost_summary(startDate, endDate)"
     ↓
System calls real API with those parameters
     ↓
AI formats the REAL data into a human response
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER REQUEST                                   │
│                  "ค่าใช้จ่ายเดือนมกราคม 2025 เท่าไหร่?"                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS SERVER                                   │
│                        POST /chat endpoint                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 1: INTENT DETECTION                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  OpenAI API (with tools parameter)                                │  │
│  │  - Analyzes user question                                         │  │
│  │  - Matches to defined tools based on description                  │  │
│  │  - Returns: tool_calls with function name + arguments             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Example output:                                                         │
│  {                                                                       │
│    tool_calls: [{                                                        │
│      function: {                                                         │
│        name: "get_cost_summary",                                         │
│        arguments: '{"startDate":"2025-01-01","endDate":"2025-01-31"}'   │
│      }                                                                   │
│    }]                                                                    │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 2: VALIDATION (Zod)                              │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  CostSummarySchema.parse(rawArgs)                                 │  │
│  │  - Validates data types                                           │  │
│  │  - Applies defaults                                               │  │
│  │  - Enforces security (siteId from session, not prompt)           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 3: EXECUTE TOOL                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  callCostApi(validatedArgs)                                       │  │
│  │  - Calls external Analytics API                                   │  │
│  │  - Returns real data from database                                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  API Response:                                                           │
│  {                                                                       │
│    "totalCost": 52100,                                                   │
│    "breakdown": { "manhrs": 15000, "sparepart": 28000, ... }            │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    STEP 4: SUMMARIZE RESPONSE                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  OpenAI API (with tool results)                                   │  │
│  │  - Receives original question + tool output                       │  │
│  │  - Formats data into natural language                             │  │
│  │  - Uses REAL numbers (no hallucination)                           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FINAL RESPONSE                                 │
│     "ค่าใช้จ่ายเดือนมกราคม 2025 รวมทั้งสิ้น 52,100 บาท                       │
│      แบ่งเป็น ค่าแรง 15,000 บาท อะไหล่ 28,000 บาท..."                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📚 Key Concepts

### 1. Function Calling (Tool Use)

**What is it?**
A feature in OpenAI/Azure OpenAI that allows the AI to:
- Understand when it needs external data
- Extract structured parameters from natural language
- Request specific functions to be called

**How it works:**
```typescript
// Define available tools
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_cost_summary',
      description: 'Get workorder cost summary...',  // AI reads this!
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
];

// AI decides which tool to call
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
  tools,              // Pass tool definitions
  tool_choice: 'auto', // Let AI decide
});
```

### 2. Intent Detection

**What is it?**
The process of understanding what the user wants to do.

| User Query | Detected Intent | Tool Called |
|------------|-----------------|-------------|
| "ค่าใช้จ่ายเท่าไหร่?" | cost | `get_cost_summary` |
| "มีงานค้างกี่ใบ?" | work_summary | `get_work_summary` |
| "สวัสดี" | greeting | No tool (direct response) |

**How AI decides:**
The AI reads the `description` field of each tool and matches it to the user's intent:

```typescript
{
  name: 'get_cost_summary',
  description: 'Intent: cost. Get workorder cost summary. Use for questions about cost/expense/spend.',
  //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //           AI uses this description to decide when to call this function
}
```

### 3. Schema Validation (Zod)

**What is it?**
Runtime validation to ensure data is correct and safe before using it.

```typescript
const CostSummarySchema = z.object({
  startDate: z.string(),                                    // Required string
  endDate: z.string(),                                      // Required string
  siteId: z.string().optional(),                            // Optional
  groupBy: z.enum(['none', 'day', 'week', 'month']).default('none'),  // Enum with default
  status: z.enum(['all', 'closed_only']).default('closed_only'),
});

// Usage - throws error if invalid
const validated = CostSummarySchema.parse(rawArgs);
```

**Why use it?**
- AI might generate invalid parameters
- Prevents SQL injection / security issues
- Provides type safety

### 4. Security: Scope Enforcement

**Critical security pattern:**
```typescript
async function runTool(name: string, rawArgs: any, userContext: { siteId?: string }) {
  const parsed = CostSummarySchema.parse({
    ...rawArgs,
    // 🔒 SECURITY: Always use session siteId, ignore what AI/user says
    siteId: userContext.siteId ?? rawArgs.siteId,
  });
  return callCostApi(parsed);
}
```

**Why?**
A malicious user could ask: "Show me costs for siteId: COMPETITOR_SITE"
Without scope enforcement, AI might pass that siteId to the API!

---

## 🔄 Request Flow (Step by Step)

### Step 1: User Sends Question
```http
POST /chat
Content-Type: application/json

{
  "question": "ค่าใช้จ่ายเดือนมกราคม 2025 เท่าไหร่?",
  "siteId": "SITE001"
}
```

### Step 2: First OpenAI Call (Intent Detection)
```typescript
const first = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ],
  tools,
  tool_choice: 'auto',
});
```

**OpenAI Response:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_cost_summary",
          "arguments": "{\"startDate\":\"2025-01-01\",\"endDate\":\"2025-01-31\"}"
        }
      }]
    }
  }]
}
```

### Step 3: Execute Tool & Call External API
```typescript
const data = await runTool('get_cost_summary', { startDate: '2025-01-01', endDate: '2025-01-31' }, userContext);
// Calls: GET /analytics/workorders/cost-summary?startDate=2025-01-01&endDate=2025-01-31
```

**API Response:**
```json
{
  "totalCost": 52100,
  "breakdown": {
    "manhrs": 15000,
    "sparepart": 28000,
    "outsource": 9100
  }
}
```

### Step 4: Second OpenAI Call (Format Response)
```typescript
const final = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
    msg,  // Assistant message with tool_calls
    {
      role: 'tool',
      tool_call_id: 'call_abc123',
      content: JSON.stringify(apiResponse),  // Real data!
    },
  ],
});
```

**Final Response:**
```json
{
  "answer": "ค่าใช้จ่ายเดือนมกราคม 2025 รวมทั้งสิ้น 52,100 บาท แบ่งเป็น ค่าแรง 15,000 บาท อะไหล่ 28,000 บาท และจ้างภายนอก 9,100 บาท"
}
```

---

## 📋 Prerequisites

### 1. OpenAI API Key (Paid)
```bash
# .env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o
```

**Pricing:**
| Model | Input | Output |
|-------|-------|--------|
| gpt-4o-mini | $0.15/1M tokens | $0.60/1M tokens |
| gpt-4o | $2.50/1M tokens | $10.00/1M tokens |

### 2. External Analytics API
```bash
# .env
ANALYTICS_API_BASE_URL=https://your-api.example.com
ANALYTICS_API_TOKEN=your-bearer-token
```

### 3. Dependencies
```bash
npm install express openai zod dotenv
npm install -D typescript @types/express @types/node
```

### 4. package.json
```json
{
  "scripts": {
    "start": "ts-node server.ts",
    "dev": "ts-node-dev server.ts"
  }
}
```

---

## 🆚 Comparison with Your Current Implementation

| Feature | Your POC (Prompt Parsing) | server.ts (Function Calling) |
|---------|---------------------------|------------------------------|
| **Intent Detection** | AI → JSON prompt | Native tool_calls |
| **Reliability** | May fail JSON parsing | Structured output |
| **AI Provider** | GitHub Models (Free) ✅ | OpenAI (Paid) 💰 |
| **Data Source** | Local CSV | External API |
| **Calculation** | In-code (accurate) ✅ | Trusts API |
| **Multi-tenant** | No | Yes (siteId scope) |

---

## 🚀 When to Use Each Approach

### Use Function Calling (server.ts) when:
- ✅ You have external APIs to call
- ✅ Need multi-tenant security (siteId scoping)
- ✅ Multiple distinct intents (cost, work, inventory, etc.)
- ✅ Production system with budget for OpenAI

### Use Prompt Parsing (Your POC) when:
- ✅ Data is local (CSV, database you control)
- ✅ Need accurate calculations (don't trust AI math)
- ✅ Want free AI (GitHub Models, Ollama)
- ✅ Single-tenant or POC stage

---

## 🔧 Best Practices

### 1. Always Validate AI Output
```typescript
// ❌ Bad - trusting AI directly
const args = JSON.parse(toolCall.function.arguments);
callApi(args);

// ✅ Good - validate with Zod
const validated = MySchema.parse(JSON.parse(toolCall.function.arguments));
callApi(validated);
```

### 2. Never Trust User/AI for Authorization
```typescript
// ❌ Bad - AI could leak data
siteId: rawArgs.siteId

// ✅ Good - enforce from session
siteId: userContext.siteId ?? rawArgs.siteId
```

### 3. Provide Good Tool Descriptions
```typescript
// ❌ Bad - AI won't know when to use
description: 'Get data'

// ✅ Good - AI knows exactly when to use
description: 'Intent: cost. Get workorder cost summary for a date range. Use for questions about cost/expense/spend/budget.'
```

### 4. Handle No-Tool Responses
```typescript
// User might ask something that doesn't need a tool
if (!msg?.tool_calls?.length) {
  return res.json({ answer: msg?.content ?? 'No response.' });
}
```

---

## 📖 Glossary

| Term | Definition |
|------|------------|
| **Function Calling** | OpenAI feature that lets AI request specific functions |
| **Tool** | A function definition the AI can choose to call |
| **Intent** | What the user wants to do (cost, work_summary, etc.) |
| **Zod** | TypeScript validation library |
| **tool_calls** | Array of functions AI wants to execute |
| **tool_call_id** | Unique ID linking request to response |

---

## 📚 Further Reading

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Zod Documentation](https://zod.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
