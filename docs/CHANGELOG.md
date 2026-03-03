# ChatFlow360 - Changelog

> Versiones recientes. Para historial completo ver los archivos en [`changelog/`](./changelog/).

## v0.3.21 (2026-03-03)

### AI-Powered FAQ Import (Hybrid: URL + Text)
- **`POST /api/knowledge/extract-faqs`** — new authenticated endpoint. Accepts `{ source: "url", url }` or `{ source: "text", text }`. For URLs: server-side fetch with 10s timeout + User-Agent, strips HTML (script/style/nav/header/footer/aside), limits to 15K chars. For text: processes directly. Uses `gpt-4o-mini` (temperature 0.1, `response_format: json_object`) to extract up to 30 Q&A pairs. Post-processes: validates types, truncates question to 300 chars and answer to 1000 chars. Auth via `getCurrentUser()`, API key via `resolvePlatformApiKey()`. Zod validation with discriminated union.
- **`FaqImportDialog`** — new component (`components/knowledge/faq-import-dialog.tsx`). Two tabs: "From Text" (primary/default) and "From URL". Three phases: idle → extracting (with Loader2 spinner) → preview. Preview shows scrollable list of extracted FAQs with checkboxes. Auto-selects up to available slots (20 - existing count). Amber warning when extracted FAQs exceed available slots. "Import N FAQs" button adds selected items to the editor.
- **`FAQsForm` updated** — new `onImport` prop + "Import FAQs" button (outline muted style) alongside "Add FAQ" in both empty state and items view.
- **`Checkbox` UI component** — new `components/ui/checkbox.tsx` using Radix UI Checkbox primitive. Follows same pattern as Switch component.
- **i18n** — 16 new keys (EN + ES) under `settings.faqs.import`: dialogTitle, tabUrl, tabText, urlLabel, textLabel, extractButton, extracting, noFaqsFound, selectAll, slotWarning, importSelected, importSuccess, etc.

---

## v0.3.20 (2026-03-03)

### RLS Policies for 3 Tables + Post-Chat Flow Reorder (ce111ba)
- **RLS: `business_categories`** — enabled Row Level Security. `service_role` full access + `super_admin` SELECT only. All mutations via Prisma (`requireSuperAdmin()`). Migration: `supabase/migrations/20260303_rls_business_categories.sql`.
- **RLS: `leads`** — enabled Row Level Security. `service_role` full access + org-scoped SELECT/DELETE via `get_user_org_ids()`. No INSERT policy (lead creation via Prisma in `/api/widget/transcript`). No UPDATE (leads immutable). Migration: `supabase/migrations/20260303_rls_leads.sql`.
- **RLS: `prompt_pieces`** — enabled Row Level Security. `service_role` full access + `super_admin` SELECT + org members can read global rules (`category_id IS NULL, type='rule'`) and their org's assigned category pieces. All mutations via Prisma (`requireSuperAdmin()`). Migration: `supabase/migrations/20260303_rls_prompt_pieces.sql`.
- **Post-chat flow reorder** — widget now shows transcript form FIRST, then rating. Previously was rating → transcript. Skip button in transcript step goes to rating (if enabled) instead of done. Functions modified: `showPostChatFlow()`, `showRatingStep()`, `submitRating()`, `showTranscriptStep()`, `showTranscriptSuccess()`.
- **Verification** — code audit confirmed ZERO direct Supabase client access on all 3 tables (all via Prisma). Build passes. All dashboard pages + widget APIs respond correctly after RLS enablement.

---

## v0.3.19 (2026-03-03)

### Bidirectional Bulk Translate Fix + Starter Questions Scope (a24462f, 9bf3adf)
- **Fix: bidirectional translate** — `POST /api/translate` now groups texts by translation direction (`from-to` key) and makes parallel OpenAI calls per group. Previously used the first item's `from`/`to` for ALL items in the batch, causing wrong translations when mixing EN→ES and ES→EN in one request. Root cause: `fromLang`/`toLang` were derived from `texts[0]` only; now each group resolves its own language pair.
- **Starter questions in bulk translate** — Welcome Screen "Translate empty fields" button now includes starter questions when `useStarterQuestions` is ON. Each starter question's `textEn`/`textEs` pair is added to the translation batch alongside welcome title/subtitle. When toggle is OFF, starter questions are excluded.
- **Docs restructure** — All documentation fragmented to stay under 25 KB per file. CHANGELOG split into archives (`docs/changelog/v0.3-early.md`, `v0.2.md`, `v0.1.md`). ARCHITECTURE business logic section (506 lines) extracted to `docs/ARCHITECTURE-BUSINESS-LOGIC.md`. Security audit v0.2.2 archived to `docs/archive/`. INDEX.md and CLAUDE.md updated with new structure. New permanent rule: no `.md` > 25 KB.

---

## v0.3.18 (2026-03-03)

### AI-Powered Translate Buttons (60394c1, 757be47)
- **Per-field translate icons** — `<TranslateButton>` component (`components/ui/translate-button.tsx`). Ghost button with amber-colored `Languages` icon (`text-amber-500`). Placed next to each English/Spanish label in bilingual forms. Translates from the opposite field using OpenAI. Disabled when source field is empty.
- **Bulk "Translate empty fields" button** — amber full button (`bg-amber-500 hover:bg-amber-600 text-black`) in card headers. Scans all bilingual pairs in the card, identifies fields where one language is filled and the other empty, and translates them all in a single API call. Uses `useBulkTranslate()` hook (`lib/hooks/use-bulk-translate.ts`).
- **`POST /api/translate`** — new authenticated API route. Accepts batch of up to 20 text items with `from`/`to` language. Uses `gpt-4o-mini` (temperature 0.3) via `resolvePlatformApiKey()` (platform-level key, NOT per-org). System prompt preserves template variables (`{{visitor_name}}`, `{{org_name}}`). Zod validation: max 500 chars per text, max 20 items.
- **`resolvePlatformApiKey()`** — new function in `lib/openai/client.ts`. Resolves platform-level API key only (platform_settings → env var). Used for platform utilities that are not org-specific.
- **Amber styling pattern** — documented in RULES.md (Regla 16) and BRANDBOOK.md. Two tiers: full amber button for high-visibility actions (Take Control, Translate empty fields) and ghost amber icon for subtle per-field actions (translate icons).
- **Applied to 3 forms** — Widget > Welcome Screen, Widget > Texts, Post-Chat template editor. Starter Questions editor already had translate buttons (updated to amber style).
- **i18n** — 7 new keys (EN + ES): translateFromEn, translateFromEs, translateError, translateBulkSuccess, translateEmpty, translateBulkBtn (unused placeholder removed).

### Client View Hides Technical Settings (1508f15)
- **Technical Settings + Custom API Key hidden** — when Client View toggle is ON, the Technical Settings card (model, temperature, max tokens) and Custom OpenAI Key card are hidden in AI Settings. These are super_admin-only configuration that clients should not see or modify.

---

## v0.3.17 (2026-03-03)

### Starter Questions for Widget
- **New WELCOME card** — Settings > Widget restructured: welcome title/subtitle fields moved from TEXTS into a new "Welcome Screen" card (first position). TEXTS card now contains only header title/subtitle.
- **Starter Questions toggle** — "Use starter questions" switch with hint text. When ON, reveals the Starter Questions editor. When OFF, editor hidden and questions not rendered.
- **Drag-and-drop editor** — up to 5 bilingual questions (EN/ES) with `@dnd-kit` sortable rows. Each row: drag handle (GripVertical) + two inputs (side-by-side on desktop, stacked on mobile) + delete button. Counter shows `{n}/5`, "Add question" button auto-hides at max.
- **Context-aware preview** — `activeSection` state (`"welcome" | "texts" | "colors"`) switches the live preview between welcome screen mode (icon + title + subtitle + starter buttons) and chat view mode (sample messages + typing indicator). Controlled by `onFocus` on each Card.
- **Widget embed** — `chatflow360.js` renders starter question buttons on the welcome screen using `bubbleColor` as accent. Click sends the question text via `sendMessage()`. Buttons auto-disappear when any message is sent (existing `appendMessage()` removes `.cf360-welcome`).
- **Data model** — `StarterQuestion` interface (`id`, `textEn`, `textEs`). `WidgetAppearance` extended with `useStarterQuestions: boolean` and `starterQuestions: StarterQuestion[]`. Zod validation: max 5 items, max 100 chars per text. `resolveAppearance()` updated for boolean + array types.
- **Auto-save** — works without changes via existing `useAutoSave` hook (JSON snapshot comparison).
- **i18n** — 8 new keys (EN + ES): sectionWelcome, sectionWelcomeHint, useStarterQuestions, useStarterQuestionsHint, starterQuestionsLabel, starterPlaceholderEn/Es, addStarterQuestion.
- **Dependencies** — `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` added.

---

---

## Indice de Todas las Versiones

> Cada version con titulo resumido de 1 linea. Detalle completo en los archivos enlazados.

### v0.3.x — [changelog/v0.3-early.md](./changelog/v0.3-early.md)

| Version | Fecha | Resumen |
|---------|-------|---------|
| v0.3.16 | 2026-03-03 | Client View Toggle + Typography Minimum Size |
| v0.3.15 | 2026-03-03 | Rules UX Overhaul (Edit/Duplicate/Delete + Global/Specific split) |
| v0.3.14 | 2026-03-02 | Dynamic Global Rules Injection + Take Control Amber + Post-Chat on Close + Welcome Texts |
| v0.3.13 | 2026-03-02 | Satisfaction Rating Widget + Enhanced Recent Conversations + Take Control Button |
| v0.3.12 | 2026-03-02 | Prompt Templates Page (Modular Pieces + Global Rules + Template Picker) |
| v0.3.11 | 2026-03-01 | API Keys Management Page + Platform Settings |
| v0.3.10 | 2026-03-01 | Knowledge Base Categories (Business Hours structured form) |
| v0.3.9 | 2026-03-01 | Post-Chat Backend (Rating + Transcript email via Resend) + Typing Indicators |
| v0.3.8 | 2026-02-27 | Post-Chat Frontend (Rating + Transcript forms) + Dashboard Date Range |
| v0.3.7 | 2026-02-27 | Widget Appearance Customization (colors, header texts, live preview) |
| v0.3.6 | 2026-02-26 | Knowledge Base CRUD + RAG Backend (embeddings, semantic search) |
| v0.3.5.1 | 2026-02-25 | AI Settings Overhaul (structured prompt, preview, RBAC split) |
| v0.3.5 | 2026-02-24 | Widget Complete Rewrite (vanilla JS, realtime, handoff, mobile) |
| v0.3.4 | 2026-02-23 | Live Chat Backend (conversations, messages, AI response, widget endpoint) |
| v0.3.3 | 2026-02-23 | Realtime Messages + Agent Send + Dashboard Widgets (real data) |
| v0.3.2 | 2026-02-22 | Realtime Conversations + Supabase Realtime Integration |
| v0.3.1 | 2026-02-22 | Widget Features (maximize, end conv, timeout) + Conversation Auto-Cleanup |
| v0.3.0 | 2026-02-20 | Real Dashboard Data + Conversations CRUD + Date Range Filters |

### v0.2.x — [changelog/v0.2.md](./changelog/v0.2.md)

| Version | Fecha | Resumen |
|---------|-------|---------|
| v0.2.3 | 2026-02-19 | Security Hardening (4 CRIT + 6 HIGH/MED fixes) + Navigation Progress Bar |
| v0.2.2 | 2026-02-16 | Channel CRUD + Header dinamico + Deploy app.chatflow360.com |
| v0.2.1 | 2026-02-15 | CRUD Organizaciones + Usuarios + Context Selectors en Sidebar |
| v0.2.0 | 2026-02-15 | Autenticacion Real con Supabase Auth (login, logout, forgot password) |

### v0.1.x — [changelog/v0.1.md](./changelog/v0.1.md)

| Version | Fecha | Resumen |
|---------|-------|---------|
| v0.1.10 | 2026-02-14 | Login Page Polish (branding alignment with website) |
| v0.1.9 | 2026-02-14 | Login Page + Security Hardening (headers, CSP) |
| v0.1.8 | 2026-02-14 | Dashboard Metrics Refresh + Nav Cleanup |
| v0.1.7 | 2026-02-14 | UI Polish (interface design audit, light/dark fixes) |
| v0.1.6 | 2026-02-13 | Conversation Detail Panel (two-column layout + mobile drawer) |
| v0.1.5 | 2026-02-13 | Soporte Bilingue EN/ES con next-intl |
| v0.1.4 | 2026-02-12 | Light Mode Premium + Elevation System |
| v0.1.3 | 2026-02-12 | Dashboard UI Components + Date Filters |
| v0.1.2 | 2026-02-12 | Frontend Setup Inicial + Theme System |
| v0.1.1 | 2026-02-12 | Sistema RAG con Supabase Vector |
| v0.1.0 | 2026-02-12 | Inicio del Proyecto |

---

**Formato de entradas:**

```
## vX.Y.Z (YYYY-MM-DD)

### Titulo del Release

- Cambio 1
- Cambio 2
- Fix: descripcion del bug fix
```

**Regla de mantenimiento:** Cuando se agreguen nuevas versiones, la mas vieja de las 5 "recientes" se mueve al archivo correspondiente en `changelog/`.
