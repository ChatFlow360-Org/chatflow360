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

### Publicas (Widget) — Implementadas v0.3.0

```
POST /api/chat                          # Enviar mensaje + respuesta IA automatica
GET  /api/chat/[conversationId]         # Historial (validacion visitorId)
```

**Autenticacion:** via `publicKey` (UUID del canal) + `visitorId` (generado por widget). Sin JWT — API publica con CORS abierto.

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

### Implementado (v0.3.0)

- Multi-tenant con Super Admin (CRUD orgs, users, channels)
- Website widget embebible (vanilla JS, DOM injection, bilingue)
- Respuestas IA con OpenAI (GPT-4o-mini default)
- Human takeover (keyword-based, bilateral EN/ES)
- API key management (AES-256-GCM, 3-tier resolution, UI-based)
- Conversations page con datos reales (Prisma)
- Dashboard basico (5 stat cards, top pages, recent conversations — aun mock)
- AI Settings page (instructions, model config, handoff, preview widget)
- Autenticacion real (Supabase Auth — login, logout, forgot/update password)
- Bilingue (EN/ES) — ~360+ strings traducidas
- Token tracking (Message.tokensUsed + UsageTracking monthly)
- Security hardened (CSP, HSTS, crypto passwords, transaction atomicity)

### Pendiente (Post-MVP)

- RAG/Knowledge Base (pgvector) — tab dice "coming soon"
- WebSocket/SSE realtime (MVP usa polling 5s)
- Enviar mensajes como agente desde dashboard
- Rate limiting (@upstash/ratelimit)
- Dashboard con datos reales (stat cards, charts)
- Reports page
- Push notifications / email notifications
- RBAC enforcement (roles stored but not enforced)
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
