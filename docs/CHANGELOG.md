# ChatFlow360 - Changelog

> Versiones recientes. Para historial completo ver los archivos en [`changelog/`](./changelog/).

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

## Indice de Todas las Versiones

> Cada version con titulo resumido de 1 linea. Detalle completo en los archivos enlazados.

### v0.3.x — [changelog/v0.3-early.md](./changelog/v0.3-early.md)

| Version | Fecha | Resumen |
|---------|-------|---------|
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
