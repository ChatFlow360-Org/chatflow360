# ChatFlow360 - Changelog

> Versiones recientes. Para historial completo ver los archivos en [`changelog/`](./changelog/).

## v0.3.26 (2026-03-04)

### Custom Password Reset Flow + Security Hardening

- **`/api/auth/confirm` endpoint** — New server-side OTP verification route (`app/api/auth/confirm/route.ts`). Uses `supabase.auth.verifyOtp()` instead of delegating to Supabase's `/auth/v1/verify`. Fixes PKCE flow state expiration that caused `otp_expired` errors when Supabase's default redirect URL was used. Restricted to `recovery` OTP type only. Supports dynamic locale. Returns redirect to `/update-password` on success or `/forgot-password?error=otp_expired` on failure.
- **`sanitizeRedirectPath()`** — 6-layer open redirect protection on the confirm endpoint: allowlist of valid paths, strips protocol/host, blocks `//` double-slash, rejects non-relative paths, encodes special chars, enforces max length (200 chars).
- **`forgotPassword` rewritten** — `lib/auth/actions.ts` now uses `supabaseAdmin.auth.admin.generateLink({ type: "recovery" })` + Resend API instead of `supabase.auth.resetPasswordForEmail()`. Gives full control: bilingual emails, custom branded template, no dependency on Supabase email service or Supabase dashboard template editor.
- **`lib/email/reset-password.ts`** — New bilingual HTML email template for password reset. Header `#fafcfe` with color logo, CTA button in `#2f92ad` (brand teal), supports EN/ES locale, `escapeHtml()` applied to all variable fields including URLs.
- **`middleware.ts` fix** — Authenticated users can now reach `/update-password` after OTP verification. Previously the middleware redirected them to the dashboard before they could set a new password.
- **PWR-03: AMR check in `updatePassword`** — `lib/auth/actions.ts` now calls `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` before allowing a password change. Verifies `currentLevel === "aal1"` AND `nextLevel === "aal1"` on a recovery session. Returns `auth.errors.sessionExpired` if the session is not a valid recovery session, blocking password changes from regular dashboard sessions without a recovery token.
- **Update Password UX** — `app/[locale]/(auth)/update-password/page.tsx` enhanced with: eye toggle (show/hide) for both password fields, crypto-secure password generator (16 chars, uppercase + lowercase + digits + symbols, Fisher-Yates shuffle via `crypto.getRandomValues()`), and live validation checklist (8+ chars, uppercase, lowercase, number, symbol).
- **i18n** — New keys (EN + ES): `auth.updatePassword.generate`, `auth.updatePassword.pwMin8`, `auth.updatePassword.pwUppercase`, `auth.updatePassword.pwLowercase`, `auth.updatePassword.pwNumber`, `auth.updatePassword.pwSymbol`, `auth.errors.sessionExpired`.

---

## v0.3.25 (2026-03-04)

### Fullscreen Loader Overlay
- **FullscreenLoader component** (2bd656e) — Reusable fullscreen loading overlay with ChatFlow360 logo animation. Fixed overlay with `backdrop-blur-sm` + `bg-background/80`. Logo centered with breathing pulse animation (`cf360-breathe`). Spinning ring in CTA color (`cf360-spin`). Works in light and dark mode. Component: `components/ui/fullscreen-loader.tsx`. Keyframes in `globals.css`.
- **Locale switch loader** — `useTransition` wraps `router.replace()` in Header and Login page. Shows FullscreenLoader during the pending state of language switching (EN↔ES).
- **Logout loader** — Same `useTransition` in Header wraps `logout()` server action. Shows FullscreenLoader while signOut + redirect processes.

---

## v0.3.24 (2026-03-04)

### 2-Stage Chat Bubble (Teaser) + Widget UX Fixes
- **Chat Bubble Teaser** — New 2-stage widget bubble: collapsed state shows a circle with logo/icon, hover (desktop) or tap (mobile) expands a horizontal strip with teaser message + CTA button. Auto-show mode with configurable delay (5-60s). New "Chat Bubble" section in Settings > Widget with bilingual teaser text, CTA text, auto-show toggle, delay input, and 4 color pickers (bubble, icon, border, CTA button).
- **Starter Question Color** (81f44ea) — New independent color picker for starter question buttons. Uses one base color with derived tonalities (text = pure, border = 40% opacity, hover bg = 15%, subtle bg = 8%). Fallback to bubbleColor when not set. New field `starterQuestionColor` in `WidgetAppearance`.
- **Widget preview improvements** — Preview height adjusted (`calc(100vh - 260px)`). Mobile drawer uses flex layout (`fillHeight` prop) to fill available space without external scroll. Welcome screen content area scrolls internally when starter questions exceed space. Collapsed bubble preview matches real widget styling (solid color, no gradient, correct padding).
- **Clean close animation** (ba0db4b, 45a9696) — Chat panel fades out in side-panel form (keeps `--expanded` class). Standalone bubble removed from open/close flow — teaser is the only entry point. Teaser restores after 300ms fade-out delay. Zero flash of compact view.
- **Collapsed bubble nudge** (5aa3155) — Subtle peek animation every 4s (6px horizontal nudge with bounce). Starts after 3s delay, pauses when expanded.
- **Logo alt text fix** (71bd9be) — Removed "Logo" alt text from bubble images to prevent text showing while image loads.
- **Data layer** — 7 new fields in `WidgetAppearance`: `teaserTextEn/Es`, `teaserCtaEn/Es`, `teaserBgColor`, `teaserCtaColor`, `teaserAutoShow`, `teaserDelaySeconds`, `starterQuestionColor`. Zod validation + `resolveAppearance()` support. API returns `orgName` for `{{org_name}}` template replacement (server-side).
- **Character counters** (ca1b8ea) — Inline `{length}/{max}` counters on all 12 bilingual text inputs in Widget settings: teaserText (80), teaserCta (30), welcomeTitle (60), welcomeSubtitle (80), headerTitle (40), headerSubtitle (60). Only visible when field has content. Styled `text-[10px] text-muted-foreground/60 tabular-nums`.
- **i18n** — ~20 new keys (EN + ES) for bubble section, teaser fields, and starter question color.

---

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

## Indice de Todas las Versiones

> Cada version con titulo resumido de 1 linea. Detalle completo en los archivos enlazados.

### v0.3.x — [changelog/v0.3-early.md](./changelog/v0.3-early.md)

| Version | Fecha | Resumen |
|---------|-------|---------|
| v0.3.21 | 2026-03-03 | AI-Powered FAQ Import (Hybrid: URL + Text) |
| v0.3.20 | 2026-03-03 | RLS Policies for 3 Tables + Post-Chat Flow Reorder |
| v0.3.19 | 2026-03-03 | Bidirectional Bulk Translate Fix + Starter Questions Scope |
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
