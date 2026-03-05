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
│   │   │   └── prompt-templates/ # Prompt Template CRUD (super_admin only)
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts        # POST — widget chat + AI response
│   │   │   └── [id]/
│   │   │       └── route.ts    # GET — conversation history, PATCH — close conversation
│   │   ├── auth/
│   │   │   ├── callback/       # Supabase auth callback (code exchange)
│   │   │   └── confirm/        # Server-side OTP verification for password reset (v0.3.26)
│   │   ├── widget/
│   │   │   ├── config/
│   │   │   │   └── route.ts    # GET — widget appearance + postChat config by publicKey
│   │   │   ├── rating/
│   │   │   │   └── route.ts    # POST — save visitor rating (v0.3.9)
│   │   │   └── transcript/
│   │   │       └── route.ts    # POST — send transcript email via Resend (v0.3.9)
│   │   ├── translate/
│   │   │   └── route.ts        # POST — AI-powered EN/ES translation (v0.3.18)
│   │   └── webhooks/           # Future: WhatsApp, Messenger
├── components/
│   ├── ui/                     # Shadcn components (tooltip, alert-dialog, confirm-dialog, drawer, date-range-picker, translate-button)
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
│   │       ├── en.json         # English translations (~470+ strings)
│   │       └── es.json         # Spanish translations (~470+ strings)
│   ├── supabase/
│   │   ├── client.ts           # Browser client (realtime, auth)
│   │   ├── server.ts           # Server client (auth verification)
│   │   └── admin.ts            # Admin client (SERVICE_ROLE_KEY)
│   ├── email/
│   │   ├── transcript.ts       # renderTranscriptEmail() — branded HTML email renderer (v0.3.9)
│   │   └── reset-password.ts   # renderResetPasswordEmail() — bilingual password reset HTML email (v0.3.26)
│   ├── widget/
│   │   ├── appearance.ts       # WidgetAppearance types, Zod schema, defaults, resolveAppearance()
│   │   └── post-chat.ts        # PostChatSettings types, Zod schema, defaults, resolvePostChat()
│   ├── hooks/
│   │   └── use-bulk-translate.ts  # Bulk translate hook for "Translate empty fields" buttons (v0.3.18)
│   └── utils/
├── hooks/
│   ├── use-realtime-conversations.ts  # Supabase Realtime for conversations list
│   ├── use-realtime-messages.ts       # Supabase Realtime for conversation detail messages
│   └── use-typing-indicator.ts        # Bidirectional typing indicator via Supabase Broadcast
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

### Publicas (Widget) — Implementadas v0.3.0 / v0.3.1 / v0.3.7 / v0.3.9

```
POST  /api/chat                          # Enviar mensaje + respuesta IA automatica
GET   /api/chat/[conversationId]         # Historial (validacion visitorId)
PATCH /api/chat/[conversationId]         # Cerrar conversacion desde widget (v0.3.1)
GET   /api/widget/config?key=PUBLIC_KEY  # Widget appearance + postChat config (v0.3.7 / v0.3.9)
POST  /api/widget/rating                 # Guardar rating 1-5 del visitante (v0.3.9)
POST  /api/widget/transcript             # Generar y enviar email de transcripcion via Resend (v0.3.9)
```

**Autenticacion:** via `publicKey` (UUID del canal) + `visitorId` (generado por widget). Sin JWT — API publica con CORS abierto.

**PATCH /api/chat/[conversationId]:**
- Body: `{ visitorId: string (UUID) }` — validado con `closeConversationSchema` (Zod)
- Valida ownership: la conversacion debe pertenecer al `visitorId` recibido (mismo patron que GET)
- Idempotente: si ya esta `closed`, retorna `{ id, status: "closed" }` sin modificar
- Response: `{ id, status: "closed" }`
- Invocado por el widget en dos momentos: confirmacion "End conversation" + session timeout auto-reset

**CORS:** `lib/api/cors.ts` incluye todos los metodos en `Access-Control-Allow-Methods` (`GET, POST, PATCH, OPTIONS`). Los endpoints de rating y transcript siguen el mismo patron de seguridad (body size limits, Zod validation, safe JSON parsing).

**POST /api/widget/rating:**
- Body: `{ conversationId: UUID, visitorId: UUID, rating: 1-5 }` — validado con `ratingSchema` (Zod)
- Verifica ownership: la conversacion debe pertenecer al `visitorId` (mismo patron que GET/PATCH)
- Guarda `rating` en `conversations.rating` (SmallInt)
- Body size limit: 1KB

**POST /api/widget/transcript:**
- Body: `{ conversationId: UUID, visitorId: UUID, email: string, name: string, lang: "en" | "es" }` — validado con `transcriptSchema` (Zod)
- Verifica ownership, verifica `enableTranscript` en `Channel.config.postChatSettings`
- **Anti-spam:** verifica `conversation.metadata.transcriptSent` — retorna 409 si ya se envio un transcript para esta conversacion. Flag escrito atomicamente post-envio exitoso.
- Fetch de messages (max 200) + channel config + org name via Prisma
- Renderiza HTML email via `lib/email/transcript.ts` (`escapeHtml` aplicado a todos los campos variables incluyendo comillas simples)
- **`orgName` sanitizado** en campo `from`: strip control chars, remocion de `<>`, max 50 chars (header injection prevention)
- Envia via Resend: `from: "{orgName} <noreply@chatflow360.com>"`, `to: [visitor email]`, `cc: [ccEmail si configurado]`
- Body size: verificado via `request.text()` (no confia en `Content-Length` header), limite 4KB

### Auth API Routes

```
GET   /api/auth/confirm?token_hash=…&type=recovery&next=/…  # Server-side OTP verify → redirect (v0.3.26)
```

**GET /api/auth/confirm:**
- Query params: `token_hash` (from Supabase magic link), `type` (must be `recovery`), `next` (redirect path after success), `locale` (optional — `en` or `es`, defaults to `en`)
- Calls `supabase.auth.verifyOtp({ token_hash, type: "recovery" })` server-side — fixes PKCE flow state expiration that caused `otp_expired` when Supabase handled the redirect itself
- Restricted to `type=recovery` only; returns 400 for any other OTP type
- On success: redirects to `/{locale}/update-password` (with optional `next` path preserved)
- On failure: redirects to `/{locale}/forgot-password?error=otp_expired`
- **`sanitizeRedirectPath()`** — 6-layer open redirect protection: allowlist of valid base paths, strips protocol/host, blocks `//` double-slash, rejects non-relative paths, encodes special chars, enforces max 200 char length

### Dashboard — Authenticated API Routes

```
POST  /api/translate                       # AI-powered EN/ES translation (v0.3.18)
POST  /api/upload/logo                     # Upload organization logo
```

**POST /api/translate:**
- Auth: `getCurrentUser()` — requires authenticated dashboard user
- Body: `{ texts: [{ text, from, to }] }` — Zod validated, max 20 items, max 500 chars each
- Uses `resolvePlatformApiKey()` (platform-level key, NOT per-org)
- Model: `gpt-4o-mini`, temperature 0.3, max_tokens 2000
- System prompt: preserves template variables (`{{visitor_name}}`, `{{org_name}}`)
- Batch processing: all texts translated in a single OpenAI call, parsed by numbered lines
- Error: 503 if no platform API key configured

### Dashboard — Server Actions (Implementadas)

Las operaciones del dashboard usan **Server Actions** (no API routes):

```
lib/admin/actions.ts:
  - CRUD Organizations (create, update, delete)
  - CRUD Users (create, update, delete — dual Supabase Auth + Prisma)
  - CRUD Channels (create, update, delete — plan limits enforced)
  - upsertAiSettings (AI config per org)
  - upsertPlatformKey (global API key — super_admin)
  - getConversationMessages (fetch messages by conversation — max 200, org-scoped tenant isolation)
  - createPromptTemplate, updatePromptTemplate, deletePromptTemplate (super_admin — dual revalidatePath: /settings/ai + /prompt-templates)
  - upsertWidgetAppearance (widget colors + header texts per channel)
  - upsertPostChatSettings (post-chat config per channel)

lib/auth/actions.ts:
  - login, logout, forgotPassword, updatePassword
```

#### Custom Password Reset Flow (v0.3.26)

The password reset flow bypasses Supabase's built-in email delivery in favor of full platform control:

```
User enters email → forgotPassword()
    → supabaseAdmin.auth.admin.generateLink({ type: "recovery", email })
    → Resend API sends branded bilingual email (lib/email/reset-password.ts)
        → Email contains link: /api/auth/confirm?token_hash=…&type=recovery&locale=en

User clicks link → GET /api/auth/confirm
    → verifyOtp({ token_hash, type: "recovery" }) server-side
    → Redirects to /[locale]/update-password

User submits new password → updatePassword()
    → AMR check: mfa.getAuthenticatorAssuranceLevel()
        → Must be recovery session (aal1 + aal1) — rejects regular dashboard sessions
    → supabase.auth.updateUser({ password })
```

**Key design decisions:**
- `admin.generateLink()` gives the platform a raw `token_hash` — no dependency on Supabase email templates or Supabase Dashboard configuration
- Server-side OTP verification in `/api/auth/confirm` eliminates PKCE state expiration (PKCE code verifier is stored in a cookie that expires before the user clicks the email link in some flows)
- AMR check (PWR-03) prevents password changes via regular authenticated sessions — requires an active recovery session obtained through the reset email link
- `lib/email/reset-password.ts` uses `escapeHtml()` on all variable fields including the reset URL, matches brand colors (`#fafcfe` header, `#2f92ad` CTA button)

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

> Seccion extraida para optimizar carga de contexto. Ver detalle completo en **[ARCHITECTURE-BUSINESS-LOGIC.md](./ARCHITECTURE-BUSINESS-LOGIC.md)**.
>
> Incluye: IA (instrucciones vs conocimiento), Human Takeover, Herencia de Config, AI Settings, Knowledge Categories, Prompt Templates, Widget (embed, appearance, post-chat), Conversation Auto-Cleanup, Supabase Realtime, Typing Indicators, API Key Encryption, i18n.

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

# Email (Resend — v0.3.9)
RESEND_API_KEY=                     # API key de Resend (dominio chatflow360.com verificado)
# EMAIL_FROM — no se usa; el from se construye dinamicamente: "{orgName} <noreply@chatflow360.com>"
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

### Implementado (v0.3.9)

- Multi-tenant con Super Admin (CRUD orgs, users, channels). 2 user types: Super Admin (platform-level, can create other super admins) and Org Admin (organization-level). Self-edit/delete protection
- Website widget embebible (vanilla JS, DOM injection, bilingue, maximize/minimize, end conversation, session timeout)
- Widget Appearance Customization — per-channel colors + bilingual header texts, stored in `Channel.config` JSONB, live preview, `GET /api/widget/config` endpoint
- Post-Chat Experience — rating toggle, transcript email toggle, email CC, logo URL, bilingual email template customization, live email preview (dashboard UI v0.3.8 + full backend v0.3.9)
- Post-Chat Backend — `POST /api/widget/rating` (saves SmallInt to `conversations.rating`), `POST /api/widget/transcript` (Resend email via `lib/email/transcript.ts`), widget JS multi-step flow (confirm → rating → transcript → success)
- Resend integration — domain `chatflow360.com` verified, emails from `noreply@chatflow360.com`, bilingual (EN/ES)
- Typing indicators — `hooks/use-typing-indicator.ts` — bidirectional via Supabase Realtime Broadcast, throttled at 2s, 3s auto-timeout, wave dots animation
- Respuestas IA con OpenAI (GPT-4o-mini default)
- Human takeover (keyword-based, bilateral EN/ES, 19 default keywords)
- API key management (AES-256-GCM, 3-tier resolution, UI-based)
- Conversations page con datos reales (Prisma) + Supabase Realtime (live updates)
- Conversation detail with Realtime messages (live message updates via postgres_changes)
- Supabase Realtime with RLS: setAuth + denormalized `organization_id` + token refresh + 30s polling safety net
- RLS policies on `conversations`, `messages`, and `prompt_templates` tables (org-scoped tenant isolation + super_admin gate)
- Dashboard basico (5 stat cards, top pages, recent conversations)
- AI Settings page (structured prompt fields, model config, handoff, preview widget, "Use Template" selector, Widget appearance, Post-Chat) + RBAC split (business vs technical params)
- Prompt Templates page (`/prompt-templates`) — super_admin CRUD with two tabs: "By Category" (2-panel layout: category sidebar + pieces by type) and "Global Rules" (mandatory rules for all orgs). BusinessCategory + PromptPiece models. Global rules (categoryId=null) appear locked in AI Settings. RLS defense-in-depth on table.
- App-wide ConfirmDialog (`components/ui/confirm-dialog.tsx`) — replaces ALL native confirm() calls. Uses shadcn/ui AlertDialog. Applied to: prompt-templates, organizations (org + channel delete), users
- App-wide Tooltips (`components/ui/tooltip.tsx`) — shadcn/ui Tooltip with TooltipProvider in DashboardShell
- Structured prompt fields (`lib/chat/prompt-builder.ts`): agentName, role, rules (max 50), personality, additionalInstructions — assembled via `composeSystemPrompt()`
- Knowledge Categories — `category` + `structured_data` columns on `organization_knowledge`; Business Hours structured form (`components/knowledge/business-hours-form.tsx`)
- Prominent Tabs active state — teal CTA border, bottom indicator bar, semibold text, card background (`components/ui/tabs.tsx`)
- Scroll-to-top on save in AI Settings — targets `<main>` container so feedback banners are always visible
- Autenticacion real (Supabase Auth — login, logout, forgot/update password)
- Bilingue (EN/ES) — ~484+ strings traducidas (including 14 new post-chat flow strings in v0.3.9)
- Token tracking (Message.tokensUsed + UsageTracking monthly)
- Security hardened (CSP, HSTS, crypto passwords, transaction atomicity, OWASP widget API hardening)
- 3-layer conversation cleanup (PATCH + client timeout + pg_cron)
- 3-layer security model: RLS (Realtime), Server Actions (dashboard), publicKey+visitorId (widget API)

### Pendiente (Post-MVP)

- Logo upload via Supabase Storage — bucket `logos`, `POST /api/upload/logo` endpoint; actualmente el form acepta URL string como fallback
- RAG/Knowledge Base (pgvector) — tab dice "coming soon"
- Enviar mensajes como agente desde dashboard
- Rate limiting (@upstash/ratelimit — deferred to production phase)
- Dashboard con datos reales (stat cards, charts)
- Reports page
- Push notifications / email notifications
- RBAC enforcement middleware (business/technical split done, super_admin/org_admin enforced, full middleware pending)
- Canales WhatsApp / Facebook
- File attachments, read receipts
- Integraciones n8n (automatizaciones laterales)

### Future-Ready (estructura en DB)

- Roles de usuario (2 functional types: Super Admin platform-level, Org Admin organization-level — Agent role removed; `role` field in `OrganizationMember` kept for future multi-role support)
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
