# MoneyMind AI App-Wide AI-First Redesign Design

## Context

MoneyMind AI already has an AI-first dashboard direction: the dashboard reads
like a financial coach, surfaces monthly health, highlights issues, and keeps
AI prompts close to the user's current month. The rest of the authenticated app
still follows a more traditional management pattern: a generic page header,
then a CRUD table, form, or configuration panel.

The goal of this redesign is to extend the dashboard's coach-first product
language across every remaining user-facing authenticated page while preserving
current business logic and data contracts.

## Product Principle

Each page should answer a user goal before showing tools.

The first experience on every page is a MoneyMind coaching point: what changed,
what matters, and what action the user should take next. Existing forms, tables,
filters, and settings remain available, but they become the secondary workbench
under the coaching layer.

## Scope

In scope:

- Redesign `/transactions`.
- Redesign `/budgets`.
- Redesign `/categories`.
- Add an AI Insights coaching page at `/insights`.
- Add a Reports & Analytics coaching page at `/reports`.
- Redesign `/settings/ai`.
- Redesign `/profile`.
- Update authenticated navigation for new user-facing pages.
- Add shared UI primitives for coach-first page composition.
- Preserve all current create, update, delete, pagination, filtering, settings,
  profile, password, and AI-provider behavior.
- Keep Vietnamese user-facing copy natural and aligned with the existing
  dashboard and chat wording.
- Keep responsive behavior across desktop, tablet, and mobile.

Out of scope:

- Changing database schema.
- Adding server-side persisted AI insight history.
- Adding new paid provider integrations.
- Changing authentication or Better Auth behavior.
- Replacing existing API routes.
- Adding export, OCR, bank sync, recurring transactions, or notification jobs.

## Shared Experience Architecture

Create a small set of reusable app-level composition primitives instead of
restyling each page independently:

- `CoachPageShell`: page wrapper with warm MoneyMind background rhythm,
  responsive spacing, and optional page actions.
- `CoachHero`: prominent page-specific AI coaching surface with eyebrow,
  title, recommendation, supporting evidence, and primary action.
- `CoachActionCard`: compact next-step card for a specific financial action.
- `CoachMetricStrip`: dense but calm metrics row for page-specific summaries.
- `WorkbenchCard`: secondary area for forms, lists, filters, and tables.
- `CoachEmptyState`: empty states that explain what MoneyMind can do once data
  exists and gives the user a direct first action.

These primitives should follow the existing dashboard design language: warm
paper-like surfaces, restrained green and terracotta accents, soft depth,
large rounded containers, clear hierarchy, and compact operational controls.

Generated `src/components/ui/*` shadcn primitives should stay generic. App
specific design composition belongs in `src/components/app-ui.tsx` or new app
composition files.

## Page Designs

### Transactions

Current problem:

The page behaves like a ledger. AI is present through the natural-language parse
button, but the page still starts from manual transaction management.

User problem solved:

The user wants to record a transaction quickly and understand whether it affects
this month's financial behavior. They need capture, review, and guidance in one
flow.

AI-first redesign:

The top of the page becomes a "Coach Capture" area. It should invite the user
to enter a natural sentence first, show the selected month context, and surface
a MoneyMind nudge based on monthly summary data: top spending category, balance,
or whether the month is trending well. The existing transaction form and AI
parse behavior remain intact, but the layout should make AI capture feel like
the primary path. The paginated transaction list remains below as the workbench.

Product rationale:

This turns transactions from bookkeeping into a daily reflection loop. The user
does not just add records; they see what today's record means for the month.

### Budgets

Current problem:

The page is operational and row-heavy. It shows limits, spending, and remaining
amounts, but it does not tell the user where to focus first.

User problem solved:

The user wants to know which category needs attention now and what adjustment
would protect the month.

AI-first redesign:

The top of the page becomes a "Plan Tuner" with a risk summary. MoneyMind ranks
categories by budget status and recommends one next adjustment, such as lowering
flexible spend, reviewing an over-limit category, or setting missing limits.
The existing monthly navigation, edit dialog, default/month-specific budget
behavior, and delete behavior remain unchanged. The category budget rows move
under the coaching and metric summary sections.

Product rationale:

Budgeting becomes a decision surface rather than a spreadsheet. The page tells
the user what to change first, then provides the controls to do it.

### Categories

Current problem:

Categories are presented as labels to manage. Their larger role in AI insight
quality is not obvious.

User problem solved:

The user wants categories that make reports and AI advice accurate without
overthinking taxonomy.

AI-first redesign:

The page becomes a "Taxonomy Coach". It should show an insight-quality summary
derived from existing category and transaction data: active categories, unused
categories, unusual category growth, top expense group, and custom category
count. MoneyMind should recommend practical maintenance actions such as review
an unusually growing group, keep fixed categories stable, or add a clearer
category for repeated uncategorized behavior. The existing create, edit, delete,
and grouped category lists remain.

Product rationale:

The page explains why category maintenance matters: better labels lead to more
specific coaching.

### AI Insights

Current problem:

Monthly AI insight exists as a dashboard panel, but there is no dedicated page
for the coaching narrative.

User problem solved:

The user wants a place to read, regenerate, and act on MoneyMind's financial
coaching without hunting through dashboard panels.

AI-first redesign:

Add an authenticated AI Insights page at `/insights` as a "Coach Journal". It should focus on
the current selected month, reuse existing monthly insight generation and
rendering components, and place the insight in a stronger narrative layout:
main observation, recommended action, supporting context, and follow-up prompt.
Until persisted history exists, the page should not imply that historical
insight notes are stored. It may link to dashboard, transactions, budgets, and
chat for follow-up.

Product rationale:

This makes AI the primary product experience for reflection, while staying
within current data capabilities.

### Reports & Analytics

Current problem:

There is no reports route. Adding a traditional reports page would duplicate
dashboard charts and weaken the AI-coach positioning.

User problem solved:

The user wants to understand longer-term patterns and choose one habit to
improve next.

AI-first redesign:

Add an authenticated Reports & Analytics page at `/reports` as a "Pattern Lab". Use existing
available dashboard, category, transaction, and budget data paths where
possible. For the first iteration, keep the page focused on explainable
patterns from existing monthly data: selected-month summary, trend cues,
category concentration, budget risk, and links to relevant workbenches. The
page should lead with an AI-style narrative and evidence cards, not chart grids.
It should avoid claiming multi-month analytics that the current services do not
load yet unless that service is implemented in the same plan.

Product rationale:

Reports become guided diagnosis instead of passive analytics. The page answers
"what pattern matters?" before showing supporting evidence.

### Settings

Current problem:

AI settings are provider CRUD. They explain local API key storage, but they do
not feel like the control center for the MoneyMind coach.

User problem solved:

The user wants to know whether the coach is ready, what the configured provider
enables, and how private the setup is.

AI-first redesign:

The page becomes "Coach Control". The top area shows AI readiness: configured
provider, selected model, API-key status, and which product surfaces depend on
the provider. The existing localStorage provider workflow remains unchanged.
Provider forms and saved provider cards remain in a workbench below. If no
provider exists, the empty state should explain that MoneyMind can still track
transactions, but AI parsing, chat, and insights need setup.

Product rationale:

Settings become a trust and readiness page, not just configuration fields.

### Profile

Current problem:

The profile page is generic account editing with little MoneyMind personality.

User problem solved:

The user wants account identity and security to feel connected to a personal
financial coach.

AI-first redesign:

The page becomes "Personalization". The top area summarizes account confidence:
display identity, email, avatar presence, and password/security status using
only currently available user/session information. Existing profile and
password forms remain intact. The copy should frame profile data as the identity
MoneyMind uses inside the app, without implying new AI memory or personalization
storage.

Product rationale:

The page feels part of the product experience while preserving familiar account
management.

## Navigation

Authenticated navigation should include:

- Tổng quan
- Giao dịch
- Ngân sách
- Danh mục
- AI Insights
- Báo cáo
- AI Coach

Profile remains accessible through the account menu. Navigation should stay
usable on mobile and preserve the current active-route behavior.

## Responsive Behavior

Desktop:

- Use asymmetric two-column layouts where the coach surface and action cards
  can sit beside the workbench.
- Keep operational tables dense but readable.

Tablet:

- Stack coach hero and workbench sections.
- Preserve horizontal scroll only for controls that already require it.

Mobile:

- Coach hero appears first.
- Workbench tables must collapse into card-like rows or retain the existing
  manageable stacked behavior.
- Buttons and form controls should have stable dimensions and no overlapping
  text.

## Loading And Empty States

Loading:

- Keep the current app-level loading behavior, but align skeletons with the new
  coach-first structure where touched.

Empty states:

- Transactions: invite natural-language first transaction entry.
- Budgets: explain that budgets become useful after categories and spending
  exist; link to transactions or categories as appropriate.
- Categories: explain that categories train MoneyMind's financial language.
- AI Insights: explain that insight generation needs provider setup and
  transaction data.
- Reports: explain that patterns emerge after multiple months of records.
- Settings: explain the difference between tracking features and AI features.
- Profile: avoid empty-state language; forms are always available for logged-in
  users.

## Testing And Verification

Automated tests should cover:

- Existing transaction pagination, filtering, creation, editing, deletion, and
  AI parse behavior remain intact.
- Existing budget update and delete behavior remain intact.
- Existing category create, edit, delete behavior remain intact.
- Existing AI provider localStorage behavior remains intact.
- Add or update focused tests for profile update and password-change rendering
  if no current tests cover those forms.
- Add route-level smoke tests for `/insights` and `/reports` using the current
  Jest and React Testing Library setup.

Manual verification should cover:

- `/transactions`
- `/budgets`
- `/categories`
- `/insights`
- `/reports`
- `/settings/ai`
- `/profile`
- Mobile viewport around 390px wide
- Desktop viewport around 1440px wide

## Implementation Notes

- Before Next.js implementation work, read the relevant current docs under
  `node_modules/next/dist/docs/`.
- Preserve server component boundaries for route-level data loading.
- Keep client components where existing forms and interactive managers already
  require client state.
- Do not move business logic into presentation components.
- Prefer deriving coaching summaries from existing props and service return
  values before adding new service calls.
- Avoid broad rewrites of API routes, schemas, or database models.
