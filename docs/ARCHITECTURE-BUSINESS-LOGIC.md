# ChatFlow360 - Logica de Negocio Clave

> Seccion extraida de [ARCHITECTURE.md](./ARCHITECTURE.md) para optimizar carga de contexto.

## Logica de Negocio Clave

### IA: Instrucciones vs Conocimiento

El cliente configura **dos cosas separadas** desde el panel:

| Concepto | Donde se guarda | Que es |
|----------|----------------|--------|
| **Instrucciones** | `ai_settings.system_prompt` | Como se comporta la IA (tono, reglas, personalidad) |
| **Conocimiento** | `channel_knowledge` + pgvector | Info factual para RAG (FAQs, precios, servicios) |

#### Flujo de Respuesta IA

```
1. Visitante envia mensaje
2. Se genera embedding del mensaje (text-embedding-3-small)
3. Busqueda semantica en channel_knowledge (cosine similarity)
4. Se arma prompt: Instrucciones + Contexto relevante (RAG) + Mensaje
5. OpenAI genera respuesta con informacion real del negocio
6. Si detecta handoff keyword → takeover humano
```

> Ver detalle completo en [RAG-KNOWLEDGE.md](./RAG-KNOWLEDGE.md)

### Human Takeover Flow

1. Visitante envia mensaje con keyword de handoff (ej: "Quiero hablar con un representante")
2. Sistema verifica `channel.handoff_enabled` — si es false, ignora keywords
3. Sistema detecta keyword desde `channel.handoff_keywords` (o fallback a `ai_settings.handoff_keywords`)
4. Se actualiza `conversation.responder_mode` a `'human'`
5. Notificacion visual en dashboard (Supabase Realtime)
6. Notificacion por email al owner de la org
7. IA deja de responder, humano toma el control

### Herencia de Configuracion IA

> **Principio:** Parametros tecnicos (modelo, temperatura, tokens) los controla el super admin. Parametros de negocio (instrucciones, handoff, knowledge) los controla el org admin.

```typescript
const getChannelConfig = (channel: Channel, orgAiSettings: AiSettings) => ({
  // Parametros tecnicos — SIEMPRE desde AiSettings (super admin)
  model: orgAiSettings.model,
  temperature: orgAiSettings.temperature,
  maxTokens: orgAiSettings.maxTokens,
  provider: orgAiSettings.provider,

  // Parametros de negocio — channel override o fallback a org
  systemPrompt: channel.systemPrompt ?? orgAiSettings.systemPrompt,
  handoffEnabled: channel.handoffEnabled,
  handoffKeywords: channel.handoffKeywords.length > 0
    ? channel.handoffKeywords
    : orgAiSettings.handoffKeywords,
});
```

> Ver detalle completo de control de acceso en [DATA-MODELS.md](./DATA-MODELS.md#control-de-acceso-por-modelo)

### AI Settings Page

**Ruta:** `/[locale]/settings/ai`

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Server page | `app/[locale]/(dashboard)/settings/ai/page.tsx` | Fetch AI settings por org (super_admin via cookie, regular user via membership) |
| Client component | `AiSettingsClient` | Tabs (Instructions + Knowledge Base), form state, `useActionState` |
| Server action | `upsertAiSettings` en `lib/admin/actions.ts` | Zod validation, upsert en `ai_settings` tabla |

**Layout:** dos columnas — contenido principal (tabs) a la izquierda, Quick Settings sidebar (model, temperature, max tokens, handoff toggle) a la derecha. Preview widget estilo WhatsApp para previsualizar el comportamiento de la IA.

**RBAC Split — Business vs Technical params:**

| Param category | Who can edit | Fields |
|----------------|-------------|--------|
| **Business params** | super_admin + org_admin | `systemPrompt`, `handoffKeywords`, `handoffEnabled` |
| **Technical params** | super_admin only | `model`, `temperature`, `maxTokens`, `encryptedApiKey` / `apiKeyHint` |

- `upsertAiSettings` server action checks `isSuperAdmin` — if false, only business params are written to DB; technical params are silently ignored
- **Quick Settings sidebar:** hidden for org_admin. Only super_admin can see and edit this section (model, temperature, max tokens, human takeover switch).

**Default handoff keywords** (`lib/chat/defaults.ts`):

- 19 bilingual keywords (10 EN + 9 ES) pre-loaded for new orgs
- AI Settings UI pre-populates textarea with defaults when no custom keywords exist
- `createOrganization` server action uses `DEFAULT_HANDOFF_KEYWORDS` when creating initial AiSettings

### Knowledge Categories — Structured Knowledge Entries

The `organization_knowledge` table was extended with two columns to support structured, category-specific knowledge types alongside free-form text:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `category` | `VARCHAR(50) NOT NULL` | `'free_text'` | Classifies the entry (`free_text`, `business_hours`, `pricing`, `faq`, etc.) |
| `structured_data` | `JSONB` | `NULL` | Parsed form data for structured categories; NULL for free_text |

**Indexing strategy:**

- `idx_org_knowledge_category` — composite index on `(organization_id, category)` for fast filtered reads
- `idx_org_knowledge_unique_category` — partial unique index on `(organization_id, category) WHERE category != 'free_text'` — enforces at most one entry per structured category per org (e.g., one `business_hours` record), while allowing unlimited `free_text` entries

**Business Hours Form (`components/knowledge/business-hours-form.tsx`):**

The first structured category is `business_hours`, backed by a purpose-built React form component:

- Weekly schedule grid (`DayRow` × 7) with open/close time inputs and per-day toggle switches
- Smart "Copy Monday to Tue–Fri" button — appears only when Monday is open and at least one weekday differs; uses `useMemo` for efficient comparison
- Timezone selector (US zones via shadcn Select)
- Collapsible holidays section with US federal holiday quick-add presets (bilingual EN/ES via `US_HOLIDAY_PRESETS`)
- Additional notes textarea (500 char limit)
- Mobile-responsive: short day labels (`Mon`, `Tue`) on narrow viewports via `sm:hidden`/`hidden sm:inline`

**Data model:** `BusinessHoursData` interface in `lib/knowledge/business-hours.ts` — `schedule` (record keyed by `DayOfWeek`), `timezone`, `holidays: HolidayEntry[]`, `notes?`.

**Migration:** `supabase/migrations/20260226_add_knowledge_categories.sql` — backward compatible; existing rows receive `'free_text'` default with no data loss.

### Prompt Templates Page (v0.3.12 — Modular Pieces + Global Rules)

**Ruta:** `/[locale]/prompt-templates`

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Server page | `app/[locale]/(dashboard)/prompt-templates/page.tsx` | Fetch BusinessCategories, PromptPieces, global rules; guard: super_admin only |
| Client component | `prompt-templates-client.tsx` | Two tabs: "By Category" (2-panel layout with category sidebar + pieces by type) and "Global Rules" (CRUD for mandatory rules) |
| Server actions | `lib/admin/actions.ts` | Category CRUD (`createBusinessCategory`, etc.), Piece CRUD (`createPromptPiece`, etc.), Global Rule CRUD (`createGlobalRule`, `updateGlobalRule`, `deleteGlobalRule`) |

**Two tabs:**
- **By Category** — left sidebar lists `BusinessCategory` items with piece counts. Right panel shows `PromptPiece` items grouped by type (Agent Roles, Rules, Personalities) with inline create/edit/delete.
- **Global Rules** — CRUD for `PromptPiece` items with `categoryId = null`. These rules apply to ALL organizations. Empty state with Globe icon.

**Access control:** super_admin only — page and all CRUD actions are guarded. Org admins see global rules as locked items in AI Settings.

**Global Rules in AI Settings:** Org admins see global rules above their custom rules with Shield icon (amber), no remove button. Hint text explains these are platform-level rules. On save, global rules are prepended to `promptStructure.rules` so `composeSystemPrompt()` includes them.

**Template Picker (Sheet Drawer) in AI Settings:** The "Browse templates" button in AI Settings opens a right-side Sheet panel scoped to the org's `BusinessCategory`. Pieces are listed by type. Apply behavior is type-dependent: `role`/`personality` pieces replace the field and close the drawer; `rule` pieces append individually and keep the drawer open, or can be multi-selected via checkboxes and bulk-applied via a sticky "Apply N rules" footer button (closes drawer). Rules already present in the prompt show an "Added" indicator and cannot be re-selected. A "Clear All" destructive button (visible only when custom rules exist) removes all non-global rules after ConfirmDialog confirmation.

**Sidebar:** "Prompt Templates" item appears in the admin section of the sidebar, positioned before "API Keys".

#### RLS on prompt_templates

Row Level Security is enabled on `prompt_templates` as a defense-in-depth measure:

- **Prisma is unaffected** — connects as postgres superuser (bypasses RLS), so all dashboard CRUD operations work as before
- **`service_role_full_access`** policy — `FOR ALL TO service_role USING (true)` — allows Supabase admin operations
- **`super_admin_select`** policy — `FOR SELECT TO authenticated` — limits direct PostgREST reads to users where `users.is_super_admin = true`
- No INSERT/UPDATE/DELETE policies for the `authenticated` role — direct PostgREST mutations are intentionally blocked; all writes go through Prisma server actions with `requireSuperAdmin()` guard

Migration: `supabase/migrations/20260226_rls_prompt_templates.sql`

### Widget Embed

```html
<script src="https://app.chatflow360.com/widget/chatflow360.js"
  data-key="PUBLIC_KEY" data-lang="es" data-color="#2f92ad" defer></script>
```

| Atributo | Requerido | Default | Descripcion |
|----------|-----------|---------|-------------|
| `data-key` | Si | — | publicKey del canal (UUID) |
| `data-lang` | No | browser detect | "en" o "es" |
| `data-color` | No | #2f92ad | Color primario del widget |
| `data-position` | No | "right" | "right" o "left" |

**Implementacion:** vanilla JS IIFE (~770 lineas), DOM injection directa (no iframe), clases `.cf360-`, z-index maximo. Persistencia via localStorage (visitorId + conversationId). Polling cada 5s en modo humano. Mobile fullscreen <480px.

#### Widget Features (v0.3.1)

**Maximize/Minimize toggle**

- Boton en el header (izquierda de X), solo visible en desktop (hidden en mobile)
- Modo compacto: 380x520px. Modo expandido: 420px ancho, 100vh alto (panel derecho full height)
- Icono alterna entre expand y collapse segun estado. Auto-colapso al cerrar el widget.

**End Conversation**

- Badge oscuro (#0f1c2e) debajo del input, alineado izquierda. Padding area input: `12px 16px 6px`; padding badge: `0 16px 0`
- Click muestra dialogo de confirmacion ("Are you sure?" / "¿Estas seguro?") con Yes/No
- "Yes" limpia `conversationId` + `visitorId` del localStorage y resetea a welcome screen

**Session Auto-Timeout (2 horas)**

- Timestamp de ultimo mensaje guardado en localStorage: `cf360_conv_ts_` + publicKey
- Actualizado en cada `sendMessage()`. Verificado al iniciar el widget.
- Si han pasado mas de 2h, la conversacion expirada se descarta silenciosamente → welcome screen

### Widget Appearance Customization (v0.3.7)

The widget's visual appearance (colors, header texts) is fully customizable per channel from the dashboard. Settings are stored in the `Channel.config` JSONB column under a `widgetAppearance` nested object — no schema migration was needed.

**Configuration flow:**

```
Dashboard form → upsertWidgetAppearance (Zod validation) → Channel.config.widgetAppearance (JSONB)
Widget JS init → GET /api/widget/config?key=PUBLIC_KEY → applies colors + header texts dynamically
```

**API endpoint:** `GET /api/widget/config?key=PUBLIC_KEY` — public, returns the resolved appearance configuration for the given channel. The widget JS fetches this at initialization and overrides default styles.

**Customizable properties:** header background color, chat bubble color, visitor message color, AI message color, send button color, header title (EN + ES), header subtitle (EN + ES).

**Dashboard UI:** 60/40 split layout — form on left, live React preview widget on right (sticky on desktop, FAB + Vaul drawer on mobile).

### 2-Stage Chat Bubble — Teaser (v0.3.24)

The widget uses a 2-stage bubble instead of a simple floating button:

**Stage 1 — Collapsed:** A circle with logo (or SVG icon fallback) positioned at the screen edge. Subtle nudge animation every 4s draws attention.

**Stage 2 — Expanded:** On hover (desktop) or first tap (mobile), the bubble expands into a horizontal strip with teaser message + CTA button. Close X dismisses (session only).

**Auto-show mode:** When enabled, the teaser auto-expands after a configurable delay (5-60s) without user interaction.

**Opening flow:** Teaser hides → side-panel opens (position:fixed, full viewport height). On close, panel fades out keeping expanded form (no compact flash), then teaser restores after 300ms. The standalone bubble element is never shown — the teaser is the only entry point.

**Configuration fields** (in `Channel.config.widgetAppearance`):
- `teaserTextEn/Es` — teaser message (supports `{{org_name}}` template, replaced server-side)
- `teaserCtaEn/Es` — CTA button text
- `teaserBgColor`, `teaserCtaColor` — accent colors
- `teaserAutoShow`, `teaserDelaySeconds` — auto-expand behavior
- `starterQuestionColor` — independent color for starter question buttons (tonalities derived from single base)

**Dashboard UI:** New "Chat Bubble" section in Settings > Widget (before Welcome Screen). Color pickers, bilingual fields with per-field translate buttons, auto-show toggle with conditional delay input.

### Post-Chat Experience (v0.3.8 frontend / v0.3.9 backend)

Post-chat settings control what happens after a conversation ends: visitor rating collection, transcript email delivery, and email branding customization. Settings are stored in `Channel.config` JSONB under `postChatSettings`, alongside `widgetAppearance`.

**Post-chat flow (implemented v0.3.9):**

```
Conversation ends in widget
    → End conversation confirmation overlay (Yes / No)
    → Rating step (if enableRating) — 1-5 star UI, hover/click highlighting, Skip button
        → POST /api/widget/rating — stores rating in conversations.rating (SmallInt)
    → Transcript step (if enableTranscript) — name + email form
        → POST /api/widget/transcript — fetches messages + config, renders HTML, sends via Resend
    → Success / error state → new conversation
```

**Configuration stored in `Channel.config.postChatSettings`:**

| Field | Type | Purpose |
|-------|------|---------|
| `enableTranscript` | boolean | Toggle transcript email feature |
| `enableRating` | boolean | Toggle rating prompt feature |
| `ccEmail` | string | Organization CC email for transcript copies |
| `logoUrl` | string | Logo URL for email header branding |
| `emailSubjectEn` / `emailSubjectEs` | string | Bilingual custom email subject line |
| `emailGreetingEn` / `emailGreetingEs` | string | Bilingual custom greeting text |
| `emailClosingEn` / `emailClosingEs` | string | Bilingual custom closing text |
| `emailHeaderColor` | string (hex) | Email header background color |
| `emailFooterTextEn` / `emailFooterTextEs` | string | Bilingual custom footer text |

**Template variables** supported in subject, greeting, closing, and footer fields: `{{visitor_name}}`, `{{org_name}}`, `{{date}}`.

**Types + validation:** `lib/widget/post-chat.ts` — `PostChatSettings` interface, Zod schema (`postChatSchema`), default values (`DEFAULT_POST_CHAT`), and `resolvePostChat()` resolver.

**Email renderer:** `lib/email/transcript.ts` — `renderTranscriptEmail()` function. Responsive table-based HTML layout (email client compatible). Branded header with logo image or org name fallback. Message bubbles with sender label (visitor name / AI / Agent) and timestamp. `escapeHtml()` utility for XSS safety in email content.

**Resend integration:** `resend` npm package. Domain `chatflow360.com` verified. Emails sent `from: "{orgName} <noreply@chatflow360.com>"`. CC to `ccEmail` if configured. `RESEND_API_KEY` env var required.

**Widget config endpoint:** `GET /api/widget/config` returns `{ appearance, postChat }` where `postChat` exposes only `{ enableRating, enableTranscript }` — no email template details are sent to the browser.

**Server action:** `upsertPostChatSettings` — validates with Zod, persists to `Channel.config` JSONB.

**Dashboard UI:** 4th tab in AI Settings page ("Post-Chat"), with 60/40 split layout (form + live email preview), matching the Widget tab pattern.

**Remaining:** Supabase Storage integration for logo upload (currently accepts URL string as fallback).

### Conversation Auto-Cleanup — Modelo de 3 Capas (v0.3.1)

**Enfoque hibrido:** tres capas complementarias para garantizar que las conversaciones cerradas en el widget se reflejen en el dashboard y en la DB. Ninguna capa depende de las otras.

| Capa | Mecanismo | Timing | Proposito |
|------|-----------|--------|-----------|
| 1 — Widget PATCH | `closeConversationApi()` → `PATCH /api/chat/[id]` | Inmediato (accion del usuario) | Sincroniza cierre widget → DB al instante |
| 2 — Client timeout | localStorage timestamp check (`cf360_conv_ts_`) | Al proximo open (2h TTL) | UX: welcome screen si la sesion expiró sin cierre manual |
| 3 — pg_cron | `close_stale_conversations()` cada 6h | Periodico (safety net) | DB cleanup para convs sin cliente activo (browser cerrado, crash, etc.) |

**Capa 1 — PATCH desde widget:**

```typescript
// public/widget/chatflow360.js
async function closeConversationApi(conversationId) {
  await fetch(`${API_BASE}/api/chat/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId })
  });
  // fire-and-forget: no await, no error blocking UX
}
```

Invocado en 2 momentos: (a) usuario confirma "End conversation", (b) session timeout auto-reset.

**Capa 3 — pg_cron (safety net):**

```sql
-- Funcion SQL en Supabase
CREATE OR REPLACE FUNCTION close_stale_conversations()
RETURNS void AS $$
  UPDATE conversations
  SET status = 'closed', updated_at = NOW()
  WHERE status IN ('open', 'pending')
    AND last_message_at < NOW() - INTERVAL '2 hours';
$$ LANGUAGE sql;

-- Schedule: cada 6 horas
SELECT cron.schedule('close-stale-conversations', '0 */6 * * *',
  'SELECT close_stale_conversations()');
```

Comandos utiles:

```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5; -- historial
SELECT cron.unschedule('close-stale-conversations');                  -- desactivar
```

### Supabase Realtime — Live Dashboard Updates

The Conversations page uses Supabase Realtime to reflect new and updated conversations without requiring a full page reload.

**Architecture:**

```
Supabase postgres_changes event (RLS-filtered)
    → useRealtimeConversations hook (client, with setAuth JWT)
        → debounced router.refresh() (300ms)
            → Next.js triggers server re-fetch
                → Prisma query returns updated Conversation[]
                    → React re-renders ConversationsClient

Safety net: 30s polling timer (visibility-aware)
    → router.refresh() every 30s while tab is visible
```

**Dual mechanism: Realtime + Polling safety net**

Supabase Realtime is the primary update path, but a 30-second polling timer runs alongside as a safety net. The polling timer is visibility-aware: it pauses when the tab is hidden (`document.visibilitychange`) and resumes when the tab regains focus. This ensures the dashboard stays current even if the WebSocket connection silently drops.

**RLS compatibility: setAuth + Denormalization**

Supabase Realtime uses an internal engine called **walrus** to evaluate RLS policies on each event before delivering it to the subscriber. Two critical constraints apply:

1. **`@supabase/ssr`'s `createBrowserClient` does not propagate the auth JWT to the Realtime WebSocket** (supabase-js Issue #1304). The fix is to call `supabase.realtime.setAuth(session.access_token)` explicitly.
2. **Walrus cannot evaluate complex RLS policies with JOINs.** A policy like `conversations.channel_id IN (SELECT id FROM channels WHERE organization_id IN (...))` silently drops events. The fix is to **denormalize `organization_id` directly onto the `conversations` table**, enabling a simple column-level check: `organization_id = ANY(SELECT get_user_org_ids())`.

**Hook: `hooks/use-realtime-conversations.ts`**

```typescript
// 1. Set JWT on Realtime WebSocket
const { data: { session } } = await supabase.auth.getSession();
if (session) supabase.realtime.setAuth(session.access_token);

// 2. Re-set auth on token refresh, cleanup on sign out
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED' && session) {
    supabase.realtime.setAuth(session.access_token);
  }
  if (event === 'SIGNED_OUT') {
    supabase.removeAllChannels();
  }
});

// 3. Subscribe with UUID-validated filter
const channel = supabase
  .channel('conversations-live')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'conversations',
    filter: orgId ? `organization_id=eq.${orgId}` : undefined
  }, () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => router.refresh(), 300);
  })
  .subscribe();

// 4. 30s polling safety net (visibility-aware)
const poll = setInterval(() => {
  if (!document.hidden) router.refresh();
}, 30000);
```

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| `router.refresh()` instead of local state update | Server component owns the data; client should not duplicate server logic |
| 300ms debounce | Prevents multiple rapid refreshes when a conversation + message are both inserted in quick succession |
| `postgres_changes` (not broadcast) | Works without custom server code — Supabase listens to the DB WAL directly |
| `useRef` for debounce timer | Avoids stale closure issues with `setTimeout` inside event callbacks |
| `setAuth()` on mount + token refresh | `@supabase/ssr` does not propagate JWT to Realtime WebSocket (supabase-js #1304) |
| Denormalized `organization_id` on conversations | Walrus silently drops events when RLS policy requires JOINs |
| 30s polling safety net | Guards against silent WebSocket drops; pauses when tab is hidden |
| UUID validation on filter IDs | Prevents injection in Supabase channel filter strings |

**Live indicator:** A green pulse dot + "Live" text badge renders in the Conversations page header when the Realtime subscription is active. This gives operators a clear signal that the view is auto-updating.

**Fallback:** The existing manual refresh button (`useTransition` + `router.refresh()`) remains as an immediate fallback. The 30s polling timer provides automatic recovery.

### Supabase Realtime — Live Conversation Detail (Messages)

The Conversation Detail panel uses a second Realtime hook to display new messages in real-time as they arrive (e.g., AI responses, agent messages). Uses the same setAuth + polling safety net pattern as the conversations hook.

**Architecture:**

```
Supabase postgres_changes INSERT on messages table (RLS-filtered)
    → useRealtimeMessages hook (client, setAuth JWT, filtered by conversation_id)
        → debounced callback (300ms)
            → re-fetch messages via server action
                → React re-renders message list
                    → auto-scroll to bottom via scrollIntoView

Safety net: 30s polling (visibility-aware, same as conversations)
```

**Hook: `hooks/use-realtime-messages.ts`**

```typescript
// Same setAuth + onAuthStateChange pattern as conversations hook
const { data: { session } } = await supabase.auth.getSession();
if (session) supabase.realtime.setAuth(session.access_token);

const realtimeChannel = supabase
  .channel(`messages-realtime:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',               // Only new messages (not updates/deletes)
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, () => {
    debouncedCallback();           // Triggers parent's re-fetch
  })
  .subscribe();

// 30s polling safety net + cleanup on unmount
```

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| `INSERT` only (not `*`) | Messages are append-only; no need to listen for UPDATE/DELETE |
| `callbackRef` pattern | Keeps the callback fresh across re-renders without re-subscribing |
| `enabled` flag | Allows pausing the subscription (e.g., when panel is closed) |
| `scrollIntoView({ behavior: "smooth" })` | Auto-scrolls chat to latest message after each fetch |
| `setAuth()` + `onAuthStateChange` | Same RLS compatibility pattern as conversations hook |
| 30s polling safety net | Ensures messages appear even if WebSocket silently disconnects |

**Dual Realtime hooks (summary):**

| Hook | Table | Events | Scope | Used in |
|------|-------|--------|-------|---------|
| `useRealtimeConversations` | `conversations` | INSERT, UPDATE, DELETE | org-wide or channel-scoped | Conversations list page |
| `useRealtimeMessages` | `messages` | INSERT only | single conversation_id | Conversation detail panel |

Both hooks share the same pattern: `setAuth()` on mount, `onAuthStateChange` for token refresh, UUID validation on filter IDs, and a 30s visibility-aware polling safety net.

### Typing Indicators (v0.3.9)

Bidirectional typing indicators between agents (dashboard) and visitors (widget) via Supabase Realtime **Broadcast** channel. Does not use `postgres_changes` — no DB writes are needed for ephemeral typing state.

**Hook: `hooks/use-typing-indicator.ts`**

```typescript
// Bidirectional: each side listens for the opposite role
const remoteRole = role === "agent" ? "visitor" : "agent";

channel
  .on("broadcast", { event: "typing" }, (payload) => {
    const data = payload.payload as { role?: string; isTyping?: boolean };
    if (data.role !== remoteRole) return;   // Ignore own broadcasts
    setIsRemoteTyping(data.isTyping ?? false);
    // Auto-clear after 3s timeout if no stop event received
  })
  .subscribe();
```

**Key design decisions:**

| Decision | Rationale |
|----------|-----------|
| Broadcast (not postgres_changes) | Typing state is ephemeral — no DB persistence needed, lower latency |
| 2s throttle on outgoing events | Prevents flooding; one event per keystroke burst |
| 3s auto-timeout on remote typing | Guards against missed stop events (tab close, network drop) |
| `config: { broadcast: { self: false } }` | Prevents echoing own events back to sender |
| `channelName` from HMAC | Derived from conversation ID for uniqueness; passed as prop to hook |

**UI:** Wave-dots CSS animation rendered in the conversation detail panel when `isRemoteTyping === true`.

### API Key Encryption

**Algoritmo:** AES-256-GCM (Node.js crypto nativo, zero dependencies)

```
encrypt(apiKey) → base64[IV(12B) + authTag(16B) + ciphertext]
decrypt(base64)  → plaintext apiKey
maskApiKey(key)  → "sk-...aBcD" (display only)
```

**Resolucion de key (3 niveles):**
1. Per-org `AiSettings.encryptedApiKey` → decrypt → usar
2. Global `PlatformSettings[openai_api_key]` → decrypt → usar
3. `process.env.OPENAI_API_KEY` → fallback

**Seguridad:** Keys encriptadas at rest en DB, nunca enviadas al browser (solo `apiKeyHint`). `ENCRYPTION_KEY` en env var (64 hex chars = 32 bytes). IV aleatorio por operacion.

### Manejo de Idiomas (i18n)

**Libreria:** next-intl v4 con URL-based locale routing

| Aspecto | Implementacion |
|---------|---------------|
| **Routing** | URL prefix: `/en/dashboard`, `/es/conversations` |
| **Deteccion** | Middleware auto-detecta idioma del browser |
| **Persistencia** | Cookie `NEXT_LOCALE` (automatica) |
| **Traducciones** | `lib/i18n/messages/{en,es}.json` (~160+ strings) |
| **Navegacion** | `Link`, `useRouter` de `@/lib/i18n/navigation` (locale-aware) |
| **Componentes** | `useTranslations("namespace")` + `useLocale()` |
| **Formatos** | `formatRelativeTime(date, locale)`, `toLocaleDateString(locale)` |

- **UI del App:** Toggle EN/ES en header, cambia URL y toda la UI
- **Widget:** Param opcional `data-lang`, default: deteccion del browser
- **Respuestas IA:** Siguen el idioma de la conversacion
- **Futuro:** `users.preferred_language` en DB para persistencia server-side
