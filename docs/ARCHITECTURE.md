# ChatFlow360 - Arquitectura

> Stack completo, estructura del proyecto y decisiones tecnicas.

## Vision General

**ChatFlow360** es una plataforma SaaS de Live Chat multi-tenant con respuestas potenciadas por IA. Mercado objetivo: negocios de Miami con audiencia bilingue (EN/ES).

### Flujo Principal

```
Super Admin (platform owner)
    └── Crea Organizations
            ├── AiSettings (1:1) - config IA por defecto
            └── Channels (1:N) - inicialmente: website widget
                    ├── system_prompt (override de org)
                    └── Conversations (1:N)
                            └── Messages (1:N)
```

## Tech Stack

| Capa | Tecnologia | Proposito |
|------|-----------|-----------|
| Framework | Next.js 16 (App Router) | SSR, API routes, RSC |
| Lenguaje | TypeScript (strict) | Type safety |
| Base de datos | Supabase (PostgreSQL) | Storage principal |
| ORM | Prisma | Queries, CRUD, migraciones |
| Auth | Supabase Auth | JWT, sesiones |
| Realtime | Supabase Realtime | Subscripciones en vivo |
| IA | OpenAI API (GPT-4o-mini) | Respuestas automaticas |
| RAG | Supabase Vector (pgvector) | Embeddings y busqueda semantica |
| Embeddings | OpenAI text-embedding-3-small | Generacion de vectores |
| i18n | next-intl v4 | Bilingue EN/ES, URL routing |
| Hosting | Vercel | Deploy, edge functions — https://app.chatflow360.com |
| Futuro | n8n (Railway) | Automatizaciones laterales (CRM, email, Slack — NO flujo core de chat) |

### Prisma + Supabase: Enfoque Hibrido

| Caso de Uso | Herramienta | Razon |
|-------------|-------------|-------|
| Queries, CRUD, Joins | Prisma | Mejor DX, type safety |
| Migraciones | Prisma Migrate | Robusto, versionado |
| Realtime subscriptions | Supabase SDK | Prisma no lo soporta |
| Auth | Supabase Auth | Built-in, manejo JWT |
| RAG / Vectores | Supabase Vector (pgvector) via SQL | Prisma no soporta tipo VECTOR |
| Storage (futuro) | Supabase Storage | Archivos, imagenes |

## Estructura del Proyecto

```
chatflow360-dashboard/
├── app/
│   ├── layout.tsx              # Root layout minimal (font + body)
│   ├── [locale]/               # Locale segment (en, es)
│   │   ├── layout.tsx          # NextIntlClientProvider + ThemeProvider
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx      # DashboardShell (sidebar + header)
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── conversations/  # Conversations page (server) + client
│   │   │   ├── organizations/  # CRUD organizations (super_admin)
│   │   │   ├── users/          # CRUD users (super_admin)
│   │   │   └── settings/
│   │   │       ├── ai/         # AI Settings (server page + client component)
│   │   │       └── api-keys/   # API Key management (super_admin only)
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts        # POST — widget chat + AI response
│   │   │   └── [id]/
│   │   │       └── route.ts    # GET — conversation history
│   │   ├── auth/
│   │   │   └── callback/       # Supabase auth callback (code exchange)
│   │   └── webhooks/           # Future: WhatsApp, Messenger
├── components/
│   ├── ui/                     # Shadcn components
│   ├── chat/                   # ConversationCard, ConversationDetail, ChatMessage, Filters
│   ├── dashboard/              # StatCard, TopPages, RecentConversations
│   └── layout/                 # Sidebar, Header, DashboardShell
├── lib/
│   ├── db/
│   │   └── prisma.ts           # Prisma client singleton
│   ├── api/
│   │   ├── cors.ts             # CORS headers + OPTIONS handler
│   │   └── validate.ts         # Zod schemas for widget API
│   ├── chat/
│   │   ├── ai.ts               # generateAiResponse (OpenAI + context building)
│   │   ├── config.ts           # resolveChannelConfig (herencia channel → org)
│   │   ├── defaults.ts         # DEFAULT_HANDOFF_KEYWORDS (19 bilingual EN/ES)
│   │   └── handoff.ts          # detectHandoff (keyword matching)
│   ├── crypto/
│   │   └── encryption.ts       # AES-256-GCM encrypt/decrypt/maskApiKey
│   ├── openai/
│   │   └── client.ts           # OpenAI factory (3-tier key resolution)
│   ├── admin/
│   │   └── actions.ts          # Server actions (CRUD orgs, users, channels, AI settings, API keys)
│   ├── auth/
│   │   ├── actions.ts          # Server actions (login, logout, forgot/update password)
│   │   └── user.ts             # getCurrentUser() with upsert + bootstrap
│   ├── i18n/
│   │   ├── routing.ts          # defineRouting (locales, defaultLocale)
│   │   ├── request.ts          # getRequestConfig (server)
│   │   ├── navigation.ts       # Locale-aware Link, useRouter, usePathname
│   │   └── messages/
│   │       ├── en.json         # English translations (~360+ strings)
│   │       └── es.json         # Spanish translations (~360+ strings)
│   ├── supabase/
│   │   ├── client.ts           # Browser client (realtime, auth)
│   │   ├── server.ts           # Server client (auth verification)
│   │   └── admin.ts            # Admin client (SERVICE_ROLE_KEY)
│   └── utils/
├── hooks/
│   ├── use-realtime-conversations.ts  # Supabase Realtime for conversations list
│   └── use-realtime-messages.ts       # Supabase Realtime for conversation detail messages
├── middleware.ts                # Supabase auth + next-intl locale routing
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── types/
│   ├── index.ts                # Conversation, Message, ResponderMode types
│   └── i18n.d.ts               # IntlMessages type for autocomplete
├── docs/                       # Documentacion del proyecto
├── brand/                      # Identidad visual
└── public/
    └── widget/
        └── chatflow360.js      # Widget embebible vanilla JS (~770 lines)
```

## API Routes

### Publicas (Widget) — Implementadas v0.3.0 / v0.3.1

```
POST  /api/chat                          # Enviar mensaje + respuesta IA automatica
GET   /api/chat/[conversationId]         # Historial (validacion visitorId)
PATCH /api/chat/[conversationId]         # Cerrar conversacion desde widget (v0.3.1)
```

**Autenticacion:** via `publicKey` (UUID del canal) + `visitorId` (generado por widget). Sin JWT — API publica con CORS abierto.

**PATCH /api/chat/[conversationId]:**
- Body: `{ visitorId: string (UUID) }` — validado con `closeConversationSchema` (Zod)
- Valida ownership: la conversacion debe pertenecer al `visitorId` recibido (mismo patron que GET)
- Idempotente: si ya esta `closed`, retorna `{ id, status: "closed" }` sin modificar
- Response: `{ id, status: "closed" }`
- Invocado por el widget en dos momentos: confirmacion "End conversation" + session timeout auto-reset

**CORS:** `lib/api/cors.ts` incluye `PATCH` en `Access-Control-Allow-Methods` (`GET, POST, PATCH, OPTIONS`).

### Dashboard — Server Actions (Implementadas)

Las operaciones del dashboard usan **Server Actions** (no API routes):

```
lib/admin/actions.ts:
  - CRUD Organizations (create, update, delete)
  - CRUD Users (create, update, delete — dual Supabase Auth + Prisma)
  - CRUD Channels (create, update, delete — plan limits enforced)
  - upsertAiSettings (AI config per org)
  - upsertPlatformKey (global API key — super_admin)
  - getConversationMessages (fetch messages by conversation)

lib/auth/actions.ts:
  - login, logout, forgotPassword, updatePassword
```

### Futuras (Post-MVP)

```
POST   /api/conversations/[id]/messages # Enviar mensaje como agente desde dashboard
POST   /api/conversations/[id]/takeover # Tomar control humano (manual)
POST   /api/conversations/[id]/release  # Devolver a IA

GET    /api/channels/[id]/knowledge     # Listar conocimiento del canal (RAG)
POST   /api/channels/[id]/knowledge     # Agregar conocimiento
DELETE /api/channels/[id]/knowledge/[kId] # Eliminar conocimiento

POST   /api/webhooks/whatsapp          # WhatsApp Cloud API webhook
POST   /api/webhooks/messenger         # Facebook Messenger webhook
```

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

## Variables de Entorno

```env
# Database (Prisma)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Supabase (Auth & Realtime)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Admin ops (user creation/deletion)

# OpenAI (fallback — prefer UI-based key management)
OPENAI_API_KEY=

# Encryption (API key encryption at rest)
ENCRYPTION_KEY=                     # 64 hex chars (openssl rand -hex 32)

# App
NEXT_PUBLIC_APP_URL=https://app.chatflow360.com

# Email
RESEND_API_KEY=
EMAIL_FROM=
```

## Billing y Control de Uso

### Metrica de billing: Conversaciones/mes

El billing se basa en **conversaciones por mes**, no en tokens. Es la metrica que el cliente entiende y la que aparece en el pricing.

| Plan | Limite | Overage |
|------|--------|---------|
| Starter | 300 conv/mes | $10 / 200 conversaciones extra |
| Pro | 1,000 conv/mes | $10 / 200 conversaciones extra |
| Growth | 3,000 conv/mes | $10 / 200 conversaciones extra |

**Definicion:** Una "conversacion" = un registro nuevo en la tabla `conversations` (chat session unico con un visitante).

### Control de limites (flujo)

```
Visitante inicia chat → API verifica uso mensual de la org
    → Bajo limite: crear conversacion normalmente
    → Sobre limite: conversacion se crea (NO se corta al visitante)
        → Se notifica al org admin: "Has excedido tu limite"
        → Se sugiere upgrade o se aplica overage automatico
```

**Importante:** El chat NUNCA se corta por exceder el limite. El visitante siempre recibe atencion. El overage se cobra despues.

### Token tracking (interno, super admin)

Los tokens se registran en cada mensaje IA (`Message.tokensUsed`) y se resumen en `UsageTracking` por mes/org. Esto permite:

- Calcular costo real por org (margen de ganancia)
- Detectar orgs con uso anomalo
- Decidir ajustes de modelo/tokens por org
- Proyectar costos de infraestructura

> Ver modelo `UsageTracking` en [DATA-MODELS.md](./DATA-MODELS.md#usagetracking-resumen-mensual--solo-super-admin)

## Alcance del MVP

### Implementado (v0.3.3)

- Multi-tenant con Super Admin (CRUD orgs, users, channels)
- Website widget embebible (vanilla JS, DOM injection, bilingue, maximize/minimize, end conversation, session timeout)
- Respuestas IA con OpenAI (GPT-4o-mini default)
- Human takeover (keyword-based, bilateral EN/ES, 19 default keywords)
- API key management (AES-256-GCM, 3-tier resolution, UI-based)
- Conversations page con datos reales (Prisma) + Supabase Realtime (live updates)
- Conversation detail with Realtime messages (live message updates via postgres_changes)
- Supabase Realtime with RLS: setAuth + denormalized `organization_id` + token refresh + 30s polling safety net
- RLS policies on `conversations` and `messages` tables (org-scoped tenant isolation)
- Dashboard basico (5 stat cards, top pages, recent conversations — aun mock)
- AI Settings page (instructions, model config, handoff, preview widget) + RBAC split (business vs technical params)
- Autenticacion real (Supabase Auth — login, logout, forgot/update password)
- Bilingue (EN/ES) — ~360+ strings traducidas
- Token tracking (Message.tokensUsed + UsageTracking monthly)
- Security hardened (CSP, HSTS, crypto passwords, transaction atomicity, OWASP widget API hardening)
- 3-layer conversation cleanup (PATCH + client timeout + pg_cron)
- 3-layer security model: RLS (Realtime), Server Actions (dashboard), publicKey+visitorId (widget API)

### Pendiente (Post-MVP)

- RAG/Knowledge Base (pgvector) — tab dice "coming soon"
- Enviar mensajes como agente desde dashboard
- Rate limiting (@upstash/ratelimit — deferred to production phase)
- Dashboard con datos reales (stat cards, charts)
- Reports page
- Push notifications / email notifications
- RBAC enforcement middleware (basic business/technical split done, full RBAC pending)
- Canales WhatsApp / Facebook
- File attachments, typing indicators, read receipts
- Integraciones n8n (automatizaciones laterales)

### Future-Ready (estructura en DB)

- Roles de usuario (Admin/Agent en OrganizationMember — stored, not enforced)
- Channel types enum (para WhatsApp, FB)
- UsageTracking model (monthly summary per org)
- PlatformSettings model (global config key-value)

## Estrategia Multi-Canal (WhatsApp, Messenger, etc.)

> Decision arquitectonica documentada para referencia futura.

### Principio: Integracion Directa (sin intermediarios en el flujo core)

El pipeline de IA es **agnostico al canal** — recibe un mensaje, lo procesa con RAG + instrucciones, y devuelve una respuesta. Esto permite agregar nuevos canales sin cambiar la logica core.

```
Canal externo → Webhook (API Route) → AI Pipeline → Respuesta al canal
                                          ↕
                              Misma DB, mismo RAG, mismo dashboard
```

### Implementacion por canal

Cada canal nuevo requiere un **adaptador** que traduce entre el protocolo externo y el pipeline interno:

| Canal | Webhook | Adaptador | Particularidades |
|-------|---------|-----------|-----------------|
| Website widget | N/A (directo) | `public/widget/chatflow360.js` | REST polling (5s en modo humano) |
| WhatsApp | `/api/webhooks/whatsapp` | WhatsApp Cloud API (Meta) | Ventana 24hrs, templates, verificacion webhook |
| Facebook Messenger | `/api/webhooks/messenger` | Messenger Platform API | Page tokens, postbacks |
| Futuro (Telegram, etc.) | `/api/webhooks/[provider]` | API del proveedor | Varia por plataforma |

### Pasos para agregar WhatsApp (referencia)

1. **Enum `channel_type`** en modelo Channel (`website | whatsapp | messenger`)
2. **API route webhook** — `app/api/webhooks/whatsapp/route.ts`
   - Verificacion de webhook (challenge de Meta)
   - Parseo de mensajes entrantes (texto, media, location)
   - Enrutamiento al pipeline de IA existente
3. **Servicio adaptador** — `lib/channels/whatsapp.ts`
   - Envio de respuestas via WhatsApp Cloud API
   - Manejo de ventana de 24hrs (session vs template messages)
   - Manejo de media (imagenes, documentos)
4. **Variables de entorno** — `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`
5. **Dashboard** — las conversaciones de WhatsApp aparecen como otro canal (badge visual), mismo UI

### n8n: Rol como complemento (NO intermediario)

**Decision:** n8n **NO** forma parte del flujo core de mensajeria. El chat funciona 100% dentro de la app.

n8n se reserva como **orquestador de automatizaciones laterales** que se conecta via webhooks o API como consumidor externo de eventos:

```
Flujo core (sin n8n):
  WhatsApp/Web → API Route → AI Pipeline → Respuesta

Automatizaciones laterales (con n8n, opcional):
  Evento en app → Webhook a n8n → CRM + Email + Slack + etc.
```

**Casos de uso para n8n (futuro):**

- Lead capturado → crear contacto en HubSpot/CRM
- Conversacion cerrada → enviar encuesta de satisfaccion
- Reporte semanal → generar y enviar por email
- Keyword detectado → notificar en Slack

**Razon:** El flujo critico (mensaje → IA → respuesta) debe tener la menor latencia posible y cero dependencias externas. n8n agrega un hop adicional y un punto de fallo innecesario para el chat. Solo se justifica para workflows que no son time-sensitive.

## Future Improvements (Post-MVP)

### Rate Limiting — Upstash Redis

> **Status:** Planned for production phase. Not needed during MVP testing.

When real production traffic arrives, the widget API endpoints (`/api/chat`) will need per-IP rate limiting to protect against:

- **API abuse:** automated scripts hammering the chat endpoint
- **OpenAI token exhaustion:** a single bad actor generating thousands of AI responses
- **Cost amplification:** overage charges from inflated conversation counts

**Planned implementation:**

```typescript
// lib/api/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests/min per IP
});

// In POST /api/chat route handler:
const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
const { success } = await ratelimit.limit(ip);
if (!success) return new Response(
  JSON.stringify({ error: "Too many requests" }),
  { status: 429, headers: corsHeaders }
);
```

**Dependencies:**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Environment variables required:**

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Limits (proposed):**

| Endpoint | Limit | Window | Strategy |
|----------|-------|--------|----------|
| `POST /api/chat` | 20 requests | 1 minute per IP | Sliding window |
| `GET /api/chat/[id]` | 60 requests | 1 minute per IP | Sliding window |
| `PATCH /api/chat/[id]` | 10 requests | 1 minute per IP | Sliding window |

**Why deferred:** During MVP/testing phase there are only known test users. Adding Redis introduces an additional paid dependency and cold-start latency on Vercel edge. This should be activated before any public launch or marketing campaign.
