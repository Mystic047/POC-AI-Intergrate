import { ToolDefinition } from './ai/ai.interface';

/**
 * Tool Definitions for Maintenance Cost AI Agent
 * 
 * These tools tell the AI what functions it can call and when to use them.
 * The AI reads the 'description' field to decide which tool matches the user's intent.
 * 
 * TWO CATEGORIES:
 * 1. COST tools - for questions about money/expenses (THB)
 * 2. WORKORDER tools - for questions about number/count of work orders
 */

export const MAINTENANCE_TOOLS: ToolDefinition[] = [
  // ============================================
  // COST TOOLS (Money / Expenses)
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_cost_summary',
      description: `Get maintenance COST summary in THB.
Use for questions about: cost, expense, money, ค่าใช้จ่าย, บาท
IMPORTANT: Only use year, monthStart, monthEnd parameters unless user specifically asks about a cost type or work order type.`,
      parameters: {
        type: 'object',
        properties: {
          year: {
            type: 'string',
            description: 'Year to filter (e.g., "2024", "2025")',
          },
          monthStart: {
            type: 'string',
            description: 'Start month (1-12)',
          },
          monthEnd: {
            type: 'string',
            description: 'End month (1-12)',
          },
          woType: {
            type: 'string',
            description: 'ONLY use if user asks about specific work order type: breakdown, corrective, or preventive',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
          costType: {
            type: 'string',
            description: 'ONLY use if user asks about specific cost type: manhrs (labor), sparepart, or outsource',
            enum: ['manhrs', 'sparepart', 'outsource'],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_cost_wo_types',
      description: `Intent: compare costs, which costs more, cost difference, ค่าใช้จ่ายเปรียบเทียบ.
Compare COSTS (in THB) between two work order types.
Use this tool when the user asks to compare MONEY/EXPENSES between types.
Keywords: compare cost, which costs more, cost difference, expensive
Examples: "compare cost of breakdown vs preventive", "which type costs more"`,
      parameters: {
        type: 'object',
        properties: {
          type1: {
            type: 'string',
            description: 'First work order type to compare',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
          type2: {
            type: 'string',
            description: 'Second work order type to compare',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
          year: {
            type: 'string',
            description: 'Year to filter (optional)',
          },
          monthStart: {
            type: 'string',
            description: 'Start month for comparison period (optional)',
          },
          monthEnd: {
            type: 'string',
            description: 'End month for comparison period (optional)',
          },
        },
        required: ['type1', 'type2'],
      },
    },
  },

  // ============================================
  // WORKORDER COUNT TOOLS (Number / Quantity)
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_workorder_count',
      description: `Intent: count, number, how many, quantity, จำนวน, กี่ใบ, กี่งาน.
Get the NUMBER/COUNT of work orders (not cost!).
Use this tool when the user asks about:
- How many work orders
- Number of jobs/tasks
- Count of maintenance requests
- Quantity of work orders by type
Keywords: count, number, how many, quantity, จำนวน, กี่ใบ, กี่รายการ, กี่งาน
Examples: "how many work orders in 2025", "จำนวนงาน breakdown กี่ใบ", "count of preventive WOs"`,
      parameters: {
        type: 'object',
        properties: {
          year: {
            type: 'string',
            description: 'Year to filter (e.g., "2024", "2025"). Optional.',
          },
          monthStart: {
            type: 'string',
            description: 'Start month (1-12). Optional.',
          },
          monthEnd: {
            type: 'string',
            description: 'End month (1-12). Optional.',
          },
          woType: {
            type: 'string',
            description: 'Work order type filter',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_workorder_counts',
      description: `Intent: compare number, which has more work orders, count difference.
Compare the NUMBER/COUNT of work orders between two types.
Use this tool when the user asks to compare QUANTITY (not cost) between types.
Keywords: compare count, which has more jobs, more work orders
Examples: "which type has more work orders", "compare number of breakdown vs preventive"`,
      parameters: {
        type: 'object',
        properties: {
          type1: {
            type: 'string',
            description: 'First work order type to compare',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
          type2: {
            type: 'string',
            description: 'Second work order type to compare',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
          year: {
            type: 'string',
            description: 'Year to filter (optional)',
          },
          monthStart: {
            type: 'string',
            description: 'Start month (optional)',
          },
          monthEnd: {
            type: 'string',
            description: 'End month (optional)',
          },
        },
        required: ['type1', 'type2'],
      },
    },
  },

  // ============================================
  // GENERAL TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_maintenance_data',
      description: `Intent: list, show, records, details, raw data.
Get detailed maintenance cost records with optional filters.
Use when user wants to see raw cost data.`,
      parameters: {
        type: 'object',
        properties: {
          year: {
            type: 'string',
            description: 'Year to filter (optional)',
          },
          monthStart: {
            type: 'string',
            description: 'Start month (optional)',
          },
          monthEnd: {
            type: 'string',
            description: 'End month (optional)',
          },
          woType: {
            type: 'string',
            description: 'Work order type filter',
            enum: ['breakdown', 'corrective', 'preventive'],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_data_overview',
      description: `Intent: overview, summary, available data, what data, scope.
Get an overview of all available data (both costs and work order counts).
Use when user asks about data availability or scope.`,
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];

/**
 * Tool name to API endpoint mapping
 */
export const TOOL_API_MAPPING: Record<string, { endpoint: string; method: string }> = {
  // Cost tools
  get_cost_summary: {
    endpoint: '/api/maintenance/cost-summary',
    method: 'GET',
  },
  compare_cost_wo_types: {
    endpoint: '/api/maintenance/compare',
    method: 'GET',
  },
  get_maintenance_data: {
    endpoint: '/api/maintenance/data',
    method: 'GET',
  },
  
  // Work order count tools
  get_workorder_count: {
    endpoint: '/api/workorders/summary',
    method: 'GET',
  },
  compare_workorder_counts: {
    endpoint: '/api/workorders/compare',
    method: 'GET',
  },
  
  // General tools
  get_data_overview: {
    endpoint: '/api/maintenance/summary',
    method: 'GET',
  },
};

/**
 * System prompt for the AI Agent
 */
export const AGENT_SYSTEM_PROMPT = `You are a maintenance data assistant.

MOST IMPORTANT RULE:
You MUST call a tool for EVERY data question. NO EXCEPTIONS.
- First question? → CALL A TOOL
- Follow-up question? → CALL A TOOL AGAIN
- "What about 2024?" → CALL A TOOL with year=2024
- "แล้ว...หละ?" → CALL A TOOL with new parameters

You have ZERO data in memory. Previous answers in chat are NOT your data source.
The ONLY way to get correct numbers is to CALL A TOOL.

TOOL SELECTION:
- COST/MONEY/ค่าใช้จ่าย/บาท → get_cost_summary (year parameter required)
- COUNT/จำนวน/กี่ใบ → get_workorder_count (year parameter required)

RESPONSE RULES:
- LANGUAGE (CRITICAL): You may ONLY respond in Thai or English. NEVER respond in Chinese, Japanese, Korean, or any other language.
  • Thai question (ภาษาไทย) → Reply in Thai
  • English question → Reply in English
  • Mixed or unclear → Reply in English
- Currency wording must match language: English → use "THB"; Thai → use "บาท". Always format numbers with commas (e.g., 163,010 THB).
- NO markdown (no **, no ##, no bullet points with -)
- Short, natural, conversational

DATA TYPES:
- Work orders: breakdown, corrective, preventive
- Costs: manhrs, sparepart, outsource
- Years: 2024, 2025`;
