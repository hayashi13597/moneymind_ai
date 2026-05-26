# Phase 5 AI Categorization And Insight Design

## Context

MoneyMind AI Phase 5 completes the MVP loop for the existing Next.js App Router
application. Phases 1-4 already provide authentication, category management,
transaction CRUD, and a monthly dashboard.

Phase 5 adds AI-assisted transaction entry and AI monthly insight generation.
The feature should make the current financial workflow faster and more useful,
without expanding into post-MVP features such as AI chat, OCR, budget alerts,
recurring expenses, or export.

Primary locale is Vietnamese. Money amounts remain integer VND.

## Goals

- Let each user configure one OpenAI-compatible AI provider.
- Add an AI adapter that can call OpenAI-compatible chat completions.
- Parse natural-language transaction input into a reviewable transaction draft.
- Generate short Vietnamese monthly spending insights from dashboard data.
- Cache monthly insights in the existing `AiInsight` table.
- Keep AI output validated and bounded before it reaches UI or database writes.
- Keep all AI routes scoped to the authenticated user.

## Non-Goals

- AI chat over personal finance data.
- Receipt OCR or image upload.
- Budget planner or budget alerts.
- Automatically saving AI-parsed transactions without user review.
- Creating new categories from AI output.
- Supporting Gemini-native or provider-specific APIs.
- Encrypting API keys at rest. This should be revisited before production use
  beyond the MVP.

## Chosen Approach

Implement the full Phase 5 scope, but keep the product surface focused:

- AI provider settings are a small authenticated settings surface.
- Transaction parsing fills the existing transaction form as a draft only.
- Monthly insights live on the existing dashboard and use cached content when
  available.
- AI integration is isolated behind one OpenAI-compatible adapter.

This completes the MVP transaction-dashboard-AI loop while avoiding the larger
scope of a personal finance chatbot or autonomous financial planner.

## Data Model

Add `AiProviderSetting`:

```prisma
model AiProviderSetting {
  id        String   @id @default(cuid())
  userId    String   @unique
  baseUrl   String
  apiKey    String
  model     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Update `User` with:

```prisma
aiProviderSetting AiProviderSetting?
```

Continue using existing `AiInsight`:

- `userId` scopes insight ownership.
- `month` stores `YYYY-MM`.
- `content` stores the final Vietnamese insight copy.
- `metadata` stores structured generation details such as source totals,
  category breakdown, and model name when useful.
- `@@unique([userId, month])` provides one cached insight per user/month.

For MVP, `apiKey` is stored in the database as provided. Settings responses must
never return the plaintext key; they only return `hasApiKey`.

## Public Interfaces

Add authenticated API routes:

- `GET /api/settings/ai`
- `PATCH /api/settings/ai`
- `POST /api/ai/parse-transaction`
- `POST /api/ai/monthly-insight`

### `GET /api/settings/ai`

Returns:

```ts
{
  setting: null | {
    baseUrl: string;
    model: string;
    hasApiKey: boolean;
  };
}
```

### `PATCH /api/settings/ai`

Accepts:

```ts
{
  baseUrl: string;
  model: string;
  apiKey?: string;
}
```

`apiKey` is optional when a setting already exists. If omitted, keep the existing
key. If no setting exists, `apiKey` is required.

### `POST /api/ai/parse-transaction`

Accepts:

```ts
{
  input: string;
}
```

Returns a reviewable draft:

```ts
{
  draft: {
    type: "income" | "expense";
    amount: number;
    categoryId: string;
    categoryName: string;
    note: string;
    merchant: string | null;
    rawInput: string;
    transactionDate: string;
  };
}
```

The endpoint loads the user's categories and only returns a category that
belongs to that user. If the AI names a category that does not match, the
service falls back to an appropriate existing category such as `Khác` for
expenses or `Thu nhập` for income.

### `POST /api/ai/monthly-insight`

Accepts:

```ts
{
  month: string;
  regenerate?: boolean;
}
```

`month` must be `YYYY-MM`. The endpoint uses the same dashboard service as the
dashboard page to build source data. If a cached insight exists and
`regenerate` is false, return it without calling the AI provider. If
`regenerate` is true, call AI again and overwrite the cached insight.

Returns:

```ts
{
  insight: {
    month: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };
}
```

## AI Adapter

Add an AI feature module with clear boundaries:

- `src/features/ai/settings-service.ts`
  - Get and upsert provider settings.
  - Mask settings for API responses.
- `src/features/ai/openai-compatible.ts`
  - Call `POST {baseUrl}/chat/completions`.
  - Use the configured `model`.
  - Send deterministic prompts with low temperature.
  - Apply request timeout.
  - Return provider text content.
- `src/features/ai/transaction-parser.ts`
  - Build parse prompt from raw input and the user's categories.
  - Parse and validate JSON output.
  - Resolve the category to a real user category.
- `src/features/ai/monthly-insight.ts`
  - Build insight prompt from dashboard DTOs.
  - Generate concise Vietnamese insight content.
  - Create or update `AiInsight`.

The adapter is intentionally provider-neutral. It should support OpenAI,
OpenRouter, DeepSeek-compatible gateways, and similar services through the same
`baseUrl`, `apiKey`, and `model` fields.

## Prompt And Validation Rules

Transaction parsing prompt:

- Input is Vietnamese natural-language spending or income text.
- Output must be JSON only.
- Amount must be integer VND.
- Type must be `income` or `expense`.
- Category must be selected from the provided category list.
- Date defaults to today when the text does not include a date.
- Note should be short and user-readable.

Monthly insight prompt:

- Output Vietnamese only.
- Keep content short enough for a dashboard panel.
- Prefer 3-5 actionable bullets or compact paragraphs.
- Use source totals and category breakdown only; do not invent transactions.
- Mention uncertainty when data is sparse.

All AI JSON output must pass Zod validation before use. Invalid output becomes a
controlled API error instead of a partial draft.

## UI Behavior

### AI Settings

Add a simple authenticated AI settings page or section reachable from the app
shell. It includes:

- `baseUrl`
- `model`
- `apiKey`
- save button
- current key state shown as configured/not configured

After saving, the key field clears and the page shows that a key is configured.

### Transaction Parsing

Enhance the existing transaction manager:

1. User enters natural text such as `hôm nay ăn trưa 55k`.
2. User clicks an AI parse action.
3. UI calls `POST /api/ai/parse-transaction`.
4. Returned draft fills the normal transaction form.
5. User reviews and edits fields.
6. User saves through the existing `POST /api/transactions` flow.

The AI parse action never writes a transaction directly. This preserves user
control and keeps existing transaction validation as the final write boundary.

### Dashboard Insight

Add an AI insight panel to the dashboard:

- If cached insight exists, show it immediately.
- If no insight exists, show a generate action.
- Show a regenerate action when an insight exists.
- Show provider/configuration errors inline.
- Do not block the rest of the dashboard if insight generation fails.

The dashboard page remains server-rendered. It loads the cached insight for the
selected month and passes it into a small client component that handles generate
and regenerate actions through `POST /api/ai/monthly-insight`. This keeps the
dashboard's first render useful while limiting client-side code to AI actions.

## Error Handling

- Unauthenticated requests return the existing unauthorized API response.
- Missing AI provider settings returns a Vietnamese configuration error.
- Missing API key returns a Vietnamese configuration error.
- Provider HTTP errors return a controlled generic AI error; raw provider
  details should not be exposed to the user.
- Timeout returns a controlled retryable AI error.
- Invalid AI JSON returns a controlled parse error.
- Invalid `month` on the dashboard page falls back through existing dashboard
  month helpers. Invalid `month` in `POST /api/ai/monthly-insight` returns a
  `400` validation error because API callers should send an explicit month.
- Insight generation for an empty month is allowed, but the prompt must make
  sparse data explicit.

## Security And Privacy

- Every query is scoped by authenticated `userId`.
- AI prompts include only the data needed for the specific request.
- Settings API never returns plaintext API keys.
- Provider errors should not leak API keys, headers, or full request payloads.
- API keys are stored plaintext for MVP simplicity. This is acceptable only for
  local/MVP development and should be upgraded before handling production user
  secrets.

## Testing

Add focused tests with mocked AI provider responses:

- AI settings:
  - create setting when key is present.
  - update setting without replacing existing key.
  - mask API key in returned DTO.
- Transaction parsing:
  - validates successful AI JSON.
  - maps category output to a category owned by the user.
  - falls back when AI category does not match.
  - rejects invalid AI JSON.
  - preserves raw input in the draft.
- Monthly insight:
  - creates insight for a month.
  - returns cached insight without provider call.
  - regenerates and overwrites when requested.
  - scopes cache by user.
  - handles empty dashboard data.
- Adapter:
  - sends OpenAI-compatible request shape.
  - handles non-2xx provider responses.
  - handles timeout or malformed provider response.

Phase 5 verification should include:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- Prisma validation or migration verification after schema changes.

## Implementation Notes

- Read relevant Next.js docs in `node_modules/next/dist/docs/` before changing
  Next.js routes or pages.
- Use Context7 for current library/API docs when implementing library-specific
  behavior.
- Keep AI services independent of React.
- Reuse existing dashboard service for monthly insight inputs.
- Reuse existing transaction schemas and create flow for final transaction
  writes.
- Do not create demo data.
- Do not add post-MVP features while implementing Phase 5.
