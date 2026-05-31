# AI Chat Draft Review Amount Fix Design

## Problem

When a user asks the AI chat to add an expense, for example
`Thêm chi tiêu hôm nay là 55k tiền ăn bún bò huế`, the assistant returns a
draft transaction and shows the `Xem giao dịch nháp` button. Clicking that
button opens the review form, but the amount field is empty.

The Transactions page AI parser does not have this issue because it writes the
returned draft directly into the transaction form state after the API response.

## Cause

`AiChatTransactionReviewModal` initializes its form state from the `draft` prop
only during the first component render. The widget mounts the modal while
`draft` is `null`, so the initial amount state is `""`. Later, clicking
`Xem giao dịch nháp` updates the `draft` prop, but the modal form state is not
hydrated again.

## Goal

The chat draft review form must show the same parsed draft values as the
Transactions page AI parser:

- transaction type
- amount, such as `55000` for `55k`
- category
- transaction date
- note
- merchant when present
- raw input when saving

The fix should not change the AI chat API contract or automatically save
transactions.

## Recommended Approach

Update `AiChatTransactionReviewModal` so its local form state is synchronized
whenever a new `draft` prop arrives.

Implementation shape:

- Add a `useEffect` that runs when `draft` changes.
- If `draft` is null, do nothing because the modal returns `null`.
- If `draft` exists, copy its fields into the modal state:
  - `setType(draft.type)`
  - `setAmount(String(draft.amount))`
  - `setCategoryId(draft.categoryId)`
  - `setTransactionDate(draft.transactionDate)`
  - `setNote(draft.note)`
  - `setMerchant(draft.merchant ?? "")`
- Clear stale modal errors when a new draft opens.

This keeps the modal editable after it opens while ensuring every draft button
opens with the correct initial values.

## Alternatives Considered

### Remount the modal with a React key

The widget could provide a `key` based on draft fields so React creates a fresh
modal instance for each draft. This is small, but it hides the state hydration
behavior in the parent and makes future modal changes easier to break.

### Lift all form state to the chat widget

The widget could own every review form field. This is useful if chat needs to
coordinate multiple drafts or persist edits outside the modal, but it is too
large for this bug.

## Components

### `src/features/ai-chat/transaction-review-modal.tsx`

Owns the draft review form. It should continue to manage editable form state
locally, but it must refresh that state when the selected draft changes.

### `src/features/ai-chat/widget.tsx`

Owns chat messages and the selected `reviewDraft`. It should continue to pass
the selected draft into the modal. No API or message state changes are required.

## Data Flow

1. User sends a chat message asking to add a transaction.
2. `/api/ai/chat` returns `transactionDraft` with `amount: 55000`.
3. `AiChatWidget` stores the assistant message with that draft.
4. User clicks `Xem giao dịch nháp`.
5. `AiChatWidget` sets `reviewDraft`.
6. `AiChatTransactionReviewModal` receives the draft and hydrates its local
   form state.
7. The amount input displays `55000`.
8. User reviews or edits the form and saves through the existing
   `/api/transactions` create flow.

## Error Handling

The existing save error handling stays the same. A stale error from a previous
draft should be cleared when a different draft opens so the user starts from a
clean review state.

## Testing

Add focused coverage for the modal or widget behavior:

- Render the review modal with `draft = null`.
- Rerender it with a draft containing `amount: 55000`.
- Assert the amount input displays `55000`.
- Assert other important fields, especially note and date, are populated from
  the draft.

Existing service tests already cover that chat draft generation can return
`amount: 55000`; this fix needs client-side state hydration coverage.

## Out Of Scope

- Changing the AI prompt or provider response schema.
- Changing `/api/ai/chat`.
- Changing `/api/ai/parse-transaction`.
- Automatically saving chat-created transaction drafts.
- Redesigning the modal UI.
