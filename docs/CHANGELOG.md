# ChatFlow360 - Changelog

> Versiones recientes. Para historial completo ver los archivos en [`changelog/`](./changelog/).

## v0.3.23 (2026-03-04)

### UX Polish: Policies Presets, Knowledge Limits, Dashboard Truncation
- **Quick-add policy presets** (fca6f65) — Badge chips for 11 common policies in two groups: "Most Common" (Privacy, Terms, Cookie, Accessibility, Refund, Shipping) and "Others" (FTC, HIPAA, CCPA, COPPA, Data Protection). Bilingual names (EN/ES). Auto-hide when already added. `POLICY_PRESETS` array in `lib/knowledge/policies.ts`. Policies dialog widened to `max-w-5xl`.
- **Knowledge Base dialog improvements** (7aec654, 81d741c) — Add/Edit Knowledge dialogs widened to `max-w-5xl`. Content character limit reduced from 4000 to 2000 (client `maxLength` + Zod server-side validation in `actions.ts`). Character counter label updated to match.
- **Additional Instructions char counter** (d2130f9) — Added `{count}/2000 characters` counter below the Additional Instructions textarea so users can track usage.
- **Super Admin "All organizations"** (ba10923) — Users page now shows "All organizations" instead of "No organization" for Super Admin users, correctly reflecting their platform-wide access.
- **Dashboard message truncation** (521fa9a, 44687ab) — Long last-message previews in Recent Conversations no longer expand the grid. Fixed with `overflow-hidden` on the Card + `minmax(0,1fr)` grid column (prevents `white-space: nowrap` content from inflating the `auto` minimum of `1fr`).
- **i18n** — new keys (EN + ES): `quickAddCommon`, `quickAddOther`, `additionalInstructionsCharCount`, `allOrganizations`. Updated `knowledge.charCount` to 2000.

---

## v0.3.22 (2026-03-03)

### Multi-URL FAQ Import + Text/HTML Paste + Faithful Extraction
- **Multi-URL support** (febf684) — FAQ import accepts up to 5 URLs. Zod schema: `urls: z.array(z.string().url().max(2048)).min(1).max(5)`. Parallel fetching via `Promise.allSettled` with per-URL char budget (`Math.floor(15000 / urls.length)`). Failed URLs reported as `warnings`; if all fail returns 422.
- **Channel URL pre-population** — first URL input auto-filled with `channel.name` (website URL). Threaded via `page.tsx` → `ai-settings-client.tsx` → `faq-import-dialog.tsx` as `channelWebsiteUrl` prop.
- **Dynamic URL list UI** — `urls: string[]` state with `addUrl()`, `removeUrl(index)`, `updateUrl(index, value)`. Trash2 delete button (visible when >1 URL). "Add another URL" (Plus icon) hidden at max.
- **AI disclaimer banner** (40ffa29) — amber banner with Info icon in preview phase. Dark mode compatible (`dark:border-amber-400/30 dark:bg-amber-950/20`).
- **HTML entity decoding fix** (c2060fa) — `stripHtml()` now decodes 11 named entities (`&mdash;`, `&ndash;`, `&hellip;`, `&rsquo;`, `&ldquo;`, etc.) plus generic numeric entities (`&#8212;`, `&#x2014;`). Previously only decoded 6 basic entities, causing text after em-dashes to be cut off.
- **"From Text / HTML" tab** (411af3a) — "From Text" tab renamed to "From Text / HTML". Label: "Paste Content or HTML". Hint explains users can paste plain text or raw HTML from browser inspector. Icon changed to `FileCode2`. Auto-detects HTML (≥3 tags) and runs `stripHtml()` server-side before sending to GPT.
- **Source-specific prompts** (43f99a1, b2bd29b) — Two extraction modes: Text/HTML source preserves original wording verbatim (only summarizes if answer exceeds 800 chars). URL source may summarize noisy scraped content. Answer limit raised from 500 to 800 chars. Bullet points/lists converted to flowing text with commas/semicolons.
- **i18n** — new/updated keys (EN + ES): `addUrl`, `urlFetchWarning` (ICU plural), `aiDisclaimer`, `tabText` ("From Text / HTML"), `textLabel` ("Paste Content or HTML"), `textHint`, `textPlaceholder`, `dialogDescription`.

---

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

---

## Indice de Todas las Versiones

> Cada version con titulo resumido de 1 linea. Detalle completo en los archivos enlazados.

### v0.3.x — [changelog/v0.3-early.md](./changelog/v0.3-early.md)

| Version | Fecha | Resumen |
|---------|-------|---------|
| v0.3.18 | 2026-03-03 | AI-Powered Translate Buttons + Client View hides Technical Settings |
| v0.3.17 | 2026-03-03 | Starter Questions for Widget (drag-and-drop, bilingual, welcome screen) |
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
