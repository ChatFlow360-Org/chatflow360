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
│   │   │   ├── conversations/
│   │   │   ├── channels/
│   │   │   ├── settings/
│   │   │   └── reports/
│   │   └── (super-admin)/
│   │       ├── layout.tsx      # Super admin guard
│   │       ├── organizations/
│   │       └── users/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts        # Widget chat endpoint
│   │   ├── ai/
│   │   │   └── route.ts        # AI completion
│   │   └── webhooks/
│   └── widget/
│       └── [publicKey]/
│           └── page.tsx        # Widget iframe embebible
├── components/
│   ├── ui/                     # Shadcn components
│   ├── chat/
│   ├── dashboard/
│   ├── layout/                 # Sidebar, Header
│   └── widget/
├── lib/
│   ├── db/
│   │   └── prisma.ts           # Prisma client singleton
│   ├── i18n/
│   │   ├── routing.ts          # defineRouting (locales, defaultLocale)
│   │   ├── request.ts          # getRequestConfig (server)
│   │   ├── navigation.ts       # Locale-aware Link, useRouter, usePathname
│   │   └── messages/
│   │       ├── en.json         # English translations (~160+ strings)
│   │       └── es.json         # Spanish translations (~160+ strings)
│   ├── supabase/
│   │   ├── client.ts           # Browser client (realtime, auth)
│   │   └── server.ts           # Server client (auth verification)
│   ├── ai/
│   │   └── openai.ts
│   └── utils/
├── middleware.ts                # next-intl locale routing middleware
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── hooks/
├── types/
│   └── i18n.d.ts               # IntlMessages type for autocomplete
├── docs/                       # Documentacion del proyecto
├── brand/                      # Identidad visual
└── public/
    └── widget/
        └── embed.js            # Script embed standalone
```

## API Routes

### Publicas (Widget)

```
POST /api/chat                          # Crear/continuar conversacion
GET  /api/chat/[conversationId]         # Historial (validacion publicKey)
```

### Protegidas (Dashboard)

```
GET    /api/conversations               # Listar conversaciones
POST   /api/conversations/[id]/takeover # Tomar control humano
POST   /api/conversations/[id]/release  # Devolver a IA
POST   /api/conversations/[id]/messages # Enviar mensaje

GET    /api/channels                    # Listar canales
POST   /api/channels                    # Crear canal
PATCH  /api/channels/[id]              # Actualizar canal

GET    /api/settings/ai                 # Config IA (instrucciones)
PATCH  /api/settings/ai                 # Actualizar instrucciones

GET    /api/channels/[id]/knowledge     # Listar conocimiento del canal
POST   /api/channels/[id]/knowledge     # Agregar conocimiento
DELETE /api/channels/[id]/knowledge/[kId] # Eliminar conocimiento
```

### Super Admin

```
GET    /api/admin/organizations         # Listar orgs
POST   /api/admin/organizations         # Crear org
PATCH  /api/admin/organizations/[id]    # Actualizar org
POST   /api/admin/organizations/[id]/users  # Agregar usuario a org
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

### Widget Embed

```html
<script
  src="https://app.chatflow360.com/widget/embed.js"
  data-key="PUBLIC_KEY"
  data-lang="es">
</script>
```

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

# OpenAI
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://app.chatflow360.com
NEXT_PUBLIC_WIDGET_URL=

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

### Incluido

- Multi-tenant con Super Admin
- Website widget (embebible)
- Respuestas IA con RAG (OpenAI + Supabase Vector)
- Panel de Instrucciones (system prompt) separado de Conocimiento (RAG)
- Human takeover (keyword-based)
- Historial de conversaciones
- Dashboard basico + reportes
- Bilingue (EN/ES)
- Notificaciones por email

### No Incluido (MVP)

- Push notifications
- Multiples usuarios por org
- Canales WhatsApp / Facebook
- Flow builder
- Integraciones n8n

### Future-Ready (estructura en DB)

- Roles de usuario (para futuro team management)
- Channel types enum (para WhatsApp, FB)
- Config JSONB (flexible por tipo de canal)

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
| Website widget | N/A (directo) | Ya implementado | WebSocket/polling |
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
