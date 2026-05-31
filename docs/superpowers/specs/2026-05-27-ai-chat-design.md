# AI Chat Design

## Context

MoneyMind AI already has the MVP finance loop: authenticated users can manage
transactions and categories, view monthly dashboard data, configure an
OpenAI-compatible provider, parse transactions with AI, and generate cached
monthly insights.

This feature adds a global AI chat popup. The chat helps users ask questions and
get spending suggestions for one selected month. It can also create a
reviewable transaction draft, but it must not save data without explicit user
confirmation.

Primary locale remains Vietnamese. Money amounts remain integer VND.

## Goals

- Add a floating AI chat popup available across authenticated app pages.
- Answer finance questions using only the selected month of the current user's
  data.
- Support advice and lightweight planning based on existing transactions,
  categories, and dashboard totals.
- Allow AI to return a validated transaction draft when the user asks to add a
  transaction.
- Review transaction drafts in a wider modal before saving.
- Keep chat history temporary in the browser; do not persist conversations.
- Reuse the existing OpenAI-compatible provider setting and adapter.

## Non-Goals

- Persistent chat history or chat thread management.
- A dedicated `/chat` page.
- Cross-month, 3-month, yearly, or custom-range analysis.
- Budget planner, budget alerts, OCR, recurring expenses, or export.
- Autonomous actions that create, update, or delete records without user review.
- Investment advice, guaranteed savings claims, or financial product
  recommendations.

## Chosen Approach

Use a global popup plus a separate review modal:

- The popup handles short conversational interactions from any authenticated
  page.
- The review modal handles transaction draft editing and save confirmation with
  enough room for a real form.
- Chat messages live in React state and are sent to the API on each turn.
- The server enriches each AI request with trusted monthly finance data loaded
  from the database for the authenticated user.

This approach keeps the chat visible and convenient without cramming transaction
editing into a small floating panel.

## Architecture

Add a new feature module:

- `src/features/ai-chat/schemas.ts`
  - Request and response schemas.
  - AI JSON response schema.
  - Message length and history limits.
- `src/features/ai-chat/service.ts`
  - Builds monthly chat context.
  - Calls the OpenAI-compatible adapter.
  - Parses and validates AI output.
  - Resolves transaction draft categories to real user categories.
- `src/features/ai-chat/widget.tsx`
  - Floating chat button and popup.
  - Client-side temporary message state.
  - Request lifecycle, loading state, and errors.
- `src/features/ai-chat/transaction-review-modal.tsx`
  - Editable transaction draft review form.
  - Saves through the existing transaction create endpoint.

Add an authenticated API route:

- `POST /api/ai/chat`

The route uses `getRequiredApiUser()` for authentication, validates request
payloads with Zod, and delegates business logic to `ai-chat/service.ts`.

The service reuses:

- `requireAiProviderSetting(userId)` for provider configuration.
- `createOpenAiCompatibleChat()` for chat completions.
- `getMonthlyDashboard(userId, month)` for trusted dashboard context.
- Existing transaction/category database queries for month-level details and
  draft category resolution.

No database table is added for chat history.

## Public API

### `POST /api/ai/chat`

Request:

```ts
{
  month: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}
```

Rules:

- `month` must be `YYYY-MM`.
- `messages` must include at least one user message.
- Only a bounded number of most recent messages are accepted.
- Individual message content is length-limited.
- The server ignores any client-provided finance context and loads its own.

Success response:

```ts
{
  message: {
    role: "assistant";
    content: string;
  };
  transactionDraft?: {
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

Error responses follow the existing API style:

```ts
{
  error: string;
}
```

## AI Contract

The chat service asks the model to return JSON only:

```ts
{
  answer: string;
  transactionDraft: null | {
    type: "income" | "expense";
    amount: number;
    categoryName: string;
    note: string;
    merchant?: string | null;
    transactionDate: string;
  };
}
```

The service validates this shape before sending anything to the UI. If the
provider returns invalid JSON or a structurally invalid response, the API returns
a controlled AI error.

Transaction draft rules:

- Amount must be a positive integer VND value.
- Type must be `income` or `expense`.
- Date must be `YYYY-MM-DD`.
- Category must resolve to an existing category owned by the user.
- If the model names an unknown category, use the existing fallback behavior:
  a suitable default such as `Khác` for expenses or `Thu nhập` for income.
- The API returns `categoryId` only after resolving to a real user category.
- The API never saves the draft.

Answer rules:

- Answer in Vietnamese.
- Keep responses concise and practical.
- Use only the selected month's provided data.
- If the user asks outside the selected month or beyond available data, say
  there is not enough data and suggest a narrower question.
- Do not invent transactions, balances, categories, or trends.
- Do not provide investment or guaranteed financial advice.

## Monthly Context

Each request uses the selected month only.

The server includes:

- Monthly totals: income, expense, and remaining balance.
- Category expense breakdown.
- Recent or month-level transaction summaries with date, type, amount,
  category, merchant, and note.
- Current category list for draft category selection.

The first implementation should keep context bounded. If a month has many
transactions, send a limited list plus aggregate data rather than the full
transaction history.

## UI Behavior

### Global Widget

Add `AiChatWidget` to the authenticated app layout so it appears on all app
pages.

Default state:

- A floating icon button at the bottom-right corner.
- The button opens the chat popup.

Open state:

- A compact popup anchored bottom-right on desktop.
- Near full-width bottom panel on mobile.
- Shows current temporary conversation, input, send button, loading state, and
  inline error.
- Uses toast only for notable save outcomes; chat errors should remain visible
  in the popup.

Month behavior:

- On dashboard pages, use the month currently being viewed when available.
- On other pages, default to the current calendar month.
- The selected month is visible in the popup header or compact context label.

### Transaction Draft Review

When an assistant response includes a draft, the message shows a clear action
such as `Xem giao dịch nháp`.

Clicking it opens `AiChatTransactionReviewModal`.

The modal includes editable fields for:

- Type.
- Amount.
- Category.
- Transaction date.
- Merchant.
- Note.

Saving uses the existing transaction creation API. On success:

- Close the modal.
- Add a short assistant/system-style note to the chat such as
  `Đã lưu giao dịch.`
- Leave the popup open so the user can continue asking questions.

Canceling the modal does not change data.

## Error Handling

Reuse existing AI domain error concepts where possible:

- Missing provider setting.
- Missing API key.
- Provider timeout.
- Provider HTTP error.
- Provider invalid response.

Additional chat-specific validation errors:

- Invalid month.
- Empty messages.
- Oversized messages or too many messages.
- Invalid AI chat response.

User-facing errors should be Vietnamese and actionable. The UI should not expose
raw provider payloads or API keys.

## Security And Privacy

- All finance context is loaded server-side for the authenticated user.
- Client-sent messages are treated as untrusted input.
- The route never accepts user IDs from the client.
- API keys remain server-side through existing AI provider settings.
- Chat history is not written to the database.
- The AI provider receives the selected month's financial context, so the UI
  should rely on the existing AI settings page to make this provider choice
  explicit to the user.

## Testing

Unit tests:

- Chat request schema accepts valid month/messages and rejects invalid payloads.
- AI response schema accepts answer-only responses and responses with drafts.
- AI response schema rejects invalid JSON shapes.
- Chat service returns top-category answers from mocked provider responses.
- Chat service resolves a valid transaction draft to a real category ID.
- Chat service falls back when the provider names an unknown category.
- Chat service rejects invalid provider responses with a controlled error.

Route tests:

- Unauthenticated request returns 401.
- Bad request returns 400.
- Missing AI setting returns a controlled AI error.
- Provider timeout/invalid response maps to a user-facing error.

UI tests:

- Floating button opens and closes the popup.
- Sending a message shows a loading state and appends the assistant response.
- API errors render inside the popup.
- A draft response shows the review action.
- Review modal can cancel without saving.
- Review modal saves through the transaction create API and reports success.

## Implementation Notes

- Keep the feature separate from the existing `src/features/ai/` module unless
  shared helpers are clearly reusable.
- Prefer small service functions over putting prompt construction in the route.
- Keep prompts deterministic with low temperature through the existing adapter.
- Do not modify the existing monthly insight cache model.
- Do not add persistence until there is a separate design for chat history.
