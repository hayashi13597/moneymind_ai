# AI Chat Draft Review Amount Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the AI chat draft review modal populate amount and other draft fields when the user clicks `Xem giao dịch nháp`.

**Architecture:** Keep `AiChatWidget` as the owner of the selected `reviewDraft`. Keep `AiChatTransactionReviewModal` as the owner of editable form state, but hydrate that state from `draft` whenever a new draft arrives.

**Tech Stack:** Next.js 16 App Router, React 19 Client Components, TypeScript, Jest with jsdom, existing `react-dom/client` test utilities.

---

## File Structure

- Modify: `src/features/ai-chat/transaction-review-modal.tsx`
  - Add `useEffect`.
  - Synchronize local form state from the selected `draft`.
  - Clear stale modal errors and pending state when a new draft opens.
- Create: `tests/ai-chat-review-modal.test.ts`
  - Render the modal with `draft = null`.
  - Rerender with a draft containing `amount: 55000`.
  - Assert amount, type, category, date, merchant, and note controls are populated.

No route handlers, AI service code, provider prompts, or transaction create logic should change.

## Relevant Project Docs

Before coding, read these local Next.js docs because this repo requires current Next.js docs before Next.js work:

- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - Relevant point: Client Components are the right place for state, event handlers, and lifecycle logic such as `useEffect`.
- `node_modules/next/dist/docs/01-app/02-guides/forms.md`
  - Relevant point: HTML form behavior and validation remain local to the form; this task should not change the existing submit boundary.

## Task 1: Synchronize Chat Draft Review Form State

**Files:**
- Create: `tests/ai-chat-review-modal.test.ts`
- Modify: `src/features/ai-chat/transaction-review-modal.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ai-chat-review-modal.test.ts`:

```ts
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { AiChatTransactionReviewModal } from "@/features/ai-chat/transaction-review-modal";
import type { AiChatTransactionDraft } from "@/features/ai-chat/schemas";

const categories = [
  { id: "cat_food", name: "Ăn uống", type: "expense" as const },
  { id: "cat_income", name: "Thu nhập", type: "income" as const },
];

const draft: AiChatTransactionDraft = {
  type: "expense",
  amount: 55000,
  categoryId: "cat_food",
  categoryName: "Ăn uống",
  note: "Tiền ăn bún bò huế",
  merchant: "Quán bún bò",
  rawInput: "Thêm chi tiêu hôm nay là 55k tiền ăn bún bò huế",
  transactionDate: "2026-05-27",
};

function renderModal({
  root,
  draft,
  onClose = jest.fn(),
  onSaved = jest.fn(),
}: {
  root: Root;
  draft: AiChatTransactionDraft | null;
  onClose?: () => void;
  onSaved?: () => void;
}) {
  act(() => {
    root.render(
      React.createElement(AiChatTransactionReviewModal, {
        draft,
        categories,
        onClose,
        onSaved,
      }),
    );
  });
}

describe("AiChatTransactionReviewModal", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("hydrates form fields when a draft arrives after initial null render", () => {
    renderModal({ root, draft: null });

    expect(container.textContent).toBe("");

    renderModal({ root, draft });

    const selects = Array.from(container.querySelectorAll("select"));
    const inputs = Array.from(container.querySelectorAll("input"));

    expect(selects[0]).toHaveValue("expense");
    expect(inputs[0]).toHaveValue("55000");
    expect(selects[1]).toHaveValue("cat_food");
    expect(inputs[1]).toHaveValue("2026-05-27");
    expect(inputs[2]).toHaveValue("Quán bún bò");
    expect(inputs[3]).toHaveValue("Tiền ăn bún bò huế");
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
pnpm test tests/ai-chat-review-modal.test.ts
```

Expected result before implementation:

- Jest runs `tests/ai-chat-review-modal.test.ts`.
- The test fails because `inputs[0]` has value `""` instead of `"55000"`.

- [ ] **Step 3: Implement the minimal modal state hydration**

Modify `src/features/ai-chat/transaction-review-modal.tsx`.

Change the import:

```ts
import { useEffect, useMemo, useState } from "react";
```

Add this effect after the existing state declarations:

```ts
  useEffect(() => {
    if (!draft) {
      return;
    }

    setType(draft.type);
    setAmount(String(draft.amount));
    setCategoryId(draft.categoryId);
    setTransactionDate(draft.transactionDate);
    setNote(draft.note);
    setMerchant(draft.merchant ?? "");
    setError("");
    setPending(false);
  }, [draft]);
```

Do not change `saveDraft`, API payload shape, or the widget's `reviewDraft` state.

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
pnpm test tests/ai-chat-review-modal.test.ts
```

Expected result:

- PASS `tests/ai-chat-review-modal.test.ts`
- The hydration test passes with the amount input value `55000`.

- [ ] **Step 5: Run nearby chat tests**

Run:

```bash
pnpm test tests/ai-chat-widget.test.ts tests/ai-chat-service.test.ts tests/ai-chat-schemas.test.ts
```

Expected result:

- PASS `tests/ai-chat-widget.test.ts`
- PASS `tests/ai-chat-service.test.ts`
- PASS `tests/ai-chat-schemas.test.ts`

- [ ] **Step 6: Run lint**

Run:

```bash
pnpm lint
```

Expected result:

- ESLint exits successfully with no errors.

- [ ] **Step 7: Commit the implementation**

Run:

```bash
git status --short
git add src/features/ai-chat/transaction-review-modal.tsx tests/ai-chat-review-modal.test.ts
git commit -m "fix: hydrate ai chat draft review form"
```

Expected result:

- Commit includes only the modal fix and the new focused test.

## Self-Review

- Spec coverage: The plan hydrates type, amount, category, date, note, and merchant from the chat draft. Raw input remains supplied from `draft.rawInput` in the existing save payload, so no API change is needed.
- Placeholder scan: No placeholders or open implementation notes remain.
- Type consistency: The test uses the existing `AiChatTransactionDraft` type and the implementation uses the existing `draft` prop fields.
