# ChatFlow360 - Modelos de Datos

> Schema Prisma, relaciones y enums del proyecto.

## Diagrama de Relaciones

```
Organization (1)
    ├── AiSettings (1:1) ─── Config IA por org (SOLO super_admin)
    ├── OrganizationMember (1:N) ─── User (N:1)
    ├── UsageTracking (1:N) ─── Resumen mensual de uso
    ├── Conversation (1:N) ─── denormalized FK for RLS (v0.3.3)
    └── Channel (1:N)
            ├── AI overrides (systemPrompt, handoff) ─── Org admin configura
            ├── ChannelKnowledge (1:N) ─── Conocimiento RAG (pgvector)
            └── Conversation (1:N) ─── User? (assignedTo)
                    └── Message (1:N) ─── User? (sender) + tokensUsed
```

## Control de Acceso por Modelo

> Decision arquitectonica: separar parametros tecnicos (super_admin) de parametros de negocio (org admin).

| Parametro | Quien configura | Donde vive | Razon |
|-----------|----------------|------------|-------|
| provider | Super Admin | AiSettings | Infraestructura de plataforma |
| model | Super Admin | AiSettings | Control de costos (GPT-4o vs mini) |
| temperature | Super Admin | AiSettings | Calidad/consistencia de respuestas |
| maxTokens | Super Admin | AiSettings | Control de costos por respuesta |
| systemPrompt | Org Admin | Channel (override) / AiSettings (default) | El cliente conoce su negocio |
| handoffEnabled | Org Admin | Channel | Decision de negocio del cliente |
| handoffKeywords | Org Admin | Channel | El cliente define cuando intervenir |
| Knowledge (RAG) | Org Admin | ChannelKnowledge | Contenido del negocio del cliente |

### Herencia de configuracion

```typescript
// Parametros tecnicos: siempre desde AiSettings (super_admin)
const model = orgAiSettings.model;
const temperature = orgAiSettings.temperature;
const maxTokens = orgAiSettings.maxTokens;

// Parametros de negocio: channel override o fallback a org
const systemPrompt = channel.systemPrompt ?? orgAiSettings.systemPrompt;
const handoffEnabled = channel.handoffEnabled ?? true;
const handoffKeywords = channel.handoffKeywords.length > 0
  ? channel.handoffKeywords
  : orgAiSettings.handoffKeywords;
```

## Modelos

### Organization

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| name | String | - | Nombre de la organizacion |
| slug | String (unique) | - | URL-friendly identifier |
| defaultLanguage | String | "en" | Idioma por defecto |
| timezone | String | "America/New_York" | Zona horaria |
| plan | String | "starter" | Plan de suscripcion: 'starter' / 'pro' / 'growth' |
| maxChannels | Int | 1 | Limite de canales segun plan |
| maxAgents | Int | 2 | Limite de agentes segun plan |
| maxConversationsPerMonth | Int | 300 | Limite de conversaciones/mes segun plan |
| isActive | Boolean | true | Org activa/inactiva |

**Relaciones:** members, channels, aiSettings, usageTracking

**Limites por plan:**

| Plan | maxChannels | maxAgents | maxConversationsPerMonth |
|------|-------------|-----------|--------------------------|
| starter | 1 | 2 | 300 |
| pro | 3 | 5 | 1000 |
| growth | 10 | 20 | 3000 |

### User

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK (match Supabase Auth) |
| email | String (unique) | - | Email del usuario |
| fullName | String? | null | Nombre completo |
| avatarUrl | String? | null | URL del avatar |
| isSuperAdmin | Boolean | false | Acceso super admin |
| preferredLanguage | String | "en" | Idioma preferido |

**Relaciones:** memberships, conversations (assigned), messages (sent)

### OrganizationMember

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| organizationId | UUID | - | FK Organization |
| userId | UUID | - | FK User |
| role | String | "admin" | 'owner' / 'admin' / 'agent' |

**Constraint:** UNIQUE(organizationId, userId)

### AiSettings (Config IA — SOLO Super Admin)

> Parametros tecnicos de la IA configurados por el super admin. Controlan costos y calidad de la plataforma. El cliente NO tiene acceso a estos campos.

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| organizationId | UUID (unique) | - | FK Organization (1:1) |
| provider | String | "openai" | Proveedor IA |
| model | String | "gpt-4o-mini" | Modelo a usar |
| systemPrompt | String? | null | **Instrucciones** default de la IA (fallback si el canal no tiene) |
| temperature | Decimal | 0.7 | Creatividad (0-2) |
| maxTokens | Int | 500 | Tokens maximos por respuesta |
| handoffKeywords | String[] | [] | Keywords default para human takeover (fallback) |

**Acceso:** SOLO `user.isSuperAdmin === true`

### Channel

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| organizationId | UUID | - | FK Organization |
| name | String | - | Nombre del canal |
| type | String | - | 'website' / 'whatsapp' / 'facebook' |
| isActive | Boolean | true | Canal activo |
| systemPrompt | String? | null | Override instrucciones (org admin configura) |
| handoffEnabled | Boolean | true | Activar/desactivar transferencia a humano (org admin) |
| handoffKeywords | String[] | [] | Override keywords de handoff (org admin). Si vacio, usa los de AiSettings |
| config | Json | {} | Config flexible por tipo de canal |
| publicKey | String? (unique) | null | Key publica para widget |

**Relaciones:** organization, conversations, knowledge

**Campos configurables por org admin:** systemPrompt, handoffEnabled, handoffKeywords
**Campos configurables por super admin:** type, isActive, config, publicKey

### ChannelKnowledge (Conocimiento RAG)

> Tabla manejada via SQL directo (no Prisma) porque usa tipo VECTOR de pgvector.

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto (gen_random_uuid) | PK |
| channel_id | UUID | - | FK Channel |
| title | TEXT | - | Titulo descriptivo del chunk |
| content | TEXT | - | Contenido textual del conocimiento |
| embedding | VECTOR(1536) | - | Vector de embedding (text-embedding-3-small) |
| metadata | JSONB | {} | Metadata flexible (source, category, etc.) |
| created_at | TIMESTAMPTZ | now() | Fecha de creacion |
| updated_at | TIMESTAMPTZ | now() | Fecha de actualizacion |

**Relacion:** channel_id → channels.id (CASCADE)
**Indice:** HNSW en embedding para busqueda rapida
**Aislamiento:** Siempre filtrar por channel_id en queries
**Acceso:** Org admin (CRUD de conocimiento de su negocio)

**Nota:** Esta tabla usa snake_case directamente porque se maneja via SQL, no via Prisma.

### Conversation

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| channelId | UUID | - | FK Channel |
| organizationId | UUID | - | FK Organization (denormalized, v0.3.3) |
| visitorId | String? | null | ID unico del visitante |
| contactInfo | Json | {} | Info de contacto |
| status | String | "open" | 'open' / 'pending' / 'resolved' / 'closed' |
| responderMode | String | "ai" | 'ai' / 'human' |
| assignedTo | UUID? | null | FK User (agente asignado) |
| metadata | Json | {} | Metadata flexible |
| lastMessageAt | DateTime | now() | Ultimo mensaje |
| resolvedAt | DateTime? | null | Cuando se resolvio |

**Relaciones:** channel, organization, assignee (User), messages

**Denormalization note (`organizationId`):** This field is intentionally denormalized from `Channel.organizationId`. The canonical relationship is `Conversation -> Channel -> Organization`, but Supabase Realtime's policy evaluation engine (walrus) cannot evaluate RLS policies that require JOINs across tables. By storing `organization_id` directly on conversations, the RLS policy becomes a simple column check (`organization_id = ANY(SELECT get_user_org_ids())`) that walrus can evaluate. The field is set at conversation creation time in `POST /api/chat` and never changes (a conversation always belongs to the same org). This also simplifies dashboard queries that filter by organization (direct `WHERE organization_id = ?` instead of `WHERE channel_id IN (SELECT id FROM channels WHERE organization_id = ?)`).

### Message

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| conversationId | UUID | - | FK Conversation |
| senderType | String | - | 'visitor' / 'ai' / 'agent' |
| senderId | UUID? | null | FK User (si es agente) |
| content | String | - | Contenido del mensaje |
| contentType | String | "text" | Tipo de contenido |
| attachments | Json | [] | Adjuntos |
| metadata | Json | {} | Metadata flexible |
| tokensUsed | Int? | null | Tokens consumidos por esta respuesta IA (null si visitor/agent) |

**Relaciones:** conversation, sender (User)

**Nota sobre tokensUsed:** Solo se registra cuando `senderType === 'ai'`. OpenAI devuelve `usage.total_tokens` en cada completion. Este dato es interno (super admin) para control de costos.

### UsageTracking (Resumen mensual — SOLO Super Admin)

> Tabla de resumen mensual por organizacion. Se actualiza incrementalmente cada vez que se crea una conversacion o se consumen tokens.

| Campo | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| id | UUID | auto | PK |
| organizationId | UUID | - | FK Organization |
| month | String | - | Periodo: "2026-02" (YYYY-MM) |
| conversationCount | Int | 0 | Conversaciones iniciadas este mes |
| totalTokensUsed | Int | 0 | Tokens totales consumidos (prompt + completion) |
| estimatedCostUsd | Decimal | 0.00 | Costo estimado en USD |

**Constraint:** UNIQUE(organizationId, month)
**Acceso:** SOLO `user.isSuperAdmin === true` (datos de costos internos)

**Flujo de actualizacion:**

```
1. Nueva conversacion creada → conversationCount++
2. Mensaje IA enviado → totalTokensUsed += tokensUsed
3. Cron job o trigger → recalcula estimatedCostUsd basado en pricing del modelo
```

**Flujo de control de limites:**

```
Visitante inicia chat nuevo
    → COUNT conversaciones del mes para esta org
    → ¿Excede maxConversationsPerMonth?
        → NO: crear conversacion normalmente
        → SI: notificar al org admin + sugerir upgrade
              (chat NO se corta — overage: $10/200 conversaciones extra)
```

## Billing: Metricas Duales

| Metrica | Visible para | Proposito |
|---------|-------------|-----------|
| **Conversaciones/mes** | Cliente (org admin) | Billing, limites del plan, dashboard del cliente |
| **Tokens consumidos** | Super admin | Control de costos, margen, optimizacion por org |

Los tokens NUNCA se muestran al cliente. Son herramienta interna para entender costos y rentabilidad.

## Enums (valores validos)

| Modelo | Campo | Valores |
|--------|-------|---------|
| Organization | plan | `starter`, `pro`, `growth` |
| OrganizationMember | role | `owner`, `admin`, `agent` |
| Channel | type | `website`, `whatsapp`, `facebook` |
| Conversation | status | `open`, `pending`, `resolved`, `closed` |
| Conversation | responderMode | `ai`, `human` |
| Message | senderType | `visitor`, `ai`, `agent` |

## Mapping DB (snake_case)

Prisma usa camelCase en el codigo pero las tablas y columnas en PostgreSQL usan snake_case via `@@map` y `@map`:

| Modelo Prisma | Tabla PostgreSQL |
|---------------|-----------------|
| Organization | organizations |
| User | users |
| OrganizationMember | organization_members |
| AiSettings | ai_settings |
| Channel | channels |
| *(SQL directo)* | channel_knowledge |
| Conversation | conversations |
| Message | messages |
| UsageTracking | usage_tracking |

> `channel_knowledge` no tiene modelo Prisma porque usa tipo VECTOR(1536) que Prisma no soporta. Se maneja via funciones SQL en Supabase.
