# ChatFlow360 - Changelog

> Historial completo de versiones y cambios del proyecto.

## v0.3.16 (2026-03-03)

### Client View Toggle (f2b261a)
- **"Client View" switch** — new toggle in sidebar context section, visible only when both org AND channel are selected. When ON, hides super_admin-only nav items (Organizations, Users, Prompt Templates, API Keys). When OFF, full admin view restored.
- **Cookie persistence** — `clientViewEnabled` cookie (90 days, SameSite=Lax, Secure). Survives page reloads and navigation. Auto-resets to OFF when org or channel is deselected. Stale cookie guard: ignored if org/channel not selected on load.
- **Security** — purely cosmetic toggle. All admin pages retain server-side `isSuperAdmin` guards (`redirect("/")` + `requireSuperAdmin()`). Cookie cannot escalate privileges.
- **i18n** — `clientView` key (EN: "Client View", ES: "Vista Cliente").

### Typography Minimum Size (ef12608)
- **Hint text upgraded** — 12 `text-[10px]` hint paragraphs changed to `text-xs` (12px) across `ai-settings-client.tsx` (10), `prompt-templates-client.tsx` (1), `chat-message.tsx` (1). Micro-UI elements (model labels, badges, avatars, sidebar labels) kept at `text-[10px]`.
- **Design system rule** — `text-xs` (12px) is now the minimum readable size for any paragraph or descriptive text. Documented in `.interface-design/system.md`.

---

## v0.3.15 (2026-03-03)

### Rules UX Overhaul (378cd8d)
- **Edit/Duplicate/Delete buttons** — inline action buttons on each rule. Edit opens auto-resize textarea with confirm (✓) and Cancel. Duplicate inserts copy below and auto-enters edit mode. Delete removes the rule.
- **Responsive layout** — Desktop: icon-only buttons with Radix UI tooltips. Mobile: icons with text labels ("Edit"/"Duplicate"/"Delete") below the rule text.
- **Global Rules + Specific Rules split** — Rules section separated into two subsections. Global Rules shows badge with count (visible when expanded) and collapsible list. Specific Rules has Clear all, Browse templates, and rule CRUD.
- **Clear all rules** — button text updated from "Clear all" to "Clear all rules". Responsive positioning: inline in header on desktop, separate row above rules on mobile.
- **Edit confirm tooltip** — changed from "Save" to "Done"/"Listo" since auto-save handles persistence.
- **i18n** — 8 new keys (EN + ES): editRule, duplicateRule, deleteRule, saveRule, cancelEdit, specificRules, globalRulesCount, clearAllRules updated.

---

## v0.3.14 (2026-03-02)

### Dynamic Global Rules Injection (ab26f6d)
- **Removed client-side prepend** — global rules no longer appended to `promptStructure.rules` on save in `ai-settings-client.tsx`. Fixes duplication bug where global rules appeared both in the locked golden section AND as removable custom rules after re-save.
- **Server-side injection** — `POST /api/chat` now fetches global rules directly from `prompt_pieces` (categoryId=null, type="rule") and prepends them as a `GLOBAL RULES (mandatory):` block to the system prompt before sending to OpenAI. Rules always reach the AI regardless of when AI Settings were last saved.

### Take Control Button Styling (ab26f6d)
- **Amber distinctive color** — Take Control button changed from `variant="outline"` to `bg-amber-500 hover:bg-amber-600 text-black` for high visibility in both light and dark mode.

### Post-Chat Flow on Agent Close (ab26f6d)
- **Widget `conversation_closed` broadcast handler** — now triggers `showPostChatFlow()` (rating + transcript steps) when `postChatConfig` has features enabled, instead of immediately marking as resolved. Falls back to resolved + new conversation button if no post-chat configured.

### Customizable Welcome Texts (7b75b55)
- **Welcome Title + Subtitle** — new bilingual fields (EN/ES) in Settings > Widget > Texts. Controls the "Chat with us" and "Send us a message to get started" texts on the widget welcome screen.
- **Schema** — `WidgetAppearance` interface + Zod schema + defaults expanded with `welcomeTitleEn/Es`, `welcomeSubtitleEn/Es`.
- **Widget** — `applyAppearance()` stores welcome texts in state and updates DOM if visible. `showWelcome()` uses config values with fallback to built-in i18n defaults.
- **i18n** — 8 new keys (EN + ES) for welcome text form fields.

### Widget Fixes (ab26f6d, 7b75b55)
- **Connecting banner z-index** — added `position:relative;z-index:2` to `.cf360-connecting` so it's not clipped behind messages area overlay.
- **Contenteditable placeholder** — `ceField()` now clears residual `<br>` tags when field is emptied, ensuring CSS `:empty::before` placeholder renders correctly.

---

## v0.3.13 (2026-03-02)

### Satisfaction Rating Widget (a4e0e09)
- **Conversation rating display** — Star icon + numeric rating shown in conversation cards (grid), conversation detail panel (5-star visual + number), and a new dashboard widget.
- **`SatisfactionRating` dashboard widget** — shows average score with 5 filled/empty stars, total ratings count (ICU plural), and per-star distribution with percentage bars.
- **Rating distribution query** — raw SQL in `fetchDashboardData()` groups by rating, calculates average. Responds to the dashboard date range filter.
- **`DashboardData.ratingDistribution`** — new interface field: `{ average, total, counts: Record<number, number> }`.
- **i18n** — `satisfactionRating`, `noRatingsYet`, `totalRatings` (EN + ES).

### Enhanced Recent Conversations (943c160, b88efbc)
- **Enriched layout** — each row now shows: visitor name (from contactInfo), status badge, relative time, last message preview, handler icon (AI/Human), message count, and star rating.
- **Clickable navigation** — clicking a recent conversation navigates to `/conversations?open={id}` and auto-opens the detail panel via `useSearchParams`.
- **10 items + zebra stripes** — increased from 5 to 10 recent conversations; alternating row background (`bg-muted/40`) for quick visual scanning.

### Take Control Button (943c160)
- **`takeoverConversation()` server action** — auth check, UUID validation, org membership check, updates `responderMode` from "ai" to "human". Broadcasts `takeover` event to widget.
- **Conversation detail UI** — AI handling footer changed from centered text to `justify-between` layout with "AI is handling..." text on left and "Take Control" button on right. Button shows UserCheck icon.
- **i18n** — `takeControl` / `Tomar Control` (EN + ES).

### Realtime Broadcast for Widget (9e6e689)
- **`broadcastToConversation()` utility** — new `lib/realtime/broadcast.ts`. Sends events to the widget via Supabase Realtime REST API (`POST /realtime/v1/api/broadcast`). Uses the same HMAC-derived channel the widget already subscribes to for typing indicators. Non-blocking, failures logged but don't break actions.
- **Server actions broadcast** — `takeoverConversation()` emits `takeover`, `sendAgentMessage()` emits `new_message` (with full message payload for instant rendering), `closeConversation()` emits `conversation_closed`.
- **Widget event handlers** — `chatflow360.js` now handles 3 new broadcast events in `ws.onmessage`: `takeover` (starts polling + shows connecting banner), `new_message` (appends message instantly + badge if widget closed), `conversation_closed` (marks resolved + shows new conversation button).
- **Bug fix** — previously, Take Control from dashboard left the widget unable to receive agent messages or detect conversation close, because polling only started on keyword-triggered handoff.

---

## v0.3.12 (2026-03-02)

### Modular Prompt Templates by Business Category (9bd5f03)
- **`BusinessCategory` model** — new table `business_categories` (name, slug, sortOrder). Organizations now have an optional FK to a category.
- **`PromptPiece` model** — new table `prompt_pieces` (categoryId, type, name, content, sortOrder). Types: `role`, `rule`, `personality`. Pieces are organized by category and type.
- **Prompt Templates page redesigned** — replaced card grid with two-panel layout: left sidebar lists categories with piece counts, right panel shows pieces grouped by type (Agent Roles, Rules, Personalities) with inline CRUD.
- **Server actions** — `createBusinessCategory`, `updateBusinessCategory`, `deleteBusinessCategory`, `createPromptPiece`, `updatePromptPiece`, `deletePromptPiece` (all super_admin only).

### Global Mandatory Rules (ea6413f)
- **Schema change** — `PromptPiece.categoryId` now nullable (`String?`). Global rules = pieces with `categoryId: null`.
- **Migration** — `20260302_global_mandatory_rules`: `ALTER TABLE "prompt_pieces" ALTER COLUMN "category_id" DROP NOT NULL`.
- **Prompt Templates (Super Admin)** — new "Global Rules" tab alongside "By Category". CRUD for global rules with name + content. Empty state with Globe icon.
- **AI Settings (Org Admin)** — global rules render above custom rules with Shield icon (amber), locked (no remove button). Hint: "These rules are set by the platform administrator".
- **System prompt integration** — on save, global rules are prepended to `promptStructure.rules` so `composeSystemPrompt()` includes them.
- **Server actions** — `createGlobalRule`, `updateGlobalRule`, `deleteGlobalRule` (super_admin only).
- **i18n** — 14 new keys (EN + ES) for global rules UI.

### Template Picker — Sheet Drawer (bd768e9)
- **Replaced Popover with Sheet** — the "Browse templates" control in AI Settings now opens a right-side Sheet panel instead of a Popover. Provides full-height browsing area with content preview for each piece.
- **Category-filtered view** — Sheet shows pieces from the org's assigned `BusinessCategory`. Pieces grouped by type (Agent Roles, Rules, Personalities).
- **Apply behavior by type** — for `role` and `personality` pieces: Apply replaces the field and closes the drawer. For `rule` pieces: individual Apply appends the rule and keeps the drawer open; "Added" badge appears on already-applied rules.

### Multi-Select Rules + Clear All (2d954a3, 3396bae)
- **Checkboxes on rule pieces** — rule templates in the Sheet drawer show a checkbox for multi-selection.
- **Sticky "Apply N rules" footer** — appears in the drawer when one or more rules are checked. Clicking it appends all selected rules and closes the drawer (3396bae).
- **"Added" indicator** — rules already present in the current prompt structure show an "Added" badge; checking them is blocked to prevent duplicates.
- **Clear All custom rules** — destructive button next to "Browse templates", visible only when the org has at least one custom rule. Triggers a `ConfirmDialog` warning that global rules remain but all custom rules will be removed. Clears `promptStructure.rules` (excluding global rules) on confirm.

---

## v0.3.11 (2026-03-01)

### Lead Capture System
- **Prisma `Lead` model** — new table `leads` with fields: name, email, phone (optional), IP, pageUrl, createdAt. FK cascade to Organization and Channel. Index on `(organizationId, createdAt DESC)`.
- **AI name extraction** — system prompt instructs AI to append hidden tag `<!--cf360:name=VISITOR_NAME-->` when it identifies the visitor's name. Backend strips tag from visible content and saves to `conversation.contactInfo`.
- **Fallback regex extraction** — when AI doesn't include the tag (common with gpt-4o-mini), regex patterns detect names from greeting patterns: "Encantado de conocerlo, X", "Nice to meet you, X", "Hola, X", etc.
- **Widget phone field** — new optional phone input in transcript form with `+1` default prefix. Name + email required, phone optional.
- **Widget name pre-fill** — `contactName` extracted by AI is used to pre-fill the "Your name" field in the transcript form. Smart focus: if name pre-filled → focus email; if both filled → focus phone.
- **localStorage persistence** — `cf360_visitor_info` key stores name/email/phone for returning visitors. Pre-fills transcript form on subsequent visits.
- **Lead creation** — `POST /api/widget/transcript` now creates a Lead record with name, email, phone, IP (from `x-forwarded-for`/`x-real-ip`), and pageUrl (from conversation metadata). Each form submission = 1 new lead.
- **Dashboard Leads page** — new `/leads` route with sidebar item (ContactRound icon). Desktop: data table with Name, Email, Phone, Captured, IP Address, Page columns. Mobile: card layout. Delete with ConfirmDialog.
- **i18n** — 14 new keys each (EN + ES) for leads page, sidebar item, phone field, and extraction-related strings.

### Fixes
- **Organization cascade delete** — removed `orgHasMembers` guard that silently blocked org deletion. `OrganizationMember` already has `onDelete: Cascade` in schema, so deleting an org correctly cascades to members, channels, conversations, leads, etc. Users remain in the system (only memberships are deleted).

---

## v0.3.10 (2026-03-01)

### Logo Upload — Supabase Storage + Crop Modal
- **`react-easy-crop`** library added — crop modal with fixed 10:3 aspect ratio (400x120 output, 2x retina), zoom slider, touch-friendly (pinch-to-zoom on mobile)
- **`POST /api/upload/logo`** — authenticated endpoint, validates org membership, max 2MB, only PNG/JPEG/WebP, uploads to Supabase Storage bucket `logos`, returns public HTTPS URL
- **Supabase Storage** bucket `logos` — public, file size limit 4MB, MIME restricted to image/png, image/jpeg, image/webp
- **Removed** base64 data URL approach and external URL input — logos are now upload-only via Supabase Storage
- **Zod schema** updated — `logoUrl` now only accepts empty string or `*.supabase.co` HTTPS URLs (max 500 chars)
- **CSP** updated — `img-src` now includes `https://*.supabase.co` for Supabase Storage images
- **i18n** — new keys: `cropTitle`, `cropHint`, `cropCancel`, `cropAccept`, `changeLogo`, `logoUploading` (EN + ES)

### Post-Chat Widget Design — Gradient Wave
- **All post-chat steps** (rating, thanks, transcript form, success) redesigned with:
  - Gradient hero band matching widget header colors (`#1c2e47 → primaryColor`)
  - Org logo displayed centered in the gradient (from `postChatConfig.logoUrl`)
  - SVG wave separator for smooth transition to white content area
  - Staggered `fadeUp` animation on content elements (0.35s ease-out with delays)
- **Appearance override** — `applyAppearance()` now also updates `.cf360-postchat-hero` gradient when custom header color is set
- **`buildPostChatLayout()`** — new shared helper function used by all 4 post-chat steps for consistent layout

### Fixes
- **Email preview subject** — dark mode text unreadable (white on white). Fixed by using fixed gray colors (`gray-50`/`gray-600`/`gray-800`) instead of semantic tokens for the email subject bar
- **Resend lazy init** — `new Resend()` was executing at module scope during build (without env vars), causing build failure. Changed to `getResend()` factory function called at request time

---

## v0.3.9 (2026-03-01)

### Security Hardening (commit c7ecb58)

#### Widget API — Transcript Anti-Spam (CRIT-02)
- **1 transcript per conversation** — `POST /api/widget/transcript` now checks `conversation.metadata.transcriptSent` before sending. Returns 409 `{ error: "Transcript already sent" }` if flag is set. Flag is written atomically after successful Resend delivery.

#### Tenant Isolation — Admin Server Actions (HIGH-01)
- **`getConversationMessages`** — added `organizationId` filter so an org admin cannot fetch messages from another org's conversation even if they supply a valid `conversationId`
- **`closeConversation`** — same `organizationId` guard; unauthorized close attempt returns `notAllowed` error
- **`sendAgentMessage`** — same `organizationId` guard; agent cannot inject messages into a foreign conversation

#### Email From Header Sanitization (HIGH-03)
- **`orgName` sanitized** before interpolation into the Resend `from` field: strips ASCII control characters (0x00-0x1F, 0x7F), removes angle brackets (`<` `>`), truncates to 50 characters. Prevents header injection attacks via malicious org names.

#### Logo URL Validation (MED-02)
- **`logoUrl` Zod schema** now rejects arbitrary URLs. Accepts only: empty string, HTTPS URLs (`https://…`), or data URIs (`data:image/…`). HTTP URLs and blob/file schemes are rejected with a validation error.

#### Body Size Check — Actual Read (MED-03)
- **All 4 POST/PATCH widget routes** now read the request body via `request.text()` before parsing, checking actual byte length instead of trusting the `Content-Length` header (which can be spoofed). Applies to: `POST /api/chat`, `PATCH /api/chat/[id]`, `POST /api/widget/rating`, `POST /api/widget/transcript`.

#### Widget CSS Color Sanitization (MED-04)
- **`safeHex()` function** added to `chatflow360.js` — re-validates all color values fetched from `/api/widget/config` before interpolating into inline CSS styles. Accepts only `#RGB` and `#RRGGBB` formats. Falls back to a safe default if the value does not match the allowlist pattern. Prevents CSS injection via a compromised or man-in-the-middled config response.

#### Conversation Messages Pagination Limit (MED-06)
- **`getConversationMessages`** now caps results at **200 messages per request** via `take: 200` in the Prisma query. Prevents memory exhaustion on extremely long conversations.

#### HTML Email — Single Quote Escaping (LOW-04)
- **`escapeHtml()`** in `lib/email/transcript.ts` now escapes single quotes (`'` → `&#39;`). Closes a minor XSS vector in HTML attribute values within the email renderer.

#### Logo Upload — Functional (UX)
- **Base64 data URL flow** implemented — file picker opens on logo click, reads file as base64 data URI, stores in `PostChatSettings.logoUrl`, renders in email preview and sent emails. Max file size: 100KB (enforced client-side before encoding).

#### Mock Data Cleanup
- **`lib/mock/data.ts` deleted** — unused mock data file removed from the codebase. Dashboard uses server-fetched data exclusively.

---

### Post-Chat Backend (End-to-End)

#### Rating Endpoint
- **`POST /api/widget/rating`** — receives `{ conversationId, visitorId, rating: 1-5 }`, validates with Zod, verifies conversation ownership, saves to `conversations.rating` column
- **`rating SmallInt?`** column added to `Conversation` model in Prisma schema (migrated via raw SQL)

#### Transcript Email Endpoint
- **`POST /api/widget/transcript`** — receives `{ conversationId, visitorId, email, name, lang }`, fetches conversation messages + channel config + org name, renders branded HTML email, sends via Resend
- **Resend integration** — transactional email service (`resend` npm package), domain verified (`chatflow360.com`), emails sent from `{orgName} <noreply@chatflow360.com>`
- **`lib/email/transcript.ts`** — HTML email renderer using `PostChatSettings` template variables (`{{visitor_name}}`, `{{org_name}}`, `{{date}}`), branded header with logo or org name, message bubbles with sender labels and timestamps, responsive table-based layout, bilingual (EN/ES)

#### Widget Config Endpoint Update
- **`GET /api/widget/config`** — now returns `postChat` settings alongside `appearance` (only `enableRating` and `enableTranscript` exposed — no email template details)

#### Widget JS Multi-Step Post-Chat Flow
- **End conversation confirmation** — "Are you sure?" overlay with Yes/No buttons
- **Rating step** — 1-5 star rating UI with hover/click highlighting, Skip button, submits to `/api/widget/rating`
- **Transcript step** — name + email form, submits to `/api/widget/transcript`, success/error states
- **14 new bilingual translation keys** (EN + ES) for the entire post-chat flow
- **CSS styles** for post-chat overlay, rating stars, transcript form — all inline within the widget

#### Zod Validation Schemas
- **`ratingSchema`** — conversationId (uuid), visitorId (uuid), rating (int 1-5)
- **`transcriptSchema`** — conversationId (uuid), visitorId (uuid), email (max 254), name (max 100), lang (en|es, default en)

#### Production Verification
- Full end-to-end test on leon33.com: message → end conversation → 5-star rating → transcript email → email delivered to inbox (not spam)
- Email arrives from `Hispanic Market Advisors <noreply@chatflow360.com>`, signed by chatflow360.com, TLS encrypted

---

## v0.3.8 (2026-02-27)

### Post-Chat Experience (Frontend)

#### Post-Chat Settings Tab — 4th Tab in AI Settings

- **New "Post-Chat" tab** added as the 4th tab in AI Settings (alongside Instructions, Knowledge Base, Widget)
- **Toggle: Enable transcript email** — default ON, allows visitors to receive a transcript of the conversation via email after chat ends
- **Toggle: Enable rating prompt** — default ON, presents a satisfaction rating prompt to visitors before email collection
- **Email CC field** — organization-level CC address for receiving copies of all transcript emails

#### Logo Upload

- **Logo upload** for branding on transcript emails — stored in Supabase Storage
- **Dimension guidance** included in the upload UI to help users select appropriately sized logos

#### Email Template Customization

- **Bilingual email fields** (EN + ES): subject line, greeting text, closing text, header color, footer text
- **All fields editable** per organization — allows full branding control over post-chat emails
- **Live email preview component** — 60/40 split layout matching the Widget tab pattern (form left, preview right)
- Desktop: sticky preview panel alongside form. Mobile: FAB + Vaul drawer for preview access

#### Types, Validation & Server Action

- **`lib/widget/post-chat.ts`** — types, Zod schema (`PostChatSettings`), and default values for all post-chat configuration fields
- **`upsertPostChatSettings`** server action — validates input with Zod, persists to `Channel.config` JSONB under `postChatSettings` key
- Settings stored alongside `widgetAppearance` in the same `Channel.config` JSONB column — no schema migration needed

#### i18n

- **~50 new translation keys** (EN + ES): post-chat tab labels, toggle descriptions, email template field labels/placeholders, preview labels, upload guidance

#### Pending Backend (Completed in v0.3.9)

- ~~Resend integration for sending transcript emails~~ ✅
- ~~`POST /api/widget/transcript` endpoint~~ ✅
- ~~`POST /api/widget/rating` endpoint~~ ✅
- ~~Widget JS flow: rating prompt → email collection → transcript send~~ ✅

### User Management Improvements

- **Super Admin toggle** in user create/edit form — mutually exclusive with organization assignment (super admins are platform-level, not org-bound)
- **Removed cosmetic "Agent" role** — was stored in `OrganizationMember.role` but never enforced via RBAC. Only 2 functional user types remain: Super Admin (platform-level) and Org Admin (organization-level)
- **Super admins can create other super admins** from the dashboard UI
- **Self-edit/delete protection** — users cannot edit or delete their own account from the Users page
- **Edit other super admins** — previously blocked; now allowed (except self)
- **Role dropdown** — appears when an organization is selected, pre-selects "Admin" (future-ready for additional roles)

### Database Connection Pool Fix

- **PrismaPg pool limit** — set `max: 2` connections per serverless instance to prevent PgBouncer saturation (`MaxClientsInSessionMode` error)
- **Supabase PgBouncer Transaction mode** — switched `DATABASE_URL` from port 5432 (Session mode) to port 6543 (Transaction mode) with `?pgbouncer=true` — correct mode for serverless environments

---

## v0.3.7 (2026-02-27)

### Widget Appearance Customization

#### Widget Appearance Form

- **Color customization** — configurable colors for: header background, chat bubble, visitor message bubbles, AI message bubbles, send button
- **Bilingual header texts** (EN + ES) — custom header title and subtitle for each language
- **Form layout** — left column (60%) with all appearance controls

#### Live Widget Preview

- **React replica widget preview** — right column (40%) with sticky positioning on desktop, showing real-time appearance changes as the user edits the form
- **60/40 split layout** matching the established pattern from AI Settings page
- **Mobile: FAB + Vaul drawer** — floating action button triggers a bottom sheet drawer containing the preview (avoids consuming screen space on narrow viewports)

#### Embed Code Card

- **Script tag generator** — displays the embed snippet with the channel's public key
- **EN/ES toggle** — switch between `data-lang="en"` and `data-lang="es"` in the generated snippet
- **Clipboard copy** — one-click copy to clipboard for the embed code

#### API Endpoint

- **`GET /api/widget/config?key=PUBLIC_KEY`** — public endpoint that returns the resolved widget appearance configuration for a given channel
- Widget JS fetches this config at initialization and applies appearance settings dynamically (colors, header texts)

#### Storage & Validation

- **`Channel.config` JSONB** — widget appearance settings stored as a `widgetAppearance` nested object within the existing `config` column; no schema migration needed
- **`upsertWidgetAppearance`** server action — validates input with Zod schema, persists to `Channel.config`

#### i18n

- **~60 new translation keys** (EN + ES): color labels, header text fields, preview labels, embed code instructions, copy confirmation

---

## v0.3.5 (2026-02-24)

### Structured Prompt Fields + Template System for Agent Instructions

#### Agent Instructions: Structured Fields (replaces single systemPrompt textarea)

- **`lib/chat/prompt-builder.ts`** — new module with:
  - `PromptStructure` interface: `agentName` (100 chars), `role` (1000 chars), `rules` (array, max 50 items, 500 chars each), `personality` (1000 chars), `additionalInstructions` (2000 chars)
  - `composeSystemPrompt(structure)` — assembles the final string in canonical order: Name → Role → Rules → Personality → Additional Instructions
  - `isStructureEmpty(structure)` — returns true if all fields are blank/empty (used to detect legacy orgs)
  - `EMPTY_PROMPT_STRUCTURE` — typed constant for initializing new form state
- **Composition order** is fixed and intentional: agent identity first, behavioral rules second, tone/personality third, free-form overrides last
- **`promptStructure` JSONB field** added to `AiSettings` Prisma model — stores the structured JSON for UI editing
- **`systemPrompt` is now derived** — composed via `composeSystemPrompt()` from `promptStructure` before saving; stored string remains as the value passed to OpenAI
- **Both formats stored:** JSON for round-trip UI editing, composed string for the chat pipeline — zero changes to `lib/chat/ai.ts`
- **Rules limit increased from 20 to 50** — personality field guidance improved with better placeholders and descriptive hints

#### Template System (super_admin only)

- **New Prisma model `PromptTemplate`** — fields: `name` (unique), `description`, `structure` (JSON)
- **3 new server actions** in `lib/admin/actions.ts`: `createPromptTemplate`, `updatePromptTemplate`, `deletePromptTemplate` — all guarded by `requireSuperAdmin()` + Zod validation
- **Dedicated `/prompt-templates` page** — Template CRUD lives on its own standalone page (`app/[locale]/(dashboard)/prompt-templates/`), not in AI Settings. New `prompt-templates-client.tsx` renders a card grid layout with create/edit/delete actions.
- **New sidebar item "Prompt Templates"** — added to the admin section of the sidebar, positioned before "API Keys"
- **"Use Template" selector** in the Agent Instructions form (AI Settings) is read-only: opens a dialog listing available templates for both org admins and super admins. Selecting a template auto-populates all structured fields (agentName, role, rules, personality, additionalInstructions) without saving — user reviews and confirms before saving.
- **Dual `revalidatePath`** in template server actions: both `/settings/ai` and `/prompt-templates` are revalidated on create/update/delete to keep both pages in sync
- **New i18n namespace `promptTemplates`** (EN + ES) — covers CRUD labels, dialog titles, card grid, empty state, and confirmation messages

#### Additional Instructions — Collapsible Textarea

- Located below the Personality field, starts collapsed with toggle label "Add additional instructions" / "Agregar instrucciones adicionales"
- Expands on click; an X button collapses it (X only available when the field is empty)
- Auto-expands on load if the field has content or if a legacy migration is detected
- 2000 character limit — intended for business-specific overrides or edge case instructions that do not fit the structured fields
- Composed at the end of the system prompt under an `"ADDITIONAL INSTRUCTIONS:"` heading

#### Legacy Migration — Amber Banner

- **Detection:** if an org has a non-empty `systemPrompt` but `promptStructure` is null or empty, the UI shows an amber warning banner
- **Auto-migration:** the existing `systemPrompt` content is pre-populated into the `additionalInstructions` field so no content is lost
- **Resolution:** user fills in structured fields and saves — `composeSystemPrompt()` replaces the old string, `promptStructure` is set, banner disappears
- Existing orgs are unaffected until they open and save the AI Settings form

#### i18n — "System Prompt" renamed to "Agent Instructions"

- UI label renamed across all surfaces: "System Prompt" → "Agent Instructions" / "Instrucciones del Agente"
- **~40+ new translation keys** added across two new namespaces (EN + ES):
  - `agentInstructions.*` — field labels, placeholders, character count hints, section headings, legacy migration banner, rules list add/remove, template dialog
  - `templates.*` — CRUD labels, dialog titles, empty state, confirmation messages
- All existing `settings.systemPrompt.*` keys preserved for backward compatibility

#### Backward Compatibility

- `promptStructure` is nullable — existing orgs with only `systemPrompt` continue to work without changes
- Chat pipeline (`lib/chat/ai.ts`, `lib/chat/config.ts`) is unchanged — it reads `systemPrompt` string as before
- Composed string output format is identical to a manually written system prompt

---

## v0.3.6 (2026-02-26)

### Knowledge Categories + RLS on prompt_templates + UX Polish

#### RLS on prompt_templates Table

- **Migration `supabase/migrations/20260226_rls_prompt_templates.sql`** — enables Row Level Security on the `prompt_templates` table as a defense-in-depth measure
- **Prisma bypasses RLS** — dashboard operations are unaffected because Prisma connects as the postgres superuser via the connection pooler, which has RLS bypass
- **Policies applied:**
  - `service_role_full_access` — `FOR ALL TO service_role USING (true)` — allows Supabase admin operations
  - `super_admin_select` — `FOR SELECT TO authenticated` using a subquery on `users.is_super_admin = true` — guards direct PostgREST/anon reads
  - No INSERT/UPDATE/DELETE policies for the `authenticated` role — all mutations must go through Prisma server actions with `requireSuperAdmin()` guard
- **Design decision:** mutations from PostgREST are intentionally blocked. If direct Supabase client mutations are ever needed, explicit policies must be added at that time

#### Knowledge Categories — Structured DB Schema

- **Migration `supabase/migrations/20260226_add_knowledge_categories.sql`** adds two columns to `organization_knowledge`:
  - `category` — `VARCHAR(50) NOT NULL DEFAULT 'free_text'` — classifies the knowledge entry type (`free_text`, `business_hours`, `pricing`, `faq`, etc.)
  - `structured_data` — `JSONB` — stores the parsed form data for structured categories; `NULL` for `free_text` entries
- **Indexes:**
  - `idx_org_knowledge_category` — composite index on `(organization_id, category)` for fast filtered queries
  - `idx_org_knowledge_unique_category` — partial unique index on `(organization_id, category) WHERE category != 'free_text'` — enforces one entry per structured category per org (e.g., only one `business_hours` record per org), while allowing unlimited `free_text` entries
- **Backward compatible** — existing rows receive `'free_text'` default and `NULL` structured_data with no data loss

#### Business Hours Form — Structured Knowledge Input

- **New component `components/knowledge/business-hours-form.tsx`** — purpose-built form for the `business_hours` knowledge category
- **Weekly schedule grid** — 7 `DayRow` sub-components, each with:
  - Toggle switch for open/closed status
  - Short day labels on mobile (`Mon`, `Tue`, etc.) via `sm:hidden` / `hidden sm:inline` — avoids overflow on narrow viewports
  - Paired `<input type="time">` fields for open and close time (hidden when day is closed)
- **Smart "Copy Monday to Tue–Fri" button** — appears only when Monday is open AND at least one weekday (Tue–Fri) differs from Monday's hours. Uses `useMemo` to avoid stale comparisons. Button styled `border-cta/30 text-cta hover:bg-cta/10` — teal accent, outline variant
- **Timezone selector** — shadcn Select with 4 US zones (ET, CT, MT, PT); defaults to Eastern
- **Holidays section** — collapsible (starts open when holidays exist):
  - Add individual entries or use quick-add preset badges (US federal holidays, bilingual EN/ES names via `US_HOLIDAY_PRESETS`)
  - `HolidayRow` sub-component: name text input + month/day Select dropdowns (avoids native date picker inconsistencies across browsers) + open/closed toggle with optional time inputs
  - Preset badge list filters out already-added holidays using `useMemo`
- **Additional notes** — `<Textarea>` (max 500 chars) with right-aligned character counter; used by the AI to add context beyond the schedule grid
- **Data model:** `BusinessHoursData` interface (defined in `lib/knowledge/business-hours.ts`) with `schedule` (record keyed by `DayOfWeek`), `timezone`, `holidays: HolidayEntry[]`, `notes?`
- **i18n** — all labels, placeholders, and day names passed via `t()` prop; day short labels use `{day}Short` key convention

#### AI Settings — Scroll to Top on Save

- **`ai-settings-client.tsx`** — `scrollToTop()` helper calls `document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })` targeting the scrollable `<main>` container (not `window`, which does not scroll in the dashboard layout)
- Called in three branches of the save effect: success, validation error, and server error — ensuring the feedback banner at the top of the page is always visible after a save attempt

#### Tabs Component — Prominent Active State

- **`components/ui/tabs.tsx`** `TabsTrigger` enhanced with a more visible active state for both orientations:
  - `data-[state=active]:bg-card` — active tab lifts to card background (light and dark)
  - `data-[state=active]:font-semibold` — semibold weight distinguishes active from inactive
  - `data-[state=active]:border-cta/40` — teal CTA border on active tab; `dark:data-[state=active]:border-cta/50` for dark mode
  - `data-[state=active]:shadow-sm` / `dark:data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.3)]` — subtle elevation
  - **Bottom indicator bar** — teal `::after` pseudo-element (`after:bg-cta after:h-0.5 after:rounded-full`) at the bottom of the trigger for horizontal tabs; right-edge bar for vertical tabs. `after:opacity-0` by default, `data-[state=active]:after:opacity-100` when active — pure CSS, no JS
- Works in both horizontal (`data-orientation=horizontal`) and vertical (`data-orientation=vertical`) orientations via `group-data-[orientation=…]/tabs:after:*` selectors

---

## v0.3.5.1 (2026-02-25)

### Prompt Templates Page — UI Polish + App-wide ConfirmDialog

#### Prompt Template Cards — Visual Refinements

- **Badge styling:** emerald green badges (`bg-emerald-500/10 text-emerald-500 border-emerald-500/20`) for rules count and personality text
- **Personality badge truncation:** inner `<span className="block flex-1 overflow-hidden text-ellipsis">` to keep both badges on a single line — `shrink!` (Tailwind v4 important modifier) + `min-w-0` overrides Badge base `whitespace-nowrap shrink-0`
- **Card hover signature:** `transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-cta/30` matching Conversation Cards
- **Agent icon:** Bot icon in `h-5 w-5 rounded bg-cta/10` container with `text-cta` — replaces plain text
- **Action buttons always visible:** removed all opacity/hover-show logic — edit, duplicate, delete buttons visible at all times (mobile and desktop). Buttons styled `h-7 w-7 hover:bg-muted/50`
- **Dark mode inputs:** `dark:border-muted-foreground/20 dark:bg-muted/30` on all dialog form inputs
- **Empty state:** `LayoutTemplate` icon in `text-cta/40`
- **CardHeader spacing:** `pb-2` for consistent rhythm
- **Responsive layout:** `flex-wrap gap-2` on header, `overflow-hidden` on cards, grid `sm:grid-cols-2 lg:grid-cols-3`

#### Duplicate Template Button

- **New action button** with Copy icon — opens create dialog pre-filled with existing template data and "(Copy)" name suffix
- Tooltip: "Duplicate" / "Duplicar"

#### Tooltips — App-wide Infrastructure (shadcn/ui)

- **Installed `components/ui/tooltip.tsx`** — shadcn/ui Tooltip wrapper (Radix UI)
- **`TooltipProvider`** added to `components/layout/dashboard-shell.tsx` — wraps the entire app for consistent tooltip behavior
- **Usage pattern:** `<Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent side="bottom">label</TooltipContent></Tooltip>`
- Applied to all 3 action buttons (edit, duplicate, delete) on prompt template cards
- **i18n keys:** `promptTemplates.editTooltip`, `promptTemplates.duplicateTooltip`, `promptTemplates.deleteTooltip` (EN + ES)

#### ConfirmDialog — App-wide Replacement for native confirm()

- **RULE ESTABLISHED:** native `window.confirm()` must NEVER be used anywhere in the app — all confirmations use custom ConfirmDialog
- **Installed `components/ui/alert-dialog.tsx`** — shadcn/ui AlertDialog (Radix UI)
- **Created `components/ui/confirm-dialog.tsx`** — reusable wrapper with props: `open`, `onConfirm`, `onCancel`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` ("destructive" | "default"), `loading`
- **Replaced ALL 4 native confirm() calls across the entire app:**
  - `prompt-templates-client.tsx` — delete template confirmation
  - `organizations-client.tsx` — delete organization + delete channel confirmations (2 confirm() calls)
  - `users-client.tsx` — delete user confirmation
- **State-based pattern:** `deleteId` state → ConfirmDialog `open={!!deleteId}` → `onConfirm` executes deletion → clears state
- **i18n keys added:** `promptTemplates.deleteConfirmDescription`, `organizations.deleteConfirmDescription`, `channels.deleteConfirmDescription`, `users.deleteConfirmDescription` (EN + ES — 8 new keys total)

#### Interface Design Audit (system.md updated)

- `.interface-design/system.md` updated with Prompt Template Cards pattern, Tooltips pattern, and key implementation files

---

## v0.3.4 (2026-02-23)

### Dashboard Real Stats + Editable AI Technical Settings

#### Dashboard: Real Prisma Queries (replaces mock data)

- **`lib/dashboard/stats.ts`** — new `fetchDashboardData` server action with 6 parallel Prisma queries:
  - `totalConversations` (count, date-filtered)
  - `activeNow` (count where status open/pending, NO date filter — real-time metric)
  - `aiConversations` (count where responderMode=ai, date-filtered)
  - `uniqueVisitors` (groupBy visitorId, date-filtered)
  - `recentConversations` (top 5 by lastMessageAt, NO date filter)
  - `avgResponseTimeSec` (raw SQL: EXTRACT EPOCH between first visitor msg and first AI/agent response)
  - `topPages` (extracted from conversation metadata.pageUrl)
- **Org scoping:** super_admin uses cookie-based org selection, regular user uses membership org
- **Date range filter:** `from`/`to` params filter totalConversations, aiConversations, uniqueVisitors, avgResponseTime, topPages
- **`dashboard-client.tsx`** — `useTransition` for non-blocking date range re-fetch

#### StatCard: Accent Color System

- **`components/dashboard/stat-card.tsx`** — new `AccentColor` type (`"cta"` | `"emerald"`) with per-accent border, icon bg, icon text, and card background
- **Active Now** moved to first position with emerald accent (green border, green icon, subtle green card background)

#### AI Settings: Editable Technical Parameters (super_admin only)

- **Model selector** — Select dropdown with gpt-4o-mini (Fast), gpt-4o (Balanced), gpt-4-turbo (Premium)
- **Temperature slider** — Slider 0.0–2.0, step 0.1, with teal accent color and live value display
- **Max Tokens input** — Number input 100–4000, step 50, with validation
- **Human Takeover toggle removed** — was cosmetic only (not connected to backend logic), caused confusion. Handoff keywords section remains functional.
- Previously these values were hidden inputs with fixed defaults — now fully editable per organization
- Server action `upsertAiSettings` already supported per-org technical params (model, temperature, maxTokens) — only UI was missing
- RBAC unchanged: only super_admin sees Technical Settings card; org admin sees only business params (system prompt, handoff keywords)

#### API Key Resolution — No Automatic Fallback

- 3-tier resolution: per-org key → global platform key → env `OPENAI_API_KEY`
- Selection by **priority at client creation**, NOT retry on failure
- If per-org key runs out of quota, calls fail — does NOT automatically fall back to global key
- Future consideration: try/catch with fallback to next tier (has billing implications — would subsidize org consumption)

#### Knowledge Base Onboarding Questionnaire

- **`scripts/generate-knowledge-questionnaire.py`** — Python script (python-docx) that generates `docs/ChatFlow360-Knowledge-Questionnaire.docx`
- **Bilingual EN/ES** — every question in English (bold) + Spanish (italic gray)
- **7 universal sections** any business can answer: About, Services & Products, Pricing & Payment, How to Get Started, Location & Hours, Contact Information, FAQs
- **Professional formatting** — ChatFlow360 branding colors (teal #2F92AD, navy #0F1C2E), styled answer boxes with light borders, tips, cover page with logo
- **Purpose:** send to new clients so their AI knowledge base isn't empty from day one

#### i18n

- Added 6 new translation keys in `settings.quickSettings` namespace (EN + ES): description, modelFast, modelBalanced, modelPremium, temperatureHint, maxTokensHint
- Renamed title: "Quick Settings" → "Technical Settings" / "Ajustes Tecnicos"

---

## v0.3.3 (2026-02-23)

### Supabase Realtime RLS Security Fix + Denormalization

#### Problem: Realtime Events Blocked by RLS

After enabling Row Level Security on `conversations` and `messages` tables, Supabase Realtime stopped delivering events. Root cause was two-fold:
1. `@supabase/ssr`'s `createBrowserClient` does not propagate auth JWT to the Realtime WebSocket (supabase-js Issue #1304)
2. Complex RLS policies with JOINs (conversations -> channels -> organization_members) caused walrus (Supabase's Realtime policy evaluation engine) to silently drop events

#### Solution: setAuth + Denormalization

- **`supabase.realtime.setAuth(session.access_token)`** — explicitly sets JWT on Realtime WebSocket connection, bypassing the `@supabase/ssr` limitation
- **Token refresh listener** — `onAuthStateChange` re-sets auth on `TOKEN_REFRESHED` event, cleans up on `SIGNED_OUT`
- **Denormalized `organizationId` onto `conversations` table** — enables simple RLS policy (`organization_id = ANY(SELECT get_user_org_ids())`) without JOINs, which walrus can evaluate
- **30s polling safety net** — visibility-aware fallback timer (pauses when tab is hidden, resumes on focus)
- **UUID validation** — sanitizes all IDs before passing to Supabase channel filters

#### Files Modified

- **`prisma/schema.prisma`** — Added `organizationId` to Conversation model with `@relation` to Organization
- **`app/api/chat/route.ts`** — Sets `organizationId: org.id` when creating new conversations
- **`app/[locale]/(dashboard)/conversations/page.tsx`** — Simplified org filter (direct `organizationId` instead of JOIN through channel)
- **`hooks/use-realtime-conversations.ts`** — `setAuth`, `onAuthStateChange`, UUID validation, 30s polling safety net
- **`hooks/use-realtime-messages.ts`** — Same pattern as conversations hook (setAuth + token refresh + polling)

#### Security Fixes — Cascade, TOCTOU, AutoComplete

- **MED-05: deleteOrganization cascade check** — `deleteOrganization` en `lib/admin/actions.ts` ahora verifica `_count.members > 0` antes de borrar. Retorna error i18n `orgHasMembers` si la org tiene miembros activos. Previene borrado accidental en cascada de channels, conversations, messages, AI settings, etc.
- **LOW-02: Slug TOCTOU race condition fix** — `createOrganization` ya no hace `findUnique` check previo al `create`. Crea directamente y captura error Prisma `P2002` (unique constraint violation), retornando `slugExists`. Atomico — sin race condition entre check y create.
- **LOW-04: autoComplete="off" en admin forms** — Agregado `autoComplete="off"` en 3 inputs de `organizations-client.tsx`: org name, org slug, channel name. Users form y AI Settings ya lo tenian verificado.
- **Audit progress:** CRITICAL 1/1, HIGH 2/2 (renumbered from original audit), MEDIUM 5/6, LOW 5/6 resueltos. Pendiente: MED-02 (rate limiting, Upstash Redis), LOW-03 (translation key safelist, riesgo teorico).

#### RLS Policies (applied in Supabase)

- **`tenant_select_conversations`:** `USING (organization_id = ANY(SELECT get_user_org_ids()))` — simple column check, no JOINs
- **`tenant_select_messages`:** `USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id = ANY(SELECT get_user_org_ids())))` — single JOIN only
- **`get_user_org_ids()`:** `SECURITY DEFINER` function returning org IDs for current user (super admin sees all, regular user sees membership orgs)
- **REPLICA IDENTITY FULL** enabled on both `conversations` and `messages` tables

#### Security Model — 3 Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| RLS | Supabase Realtime event filtering (org-scoped SELECT policies) | Tenant isolation for live events |
| Server Actions | Prisma with auth guards (`getCurrentUser`, `requireSuperAdmin`) | Dashboard CRUD operations |
| Widget API | `publicKey` + `visitorId` validation | Public chat endpoints |

---

## v0.3.2 (2026-02-22)

### Supabase Realtime + OWASP Security Hardening (Widget API)

#### Dashboard: Supabase Realtime — Live Conversations

- **`hooks/use-realtime-conversations.ts`** — new custom hook for live conversation updates
  - Subscribes to Supabase `postgres_changes` on the `conversations` table (channel-scoped or org-scoped)
  - On any INSERT/UPDATE/DELETE event, triggers a debounced `router.refresh()` (300ms debounce to batch rapid changes)
  - Cleanup on unmount: removes Supabase channel subscription via `supabase.removeChannel()`
  - Uses `useRef` for debounce timer to avoid stale closures
- **Conversations page** (`conversations-client.tsx`) now shows a **Live indicator** badge (green pulse dot + "Live" label) when Realtime is active
- Data flow: `postgres_changes` event → debounced `router.refresh()` → Next.js server re-fetch → updated `Conversation[]` passed to client component
- No WebSocket/SSE implementation needed: Supabase Realtime handles the persistent connection; Next.js router.refresh() triggers the server-side Prisma re-fetch

#### OWASP Security Hardening — Widget API Endpoints

- **FIX-1: CORS method sync** — `Access-Control-Allow-Methods` in `lib/api/cors.ts` now matches `next.config.ts` header definition exactly (`GET, POST, PATCH, OPTIONS`). Previously PATCH was missing from one of the two locations, causing inconsistent preflight behavior.
- **FIX-2: UUID format validation on path params** — `app/api/chat/[id]/route.ts` now validates the `conversationId` path parameter with `z.string().uuid()` before any DB query. Returns 400 with `{ error: "Invalid conversation ID" }` on malformed input. Prevents DB noise and potential injection via path.
- **FIX-3: visitorId Zod UUID validation** — `closeConversationSchema` and `getHistorySchema` in `lib/api/validate.ts` enforce `z.string().uuid()` for `visitorId`. Rejects any non-UUID format before reaching the database.
- **FIX-4: Widget uses `crypto.getRandomValues()` for visitorId** — `public/widget/chatflow360.js` now generates `visitorId` using `crypto.getRandomValues()` (Web Crypto API) instead of `Math.random()`. Generates a proper UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`. Consistent with server-side UUID validation.
- **FIX-5: Body size limits** — explicit request body size limits enforced in API route handlers:
  - `POST /api/chat`: 16KB limit (accommodates message 1-2000 chars + metadata with margin)
  - `PATCH /api/chat/[id]`: 1KB limit (body is only `{ visitorId: UUID }`)
  - Returns 413 with `{ error: "Request too large" }` if exceeded
- **FIX-6: Safe JSON parsing** — all API route handlers now wrap `await request.json()` in a `try/catch`. Returns 400 with `{ error: "Invalid JSON" }` on parse failure instead of an unhandled 500 error.
- **FIX-7: Zod error sanitization** — Zod `ZodError` details (field paths, internal messages) are no longer forwarded to the client response. API routes now return a generic `{ error: "Invalid request" }` to the client while logging full `error.errors` server-side via `console.error("[route]", error.errors)`.
- **FIX-8: Channel and org `isActive` validation in PATCH** — `PATCH /api/chat/[id]` now verifies that both the channel and its parent organization have `isActive: true` before processing the close request. Returns 403 with `{ error: "Channel not active" }` if either is inactive. Prevents operations on deactivated tenants.

#### Dashboard: Supabase Realtime — Live Conversation Detail

- **`hooks/use-realtime-messages.ts`** — new custom hook for live message updates within an open conversation
  - Subscribes to Supabase `postgres_changes` on the `messages` table filtered by `conversation_id`
  - Listens for `INSERT` events only (new messages arriving)
  - Debounced callback (300ms) to batch rapid consecutive events
  - `callbackRef` pattern keeps callback fresh without re-subscribing
  - Cleanup on unmount: clears debounce timer + removes Supabase channel
  - `enabled` flag to pause/resume subscription
- **`conversation-detail.tsx`** integrates `useRealtimeMessages` — when a conversation is open, new messages from the AI or agent appear automatically without manual refresh
- **Auto-scroll chat** — messages container uses `useRef` + `scrollIntoView({ behavior: "smooth" })` after every fetch, keeping the view pinned to the latest message

#### Dashboard: Conversation Detail UI Polish

- **Refresh button** in conversation detail header — RefreshCw icon with spin animation during loading (same pattern as conversations list refresh)
- **Red closed badge** — closed status badge in detail panel now uses `destructive` colors (red background) matching the card-level badges, instead of the previous neutral style
- **Removed placeholder buttons** — "Reopen Conversation" and "Assign to Agent" buttons removed from detail panel actions. Only "Close Conversation" button remains, shown only for active (non-closed) conversations

#### Default Handoff Keywords — `lib/chat/defaults.ts`

- **19 bilingual keywords** (10 EN + 9 ES) pre-loaded as defaults for new organizations
  - EN: human, agent, real person, speak to someone, talk to someone, representative, operator, live agent, supervisor, manager
  - ES: humano, agente, persona real, hablar con alguien, representante, operador, agente en vivo, supervisor, gerente
- **AI Settings UI** pre-populates the handoff keywords textarea with these defaults when no custom keywords exist
- **Server action `createOrganization`** uses `DEFAULT_HANDOFF_KEYWORDS` as fallback when creating AiSettings for a new org
- `as const` tuple type + `DefaultHandoffKeyword` type for type safety

#### RBAC: Org Admin Access to AI Settings

- **`upsertAiSettings`** server action now allows org members (not just super_admin) to edit **business params**:
  - `systemPrompt` — AI behavior instructions
  - `handoffKeywords` — keywords that trigger human takeover
  - `handoffEnabled` — toggle for human takeover feature
- **Technical params remain super_admin only:**
  - `model` — OpenAI model selection (gpt-4o-mini, gpt-4o, etc.)
  - `temperature` — response creativity slider
  - `maxTokens` — maximum response length
  - `encryptedApiKey` / `apiKeyHint` — per-org API key
- **Quick Settings sidebar** in AI Settings page: **hidden for org_admin** — only super_admin can see and edit (model, temperature, max tokens, human takeover switch). No read-only state for org_admin.

#### Upstash Redis — Deferred

- Rate limiting via `@upstash/ratelimit` officially deferred to production phase
- Not needed during MVP/testing with known test users
- Architecture section documents the planned implementation for when production traffic arrives

---

## v0.3.1 (2026-02-22)

### Widget UX Improvements + Session Timeout + Conversation Auto-Cleanup

#### Widget: Maximize/Minimize Toggle
- **Expand/collapse button** en el header del widget (izquierda del botón X), solo visible en desktop
- **Modo compacto:** 380x520px (default). **Modo expandido:** 420px de ancho, 100vh de alto — panel derecho full height
- Icono cambia entre `expand` y `collapse` según el estado actual
- Auto-colapso al cerrar el widget: el próximo open siempre inicia en modo compacto
- Hidden en mobile (<480px) porque ya es fullscreen

#### Widget: End Conversation
- **Badge oscuro** (#0f1c2e) debajo del input, alineado a la izquierda, con texto "End conversation" / "Finalizar conversación"
- Click en el badge muestra **diálogo de confirmación** ("Are you sure?" / "¿Estás seguro?") con botones Yes/No
- "Yes" limpia `conversationId` + `visitorId` del localStorage y resetea el widget al estado de bienvenida (welcome screen)
- Padding del badge: `0 16px 0`; padding del área de input: `12px 16px 6px`

#### Widget: Session Auto-Timeout
- **Timeout de 2 horas** por inactividad del visitante
- Timestamp guardado en localStorage: `cf360_conv_ts_` + publicKey, actualizado en cada `sendMessage()`
- Al iniciar el widget, se verifica el timestamp: si han pasado más de 2h desde el último mensaje, la conversación expirada se descarta y se muestra welcome screen
- Comportamiento: silencioso para el visitante (no hay mensaje de error, solo pantalla de inicio limpia)

#### Backend: Limpieza Automática via pg_cron
- **Función SQL:** `close_stale_conversations()` — cierra conversaciones con status `'open'` o `'pending'` donde `last_message_at` es anterior a 2 horas
- **Schedule:** `0 */6 * * *` — se ejecuta cada 6 horas via pg_cron en Supabase
- **Enfoque híbrido:** timeout client-side 2h (UX inmediata) + pg_cron server-side cada 6h (limpieza de DB para conversaciones sin cliente activo)
- Comandos de administración:
  ```sql
  -- Ver historial de ejecuciones
  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
  -- Desactivar el job
  SELECT cron.unschedule('close-stale-conversations');
  ```

#### Backend: PATCH /api/chat/[id] — Close Conversation from Widget
- **Nuevo endpoint PATCH** en `app/api/chat/[id]/route.ts` — cierra la conversacion desde el widget
- Valida ownership via `visitorId` (mismo patron que GET)
- Zod schema `closeConversationSchema` en `lib/api/validate.ts` (`{ visitorId: z.string().uuid() }`)
- Idempotente: si la conversacion ya esta cerrada, retorna `{ id, status: "closed" }` sin modificar
- Sets `status = "closed"` en Prisma; respuesta: `{ id, status: "closed" }`

#### Widget: Sync Close al Backend
- **`closeConversationApi(conversationId)`** — llamada PATCH fire-and-forget al nuevo endpoint
- Invocada en 2 lugares: confirmacion manual "End conversation" + session timeout auto-reset
- Elimina la inconsistencia donde el widget mostraba cerrada pero el dashboard mostraba abierta

#### CORS: Metodo PATCH Agregado
- `Access-Control-Allow-Methods` en `lib/api/cors.ts` actualizado
- Antes: `GET, POST, OPTIONS` → Ahora: `GET, POST, PATCH, OPTIONS`

#### Dashboard: Conversation Card UI — Closed Badge + Selective Opacity
- **Badge "closed" ahora es rojo** (color destructive) — antes usaba el mismo color neutral
- **Selective opacity:** contenido del card a `opacity-40` para status `closed` y `resolved`, pero el badge mantiene opacity completa
- Variable `isFaded` controla la opacidad por elemento individual en vez de aplicarla a todo el card

#### Cleanup Hibrido: Modelo de 3 Capas
- **Capa 1:** Widget PATCH al backend — inmediata, en el momento del cierre por accion del usuario
- **Capa 2:** Client-side session timeout 2h — al proximo open del widget si pasaron 2h sin actividad
- **Capa 3:** pg_cron `close_stale_conversations()` cada 6h — safety net para conversaciones sin cliente activo
- Las 3 capas son complementarias; ninguna depende de las otras para funcionar

#### Dashboard: Conversations Page Polish (v0.3.0 post)
- **Refresh button** con icono RefreshCw — actualiza conversaciones sin navegación completa
- `useTransition` + `router.refresh()` para refresh no-bloqueante
- **Loading state visual:** cards bajan a `opacity-40` + `pointer-events-none` durante refresh

#### Widget: Icon + Animation Polish (v0.3.0 post)
- **Custom SVG icon:** speech bubble + 3 puntos animados (reemplaza icono genérico de chat)
- **Pulse animation:** `infinite` en la burbuja del widget (no se detiene después de 3 ciclos)
- **Icon centering fixes:** alineación correcta del SVG dentro del botón de burbuja

---

## v0.3.0 (2026-02-20)

### Chat Widget + API Backend + API Key Management

**El producto core:** visitante abre widget en sitio del cliente, escribe un mensaje, recibe respuesta de IA automaticamente. Keywords de handoff transfieren a agente humano.

#### Widget Embebible
- **Widget vanilla JS** (~770 lineas, IIFE) en `public/widget/chatflow360.js`
  - DOM injection directa (NO iframe — evita CSP issues), clases prefijadas `.cf360-`
  - Bilingue EN/ES via `data-lang`, deteccion automatica del browser
  - Mobile responsive: fullscreen en <480px, teclado-aware
  - Persistencia: `visitorId` + `conversationId` en localStorage
  - Polling cada 5s cuando `responderMode="human"` (esperando agente)
  - Typing indicator (3 dots animados) mientras espera respuesta IA
  - XSS prevention: solo `textContent`, nunca innerHTML
  - z-index maximo (2147483647), pulse animation en burbuja, unread badge
  - Configurable: `data-key`, `data-lang`, `data-color`, `data-position`
- **Embed snippet:**
  ```html
  <script src="https://app.chatflow360.com/widget/chatflow360.js"
    data-key="PUBLIC_KEY" data-lang="en" defer></script>
  ```

#### API Backend
- **`POST /api/chat`** — enviar mensaje + respuesta IA automatica
  - Zod validation (publicKey UUID, message 1-2000 chars, visitorId)
  - Busca channel por publicKey, verifica isActive
  - Crea o recupera conversacion, guarda mensaje visitor
  - Detecta handoff keywords → cambia responderMode a "human"
  - Genera respuesta IA con OpenAI (historial de ultimos 20 msgs)
  - Guarda mensaje IA con tokensUsed, upsert UsageTracking
- **`GET /api/chat/[id]`** — historial de conversacion
  - Validacion de ownership via visitorId
  - Retorna messages[], status, responderMode
- **CORS separado** en `next.config.ts`: 3 bloques de headers
  - Dashboard routes: CSP completo + security headers
  - `/api/chat/*`: CORS abierto + headers minimos
  - `/widget/*`: CORS + cache (1h browser, 24h CDN)

#### API Key Management (AES-256-GCM)
- **Encriptacion** en `lib/crypto/encryption.ts`: AES-256-GCM con Node.js crypto nativo
  - Master key: `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)
  - Formato DB: base64 [IV + authTag + ciphertext], IV aleatorio por encrypt
  - `maskApiKey()`: `sk-...aBcD` (primeros 3 + ultimos 4 chars)
- **Resolucion 3 niveles** en `lib/openai/client.ts`:
  1. Per-org encrypted key (AiSettings) → decrypt
  2. Global platform key (PlatformSettings) → decrypt
  3. `OPENAI_API_KEY` env var → fallback
- **API Keys page** (`/settings/api-keys`) — super_admin only
  - Input type="password" font-mono, badge configured/not configured
  - Server action `upsertPlatformKey` con encrypt + mask
- **Per-org key** en AI Settings existente — campo adicional (super_admin only)
  - Badge con hint actual (ej: `sk-...aBcD`)
- **Prisma migration** `add_api_key_encryption`:
  - `encryptedApiKey` + `apiKeyHint` en AiSettings
  - Nuevo modelo `PlatformSettings` (key unique, value Text, hint)
- **Seguridad:** API keys NUNCA se envian desencriptadas al browser, solo `apiKeyHint`

#### OpenAI Integration + Chat Utilities
- **`lib/openai/client.ts`** — factory con resolucion de key 3 niveles
- **`lib/chat/config.ts`** — `resolveChannelConfig()`: herencia channel → org
  - Params tecnicos (model, temperature, maxTokens): siempre de AiSettings
  - Params negocio (systemPrompt, handoff): channel override o fallback
- **`lib/chat/handoff.ts`** — `detectHandoff()`: case-insensitive partial match + mensajes bilingues
- **`lib/chat/ai.ts`** — `generateAiResponse()`: system prompt + ultimos 20 msgs + nuevo mensaje

#### Dashboard — Datos Reales
- **Conversations page** reescrita como server component con Prisma query
  - Super admin: filtra por selectedOrgId/channelId (cookies)
  - Regular user: filtra por org membership
  - Transforma datos Prisma a Conversation[] con contactInfo extraction
- **Types actualizados:** `ConversationStatus: "open" | "pending" | "resolved" | "closed"`, `ResponderMode: "ai" | "human"`, `senderType` en vez de `sender`
- **ConversationDetail** fetch mensajes via server action `getConversationMessages`
- **Mock data** actualizado para coincidir con nuevos tipos

#### Otros
- **~25 nuevas traducciones** (EN + ES): API keys, widget, conversation statuses
- **Sidebar**: nuevo item "API Keys" con icono Key (super_admin only)
- **`npm install openai`** — dependencia para generacion de respuestas IA
- Verificado con `npm run build` — 0 errores TypeScript, todas las rutas compilan

---

## Post v0.2.3 — AI Settings Page (2026-02-19)

### AI Settings — Two-Column Layout + Preview Widget

- **AI Settings page** (`/settings/ai`) con layout de dos columnas:
  - Columna izquierda: tabs Instructions + Knowledge Base (contenido principal)
  - Columna derecha: Quick Settings sidebar (model, temperature, max tokens, handoff toggle)
- **AI Preview widget** estilo WhatsApp — chat bubbles para previsualizar comportamiento de la IA
- **Server action `upsertAiSettings`** en `lib/admin/actions.ts` con Zod validation
  - Server page: fetch de AI settings por org (super_admin via cookie, regular user via membership)
  - Client component: `AiSettingsClient` con tabs, form state, `useActionState`
- **`getCurrentUser()` envuelto con React `cache()`** para evitar Serializable transaction deadlocks
- **~30 nuevas traducciones** (EN + ES): AI settings labels, placeholders, preview, tabs

## v0.2.3 (2026-02-19)

### Security Hardening + Navigation Progress Bar

- **Custom navigation progress bar** — reemplazo de `@bprogress/next` (incompatible con Next.js 16 + next-intl)
  - Click delegation en `<a>` tags (capture phase) + `usePathname()` de next-intl para detectar cambios
  - Barra teal (#2f92ad) con animacion gradual (15% → 90% → 100%)
  - Soporta browser back/forward via `popstate`
- **4 vulnerabilidades CRITICAS corregidas:**
  - CRIT-01: Race condition en bootstrap → `$transaction` Serializable
  - CRIT-02: Auth guard faltante en dashboard layout → redirect a login si `!user`
  - CRIT-03: UUID validation en funciones delete → `z.string().uuid().parse(id)`
  - CRIT-04: Open redirect en auth callback → sanitizacion OWASP 6 capas + allowlist de hosts
- **6 vulnerabilidades HIGH/MED corregidas (Phase 1):**
  - HIGH-01: Locale sanitizado contra `routing.locales` en redirects de auth
  - HIGH-02: Cookies con `Secure;SameSite=Lax` + validacion UUID server-side
  - HIGH-03: Content-Security-Policy header con 9 directivas (environment-aware)
  - HIGH-04: `crypto.getRandomValues()` + Fisher-Yates shuffle para passwords
  - HIGH-05: `updateUser()` envuelto en `prisma.$transaction`
  - MED-01: Orden de `deleteUser()` invertido — Supabase Auth primero, Prisma despues
- **3 mejoras LOW corregidas (Phase 2 quick wins):**
  - LOW-01: Middleware locale regex dinamico (importa `locales` de routing, no hardcodeado)
  - LOW-05: `console.error` con nombre de funcion en los 10 catch blocks de server actions
  - LOW-06: Prisma query logging (`["query", "error", "warn"]` en dev, `["error"]` en prod)
- **Auth callback** hardened: `sanitizeRedirectPath()` (6 capas) + `getSecureOrigin()` con `ALLOWED_HOSTS`
- **Audit completo** documentado en `docs/SECURITY-AUDIT-v0.2.2.md` (21 findings, 16 positive practices)
- Pendiente Phase 2: rate limiting (MED-02), CORS utility (MED-03)
- Pendiente Phase 3: mock data cleanup, cascade checks, RBAC ownership — cuando conecte backend

## v0.2.2 (2026-02-16)

### Channel CRUD + Header dinámico

- **Header dinámico**: muestra nombre de org seleccionada (super admin) o org del membership (usuario normal), solo fecha si no hay org
  - Eliminada dependencia de `mockOrganization` del header
  - `organizationName` derivado en layout.tsx y pasado via DashboardShell → Header
- **Channel CRUD integrado en Organizations** — filas expandibles con sub-tabla de canales
  - Click en chevron o "0/1 channels" expande la fila mostrando canales de la org
  - Sub-tabla: nombre, tipo (Website badge con Globe icon), status (Active/Inactive), acciones (edit/delete)
  - Dialog para crear/editar canal: nombre + tipo (Website fijo para MVP) + status (solo en edit)
  - Empty state con Globe icon cuando no hay canales
  - Limite por plan enforced: Starter=1, Pro=3, Growth=10 — boton deshabilitado + mensaje amber al alcanzar limite
- **Server actions** en `lib/admin/actions.ts`: `createChannel`, `updateChannel`, `deleteChannel`
  - Zod validation, `requireSuperAdmin()` guard
  - `createChannel` verifica org activa + limite de canales + auto-genera `publicKey` (UUID)
  - `deleteChannel` con cascade (Prisma onDelete)
- **~15 nuevas traducciones** (EN + ES): channels.newChannel, editChannel, channelName, types.website, limitReached, channelsCount, etc.
- **Error keys** nuevos: `channelNameRequired`, `channelLimitReached`
- Verificado con `npm run build` — compila sin errores
- Deploy a produccion (Vercel) — dominio custom: https://app.chatflow360.com
- **Dominio personalizado**: `app.chatflow360.com` via Cloudflare DNS (CNAME → Vercel, proxy disabled)

## v0.2.1 (2026-02-15)

### CRUD Organizaciones + Usuarios (Super Admin) + Context Selectors

- **getCurrentUser()** en `lib/auth/user.ts` — obtiene usuario Supabase Auth + upsert en Prisma
  - Bootstrap: primer usuario se marca automaticamente como `isSuperAdmin: true`
  - Incluye memberships con organizations
- **Supabase Admin Client** en `lib/supabase/admin.ts` — SERVICE_ROLE_KEY para crear/eliminar usuarios en Auth
- **Server actions** en `lib/admin/actions.ts`: CRUD organizations + users
  - Guard `requireSuperAdmin()` en cada accion
  - Zod validation para todos los inputs
  - Users: creacion dual (Supabase Auth + Prisma) con rollback si Prisma falla
  - Organizations: auto-genera slug desde nombre, crea AiSettings por defecto
  - Delete user previene auto-eliminacion del super admin
- **Organizations page** (`/organizations`) — tabla con Name, Slug, Plan (badge), Status, Members, Created
  - Dialog para crear/editar con nombre, slug (auto-gen), plan (Starter/Pro/Growth)
  - Delete con confirmacion
- **Users page** (`/users`) — tabla con avatar, nombre, email, rol (badge), organizacion, fecha
  - Dialog para crear: email, nombre, password temporal, organizacion (select), rol (select)
  - Badge especial "Super Admin" con icono Shield en amber
  - Super admins no se pueden editar ni eliminar
- **Sidebar condicional**: seccion ADMIN (Organizations, Users) solo visible para super_admin
  - Iconos: Building2 para Organizations, Users para Users
  - Label "ADMIN" en text-xs uppercase
- **Context selectors** en sidebar (solo super_admin):
  - Selector de organizacion antes de nav items (Building2 icon + ChevronsUpDown)
  - Selector de canal aparece al elegir org (MessageSquare icon)
  - Seleccion guardada en cookies (90 dias), legible server-side
  - `router.refresh()` al cambiar para actualizar server components
  - Empty state "No channels yet" cuando org no tiene canales
- **Header con usuario real**: nombre y email del usuario autenticado (no mock)
- **Layout async**: fetch user + admin context (orgs con channels) + cookies de seleccion
- **DashboardShell**: pasa isSuperAdmin, userName, userEmail y adminContext al Sidebar
- **~106 nuevas traducciones** (EN + ES): organizations, users, admin.errors, context selectors
- Zebra striping en tablas admin (mismo patron que dashboard)
- Verificado con `npm run build` — compila sin errores
- Deploy a produccion (Vercel)

## v0.2.0 (2026-02-15)

### Autenticacion Real con Supabase Auth

- **Login funcional** con Supabase Auth (`signInWithPassword`) — credenciales reales, no mock
- **Logout funcional** desde header dropdown via server action (`signOut`)
- **Forgot Password page** (`/forgot-password`) — split-screen, envia email de reset (pendiente config Supabase SMTP)
- **Update Password page** (`/update-password`) — formulario centrado para setear nueva contrasena
- **Server actions** en `lib/auth/actions.ts`: login, logout, forgotPassword, updatePassword
  - Zod validation con `z.string().email()` + password min/max
  - Retornan i18n error keys (`invalidCredentials`, `passwordsMismatch`, etc.)
  - `useActionState` (React 19) en vez de deprecated `useFormState`
- **Middleware integrado** Supabase + next-intl (patron: "Supabase primero, intl despues, copiar cookies")
  - `getUser()` para validacion server-side (no `getSession()`)
  - Redirect automatico: no-auth → login, auth + public route → dashboard
  - Async middleware con cookie bridging entre Supabase y next-intl responses
- **Auth callback** en `app/api/auth/callback/route.ts` — code exchange para email links de password reset
- **Login page rewired**: `useState` + fake `handleSubmit` → `useActionState` + `formAction`
  - Inputs uncontrolled con `name` attributes para FormData
  - Hidden locale input para redirects locale-aware
  - Error banner traducido via `t(`errors.${state.error}`)`
  - Link a `/forgot-password` funcional
- **Header logout**: DropdownMenuItem envuelto en `<form action={logout}>` con `<button type="submit">`
- **+40 traducciones** (EN + ES): errors, success, resetPassword, updatePassword namespaces
- **Stat card border style**: cambiado de `<div>` absoluto a `border-l-[3px] border-l-cta` (CSS puro)
- **Cursor-pointer fixes**: language chip (EN/ES), notification bell, theme toggle
- Verificado en produccion (Vercel) — login, logout, redirect de rutas protegidas
- `publicRoutes`: `/login`, `/signup`, `/forgot-password`, `/update-password`
- Super admin: `joseleon86@gmail.com` creado en Supabase Auth dashboard

## v0.1.10 (2026-02-14)

### Login Page Polish — Branding Alignment with Website

- Logo oficial (`/logo.png`) centrado sobre "Welcome back" en panel derecho
  - `dark:brightness-0 dark:invert` para visibilidad en ambos modos
- 6 feature cards en grid 2x3 (antes eran 3 cards con descripcion)
  - Always On (Clock, emerald), More Leads (Users, emerald), One Flat Price (DollarSign, amber)
  - Built for Businesses Growth (TrendingUp, violet), More Value Less Overhead (Zap, rose), Enterprise-Level AI (Sparkles, cyan)
  - Colores individuales por card, matcheados con el sitio web (chatflow360.wpenginepowered.com)
- Branding copy actualizado: headline y subheadline alineados con el sitio web
- Dark mode fix: panel derecho usa `bg-card` (#142236) para distincion del izquierdo (#0f1c2e)
- Inputs con efecto inset: `bg-background` sobre superficie `bg-card`
- Borde sutil entre paneles: `border-r border-white/10`
- Contenido del panel izquierdo centrado horizontalmente (`items-center` + `max-w-md`)
- Mobile: logo visible en form, panel branding oculto

## v0.1.9 (2026-02-14)

### Login Page + Security Hardening

- Nueva pagina de login split-screen en `app/[locale]/(auth)/login/page.tsx`
  - Panel izquierdo: branding navy (#0f1c2e) con headline y feature cards
  - Panel derecho: formulario (email, password, forgot password, sign in, sign up link)
  - Mobile: panel branding oculto, logo centrado + form
  - ThemeToggle + language switch (EN/ES) en esquina superior derecha
- Route group `(auth)` separado de `(dashboard)` — sin sidebar/header
- ~25 nuevas translation keys en namespace `auth.*` (EN + ES)
- Security: headers configurados en `next.config.ts` (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Security: `.env.example` creado con variables template (Supabase, OpenAI, DB, App URL)
- Security: `maxLength={100}` en search input de conversations
- Security: middleware preparado con `publicRoutes` array y placeholder para Supabase Auth
- Nuevo: `docs/SECURITY.md` con audit completo y checklist para backend
- Form security: `maxLength` en email (254) y password (minLength 8, maxLength 128)

## v0.1.8 (2026-02-14)

### Dashboard Metrics Refresh + Nav Cleanup

- Sidebar: ocultar nav items "Canales" y "Reportes" (comentados, no eliminados — se abordan a futuro)
- Dashboard: "Channels Performance" renombrado a **"Top Pages"** / **"Páginas Más Relevantes"**
  - Mock data cambiado de channel names a page URLs (`/services`, `/pricing`, `/contact`) con `font-mono`
- Dashboard: "Avg Response Time" reemplazado por **"Avg Session Time"** / **"Tiempo Promedio de Uso"** (mock: 4.2m)
- Dashboard: "Resolution Rate" reemplazado por 2 nuevas metricas:
  - **"AI Handled"** / **"Resueltas por IA"** — % de conversaciones resueltas por IA sin humano (mock: 87%)
  - **"New Visitors"** / **"Visitantes Nuevos"** — visitantes unicos que inician chat (mock: 156)
- Stat cards: ahora son 5 (grid `lg:grid-cols-5`), antes eran 4
- Stat card: borde izquierdo teal ahora sigue `border-radius` del card (pseudo-elemento `rounded-l-lg` en vez de `border-l`)
- Iconos actualizados: `Bot` para AI Handled, `UserPlus` para New Visitors

## v0.1.7 (2026-02-14)

### UI Polish — Interface Design Audit

- Audit completo de light/dark mode con skill `/interface-design`
- Fix: sidebar header separator (`border-b border-sidebar-border`) para separacion visual logo/nav
- Fix: sidebar border contrast en light mode (`--sidebar-border: #b0bfcb`, antes era invisible `#dce4ea`)
- Fix: card surfaces con cool tint sutil (`--card: #fafcfe` en vez de `#ffffff` puro)
- Fix: card shadows reforzados (+2% opacidad en navy-tinted shadows)
- Fix: filter tabs con `border border-border/50` para definicion visual del container
- Fix: search input dark mode con `dark:bg-muted/30 dark:border-muted-foreground/20`
- Fix: date range picker trigger con `rounded-full` (chip/pill shape diferenciado)
- Fix: headings h1 con `tracking-tight` en todas las pages (5 archivos)
- Fix: `--destructive` desaturado en dark mode (`#e25555` en vez de `#ef4444`)
- Nuevo: `.interface-design/system.md` — memoria del skill con decisiones de implementacion UI
- Verificado visualmente en 4 combinaciones: Light EN, Light ES, Dark EN, Dark ES

## v0.1.6 (2026-02-13)

### Conversation Detail Panel — Two-Column Layout + Mobile Drawer

- Conversation detail panel rediseñado con layout de dos columnas en desktop (820px total)
  - Columna izquierda: chat con scroll interno (header + messages + input footer fijo)
  - Columna derecha: lead details sidebar (320px) con perfil, info de conversacion, canal y acciones rapidas
- Mobile: boton Info (reemplazo del back button) abre Bottom Sheet Drawer (vaul) con lead details
- Lead details content extraido en variable reutilizable entre desktop sidebar y mobile drawer
- Nuevo componente `drawer.tsx` (shadcn/ui basado en vaul)
- Fix: scroll interno del chat en mobile — `overflow-hidden` en contenedor + `min-h-0` en chat column (clasico bug flexbox vertical)
- Fix: scroll interno del chat en desktop — `min-h-0` en ScrollArea para constraining en flex parent
- Mock data expandido: conv-2 (John Smith) de 4 a 15 mensajes con handoff AI→Humano realista
- Panel width responsive: mobile full-width, sm 480px (single col), lg 820px (two cols)
- Chat bubbles mejorados: rounded-2xl, visitor bg-muted dark:bg-muted/80, AI/agent bg-cta/10 dark:bg-cta/20
- i18n: 11 nuevas keys en `conversations.detail.*` (EN + ES)
- Verificado en 4 viewports: Desktop light/dark, Mobile light/dark

## v0.1.5 (2026-02-13)

### Soporte Bilingue EN/ES con next-intl

- Implementacion completa de i18n con next-intl v4 y URL-based routing (`/en/`, `/es/`)
- Middleware para auto-deteccion de idioma del browser y routing automatico
- ~160 strings traducidas en EN y ES organizadas en 9 namespaces
- Reestructuracion de App Router: `app/[locale]/(dashboard)/*` para soporte de locale en URL
- Root layout minimal + locale layout con NextIntlClientProvider
- Header: toggle EN/ES funcional con `useLocale()` + `router.replace()` para cambio de idioma
- Sidebar: navegacion locale-aware con `Link` de next-intl (auto-prefix de locale)
- Dashboard: stats, recent conversations, channels performance, AI performance — todo traducido
- Conversations: filtros, cards, detalle, status badges, handler labels — todo traducido
- Settings AI: tabs, form labels, placeholders, botones, preview — ~35 strings traducidas
- Formato de fechas locale-aware: "hace 23h" (ES) vs "23h ago" (EN), "13 feb 2026" vs "Feb 13, 2026"
- Date range picker: presets y labels traducidos
- TypeScript autocomplete para translation keys via `types/i18n.d.ts`
- Cookie `NEXT_LOCALE` para persistencia de preferencia de idioma
- Regla 13 actualizada en RULES.md con guia completa de i18n
- Regla 14 nueva: matriz de verificacion visual (Light/Dark x EN/ES)
- Verificado visualmente en las 4 combinaciones: Light EN, Light ES, Dark EN, Dark ES
- Fix: Calendar range picker se cerraba al primer click (compatibilidad react-day-picker v9)
- Fix: Date picker responsive en mobile (flex-col + right alignment para boton Apply)

## v0.1.4 (2026-02-12)

### Light Mode Premium + Elevation System

- Cool-tinted light mode: background, borders, sidebar y muted colors con tonos navy/teal del brandbook (no mas grises neutros)
- Sistema de elevacion (box-shadow) para cards en ambos modos: navy-tinted en light, depth sutil en dark
- Sidebar con sombra lateral sutil en light mode para separacion visual
- Header con shadow inferior para jerarquia visual
- Stat cards con borde izquierdo teal (border-l-cta) como acento de identidad
- Conversation cards con micro-elevacion en hover (translate-y + shadow intensificado)
- Zebra striping en Recent Conversations (bg-muted/60 en filas impares, empieza desde fila 1)
- Espaciado mejorado entre filas de la tabla (space-y-1.5 + py-3)

## v0.1.3 (2026-02-12)

### Dashboard UI Components + Date Filters

- DateRangePicker reusable: popover con Calendar dual + presets (7d/30d/90d), future dates deshabilitados
- Date range filter en Dashboard y Conversations (default: ultimos 30 dias)
- DashboardClient wrapper para estado de date range
- Conversation detail panel con overlay via createPortal (backdrop blur-md + bg-black/60)
- Portal SSR-safe con patron mounted state (evita hydration mismatch)
- Language toggle moderno: segmented control EN|ES con estado activo (shadow + bg-card)
- Escape key cierra panel de detalle

## v0.1.2 (2026-02-12)

### Frontend Setup Inicial + Theme System

- Proyecto Next.js 16 con App Router, TypeScript strict, Tailwind CSS v4
- Shadcn UI inicializado con componentes: button, card, badge, input, textarea, select, separator, avatar, dropdown-menu, sheet, tabs, slider, switch, label, scroll-area, dialog, popover, calendar
- Theme system: dark/light con next-themes, CSS variables semanticas, light mode como default
- Sidebar (260px): logo, nav links, theme toggle, user info, responsive con Sheet en mobile
- Header: org name, fecha, notificaciones, avatar, language toggle
- Dashboard Home: 4 stat cards, recent conversations, channels performance, AI performance
- Conversations: grid de cards con filtros (All/Active/AI/Human) + search + panel de detalle
- Settings AI: tabs Instructions (system prompt, model, temperature, max tokens, handoff keywords) + Knowledge Base
- Mock data completo: organizacion, usuario, conversaciones, mensajes, AI settings
- Tipos TypeScript basados en DATA-MODELS.md
- Paleta de colores matcheada con design.pen (dark navy scheme + light cool-tinted)
- Regla 12 agregada en RULES.md (theme system)
- Actualizacion de BRANDBOOK.md con tabla completa de tokens por modo

## v0.1.1 (2026-02-12)

### Sistema RAG con Supabase Vector

- Incorporacion de RAG al MVP (antes estaba excluido)
- Separacion de **Instrucciones** (system prompt) y **Conocimiento** (RAG) como conceptos independientes
- Definicion de tabla `channel_knowledge` con pgvector (VECTOR(1536))
- Funciones SQL: `search_channel_knowledge`, `insert_channel_knowledge`
- Estrategia de chunking (~1000 chars, 200 overlap)
- Embeddings con OpenAI `text-embedding-3-small`
- API endpoints para CRUD de conocimiento por canal
- Documentacion: docs/RAG-KNOWLEDGE.md
- Actualizacion de ARCHITECTURE.md, DATA-MODELS.md, INDEX.md, CLAUDE.md

## v0.1.0 (2026-02-12)

### Inicio del Proyecto

- Definicion de arquitectura: Next.js 14+ / TypeScript / Supabase / Prisma
- Definicion de schema Prisma con 7 modelos
- Definicion de API routes (publicas, protegidas, super admin)
- Design system: colores, variables CSS, Tailwind config
- Estructura de carpetas del proyecto
- Documentacion inicial:
  - CLAUDE.md (contexto rapido)
  - docs/INDEX.md (indice maestro)
  - docs/ARCHITECTURE.md (stack y decisiones)
  - docs/DATA-MODELS.md (schema y relaciones)
  - docs/RULES.md (reglas de desarrollo)
  - docs/DATABASE-MIGRATIONS.md (guia migraciones)
  - brand/BRANDBOOK.md (identidad visual)

---

**Formato de entradas:**

```
## vX.Y.Z (YYYY-MM-DD)

### Titulo del Release

- Cambio 1
- Cambio 2
- Fix: descripcion del bug fix
```
