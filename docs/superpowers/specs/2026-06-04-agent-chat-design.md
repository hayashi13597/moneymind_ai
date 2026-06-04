# Agent Chat Design

## Context

MoneyMind AI currently has a global AI chat widget and a dashboard
AskMoneyMind panel. Both call `POST /api/ai/chat`, pass the locally stored AI
provider setting in the request body, and receive a validated assistant answer
with an optional transaction draft.

The next version should move this experience to an agent-style flow:

```text
User
  ↓
AI Chat UI
  ↓
POST /api/agent
  ↓
LLM + server-side tools
  ↓
Database / backend services
  ↓
Response to UI
```

The agent should do more than answer a fixed prompt. It should understand user
requests, choose from a small server-owned tool registry, and execute safe
finance actions against trusted backend services.

Primary locale remains Vietnamese. Money amounts remain integer VND. AI
provider settings remain browser-local and must be passed from client requests
to the server.

## Goals

- Add `POST /api/agent` as the new chat backend.
- Keep the existing OpenAI-compatible provider model working across user-chosen
  providers.
- Support core AI chat capabilities:
  - Ask questions about data in the app.
  - Suggest useful actions.
  - Explain dashboard figures and changes.
  - Filter and search transactions with natural-language requests.
- Let the agent directly create, update, and delete transactions when the
  request is clear enough.
- Ask a clarification question instead of writing data when an update or delete
  request matches zero or multiple candidate transactions.
- Reuse existing transaction, dashboard, category, AI provider, and validation
  boundaries.
- Keep chat history temporary in the browser.

## Non-Goals

- Persistent chat threads.
- A dedicated chat page.
- Category, budget, account, profile, or AI provider setting writes.
- Native provider-specific tool/function calling in this phase.
- Autonomous background jobs.
- Investment advice, guaranteed savings claims, or financial product
  recommendations.

## Chosen Approach

Use a provider-agnostic agent tool registry.

The server defines tools such as transaction search, dashboard explanation, and
transaction CRUD. The LLM selects intent and tool input by returning strict JSON.
The agent service validates that JSON with Zod and then calls the allowed
server-side tool.

This gives the code a real agent boundary without requiring every
OpenAI-compatible provider to support native `tools` or `tool_choice`. It also
keeps implementation close to the current adapter, which only sends chat
messages and receives assistant message content.

Native tool calling can be added later by changing the adapter/orchestrator
while keeping the same server-owned tool implementations.

## Architecture

Add a new feature module:

- `src/features/agent/schemas.ts`
  - Public request and response schemas for `/api/agent`.
  - LLM intent/tool-call schema.
  - Tool result schemas.
- `src/features/agent/service.ts`
  - Builds trusted context for the current user.
  - Calls the OpenAI-compatible chat adapter.
  - Parses and validates the LLM intent.
  - Dispatches to read or write tools.
  - Returns a UI-safe response.
- `src/features/agent/tools/transactions.ts`
  - Transaction candidate search.
  - Transaction create, update, and delete tool handlers.
- `src/features/agent/tools/finance.ts`
  - Dashboard context, dashboard explanation support, category listing, and
    read-only finance summaries.

Add a new authenticated route:

- `src/app/api/agent/route.ts`
  - Authenticates with `getRequiredApiUser()`.
  - Validates request body with `agentRequestSchema`.
  - Validates provider config with `assertSafeAiProviderSetting()`.
  - Calls the agent service.
  - Returns controlled AI/domain errors as JSON.

Reuse existing modules:

- `src/features/ai/openai-compatible.ts`
- `src/features/ai/provider-security.ts`
- `src/features/dashboard/service.ts`
- `src/features/transactions/service.ts`
- `src/features/transactions/schemas.ts`
- `src/lib/money.ts`

The current `src/features/ai-chat` UI can be migrated to call `/api/agent`.
`/api/ai/chat` may remain temporarily as a compatibility route during
migration, but the new flow should treat `/api/agent` as the primary backend.

## Public Request

`POST /api/agent`

```ts
{
  month: string;
  providerSetting: {
    baseUrl: string;
    model: string;
    apiKey: string;
  };
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
```

Rules:

- `month` must be `YYYY-MM`.
- `providerSetting` is required because AI settings are browser-local.
- `messages` must include at least one user message.
- The server accepts only a bounded number of recent messages.
- Message content is length-limited.
- Client-provided finance context is ignored.

## Public Response

```ts
{
  message: {
    role: "assistant";
    content: string;
  };
  resultType:
    | "answer"
    | "search_results"
    | "suggestion"
    | "dashboard_explanation"
    | "transaction_created"
    | "transaction_updated"
    | "transaction_deleted"
    | "clarification_required";
  transactions?: Array<{
    id: string;
    date: string;
    type: "income" | "expense";
    amount: number;
    categoryName: string;
    merchant: string | null;
    note: string;
  }>;
  clarification?: {
    question: string;
    candidates?: Array<{
      id: string;
      label: string;
    }>;
  };
  action?: {
    type: "create" | "update" | "delete";
    transactionId?: string;
  };
}
```

Response meanings:

- `answer`: General question answered from trusted app data.
- `search_results`: Natural-language transaction filter/search result.
- `suggestion`: Suggested next action or behavior change.
- `dashboard_explanation`: Dashboard numbers explained in natural language.
- `transaction_created`: A transaction was created.
- `transaction_updated`: One transaction was updated.
- `transaction_deleted`: One transaction was deleted.
- `clarification_required`: No data was written; the user must clarify.

## Core Chat Capabilities

### Ask Questions About App Data

The agent can answer questions about transactions, categories, totals,
remaining money, recent spending, and month-level summaries. It must use only
trusted data loaded server-side for the authenticated user.

If the app does not have enough data, the agent says that directly and suggests
a narrower question.

### Suggest Actions

The agent can suggest useful next actions such as reducing spending in a high
category, reviewing recent expenses, adding a missing transaction, or narrowing
a broad search.

Suggestions do not write data unless the user asks for a clear create, update,
or delete action.

### Explain Dashboard

The agent can explain dashboard values such as total income, total expense,
remaining amount, category breakdown, and recent month comparison.

The explanation should be short, specific, and tied to the selected month.

### Natural-Language Search

The agent can search transactions from natural-language requests, for example:

- `Tìm các giao dịch ăn uống trên 100k tháng này`
- `Chi tiêu Shopee gần đây`
- `Các khoản thu trong tháng 5`
- `Giao dịch nào có ghi chú cà phê?`

The search result should return a concise answer and a short list of matching
transactions. If too many results match, the agent should summarize and suggest
how to narrow the request.

## Tool Registry

### Read Tools

- `finance.answerContext`
  - Loads dashboard, category, recent transaction, and monthly summary context
    for answer and suggestion intents.
- `dashboard.explain`
  - Produces context for explaining selected-month dashboard numbers.
- `transactions.search`
  - Searches transactions by month, date phrase, type, category, merchant,
    amount range, and text terms.
- `categories.list`
  - Lists user-owned categories for category matching and explanations.

### Write Tools

- `transactions.create`
  - Creates one transaction through `createTransaction()`.
- `transactions.update`
  - Updates one transaction through `updateTransaction()`.
- `transactions.delete`
  - Deletes one transaction through `deleteTransaction()`.

Write tools never bypass service-level user scoping or schema validation.

## Agent Flow

1. Route authenticates the user.
2. Route validates the request body and provider setting.
3. Agent service keeps only the bounded recent chat history.
4. Agent service loads trusted base context for `userId` and `month`.
5. Agent service calls the LLM with:
   - System rules.
   - Available tool names and JSON schemas.
   - Base finance context.
   - Recent chat messages.
6. LLM returns one JSON intent/tool call.
7. Agent service extracts the JSON object and validates it.
8. Agent service dispatches to the selected read or write tool.
9. Tool result is converted to the public response shape.
10. UI renders the assistant message and any result metadata.

## Write Safety Rules

- Create runs only when the request contains enough information for a valid
  transaction or the missing value has an unambiguous default.
- Update and delete run only when candidate resolution returns exactly one
  user-owned transaction.
- If candidate resolution returns zero or more than one transaction, the agent
  returns `clarification_required` and does not write data.
- Clarification responses should include candidate labels when candidates are
  available.
- Delete confirmation text must clearly name the deleted transaction.
- Update confirmation text must describe the changed fields.
- Category resolution must use existing user-owned categories and preserve the
  current type/category validation.
- Amount parsing must use the established VND parsing behavior.
- The agent cannot create, update, or delete categories, budgets, profile data,
  or provider settings in this phase.

## Clarification Flow

When an update or delete request is ambiguous, the response looks like:

```ts
{
  message: {
    role: "assistant",
    content: "Mình tìm thấy 2 giao dịch ăn trưa hôm qua. Bạn muốn xóa giao dịch nào?"
  },
  resultType: "clarification_required",
  clarification: {
    question: "Bạn muốn xóa giao dịch nào?",
    candidates: [
      { id: "tx_1", label: "55.000 đ, Ăn uống, 2026-06-03, Cơm trưa" },
      { id: "tx_2", label: "70.000 đ, Ăn uống, 2026-06-03, Bún bò" }
    ]
  }
}
```

The user can answer by referring to one candidate. The next `/api/agent`
request includes the chat history, so the agent can resolve the clarified
choice and execute the write tool.

## UI Behavior

The existing floating chat remains the primary UI.

- General answers, suggestions, and dashboard explanations render as normal
  assistant bubbles.
- Search results render as an assistant bubble with a compact transaction list.
- Successful create/update/delete actions render as confirmation bubbles.
- Clarification responses render a question and selectable candidate buttons.
- Selecting a candidate sends a follow-up chat message rather than writing
  directly from the client.
- The old transaction draft review modal is no longer the main flow for agent
  CRUD because this design allows direct writes.

`AskMoneyMindPanel` should call `/api/agent` and render answer-style responses.
It does not need CRUD controls.

## Error Handling

- Missing auth returns unauthorized.
- Invalid request body returns bad request.
- Unsafe provider URL returns a controlled error.
- Provider HTTP failures, timeouts, and invalid provider JSON return existing
  AI error messages.
- Invalid tool input returns a controlled agent error.
- Service-level transaction errors keep the existing Vietnamese messages where
  possible:
  - `Không tìm thấy giao dịch.`
  - `Không tìm thấy danh mục.`
  - `Danh mục không khớp loại giao dịch.`
- Ambiguous update/delete intent is not an error; it returns
  `clarification_required`.

## Testing

Add schema tests for:

- Valid `/api/agent` requests.
- Invalid month, missing provider setting, empty messages, and oversized
  messages.
- Valid public response variants.
- Invalid LLM intent/tool-call payloads.

Add service tests for:

- Answering questions from app data.
- Suggesting actions without writing data.
- Explaining dashboard numbers.
- Searching transactions with natural-language filters.
- Creating a transaction directly.
- Updating one matched transaction.
- Deleting one matched transaction.
- Returning clarification when update/delete matches zero transactions.
- Returning clarification when update/delete matches multiple transactions.
- Handling provider JSON wrapped in markdown or explanatory text.
- Returning controlled errors for malformed provider output.

Add route tests for:

- Authentication.
- Bad request.
- Provider safety.
- Successful agent response.
- Controlled AI/domain errors.

Add UI tests for:

- Chat widget posts to `/api/agent`.
- AskMoneyMind panel posts to `/api/agent`.
- Search result rendering.
- CRUD confirmation rendering.
- Clarification candidate rendering and follow-up submission.

## Migration Notes

- Implement `/api/agent` alongside `/api/ai/chat` first.
- Migrate `AiChatWidget` and `AskMoneyMindPanel` to `/api/agent`.
- Keep `/api/ai/chat` temporarily if nearby tests or older UI paths still rely
  on it.
- Remove or de-emphasize the draft review modal only after the agent CRUD flow
  is covered by tests.

## Open Decisions

No open product decisions remain for this spec. The implementation plan should
choose exact file-by-file migration order and decide whether `/api/ai/chat`
becomes a thin compatibility wrapper or remains unchanged temporarily.
