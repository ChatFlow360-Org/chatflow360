# ChatFlow360 - Security Checklist

> Auditoria de seguridad del proyecto. Actualizado en v0.3.3 (2026-02-23).
> Audit completo: `docs/SECURITY-AUDIT-v0.2.2.md` (21 findings, OWASP ASVS v4.0)

## Security Model — 3 Layers (v0.3.3)

ChatFlow360 uses three complementary security layers, each protecting a different surface:

| Layer | Mechanism | Scope | What it protects |
|-------|-----------|-------|-----------------|
| **RLS** | Supabase Row Level Security (org-scoped SELECT policies) | Realtime events + direct DB access | Tenant isolation — org A cannot see org B's data in live updates |
| **Server Actions** | Prisma with auth guards (`getCurrentUser`, `requireSuperAdmin`) | Dashboard CRUD operations | Admin operations — only authorized users can create/update/delete |
| **Widget API** | `publicKey` (channel UUID) + `visitorId` (crypto UUID v4) validation | Public chat endpoints (`/api/chat`) | Widget interactions — visitor can only access their own conversation |

### RLS Policies (applied in Supabase)

**`conversations` table:**

- **Policy:** `tenant_select_conversations`
- **Command:** SELECT
- **Expression:** `USING (organization_id = ANY(SELECT get_user_org_ids()))`
- Uses denormalized `organization_id` column (no JOINs) — required for walrus compatibility

**`messages` table:**

- **Policy:** `tenant_select_messages`
- **Command:** SELECT
- **Expression:** `USING (conversation_id IN (SELECT id FROM conversations WHERE organization_id = ANY(SELECT get_user_org_ids())))`
- Single JOIN through conversations (walrus can handle one level)

**`get_user_org_ids()` function:**

```sql
CREATE OR REPLACE FUNCTION get_user_org_ids()
RETURNS uuid[] AS $$
  -- Super admin: returns ALL org IDs
  -- Regular user: returns org IDs from organization_members
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

- `SECURITY DEFINER` — executes with function owner's privileges, not caller's
- `STABLE` — can be cached within a transaction
- Handles super admin (sees all orgs) vs regular user (sees membership orgs only)

**REPLICA IDENTITY FULL** enabled on both `conversations` and `messages` tables (required for Supabase Realtime to include all column values in change events).

### Realtime Auth (setAuth pattern)

`@supabase/ssr`'s `createBrowserClient` does not propagate the auth JWT to the Realtime WebSocket (supabase-js Issue #1304). To fix this:

1. On mount: `supabase.realtime.setAuth(session.access_token)` — explicitly sets JWT
2. On token refresh: `onAuthStateChange('TOKEN_REFRESHED')` re-sets auth
3. On sign out: `onAuthStateChange('SIGNED_OUT')` removes all channels

Without `setAuth`, all Realtime subscriptions on RLS-enabled tables silently receive zero events.

---

## Estado del Frontend (v0.3.3)

**Dependencias:** 29 paquetes, 0 vulnerabilidades conocidas
**Buenas practicas implementadas:**
- TypeScript strict en todo el proyecto
- Sin uso de `dangerouslySetInnerHTML` ni `eval()`
- `.gitignore` robusto (node_modules, .env*, .next, etc.)
- Server Components por defecto, `"use client"` solo donde es necesario
- i18n con next-intl (locale validation en routing + middleware)
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, **CSP**
- Content-Security-Policy: `default-src 'self'`, `connect-src` para Supabase, `frame-ancestors 'self'`
- Middleware auth real con Supabase `getUser()` (valida JWT server-side)
- Input validation: `maxLength` en todos los inputs, Zod en todos los server actions
- Auth callback: sanitizacion OWASP 6 capas + allowlist de hosts
- Cookies de contexto con `Secure;SameSite=Lax` + validacion UUID server-side
- Locale sanitizado contra allowlist en todos los redirects
- Passwords generados con `crypto.getRandomValues()` + Fisher-Yates shuffle
- Bootstrap user con `$transaction` Serializable (previene race condition)
- Server actions con `$transaction` para operaciones multi-paso (updateUser)
- Error logging con `console.error("[functionName]")` en todos los catch blocks
- Prisma logging: `["error"]` en prod, `["query", "error", "warn"]` en dev
- `.env.example` creado como template de variables
- UUID path param validation: `z.string().uuid()` on all widget API route params
- Body size limits: 16KB (POST /api/chat), 1KB (PATCH /api/chat/[id])
- Safe JSON parsing: try/catch on all `request.json()` calls, 400 on invalid JSON
- Zod error sanitization: generic message to client, full details logged server-side only
- Widget `visitorId` generated with `crypto.getRandomValues()` (Web Crypto API, UUID v4)
- Channel + org `isActive` validation in PATCH endpoint (403 if either is inactive)
- CORS method sync: `lib/api/cors.ts` and `next.config.ts` now declare identical allowed methods
- Cascade check: `deleteOrganization` verifica `_count.members > 0` antes de borrar (previene cascade accidental)
- TOCTOU fix: `createOrganization` captura P2002 en vez de findUnique + create (atomico, sin race condition)
- `autoComplete="off"` en inputs administrativos de organizations (name, slug, channel name)

---

## Historial de Fixes

### Resuelto en v0.1.8 (Frontend Security Hardening)

| ID | Severidad | Issue | Solucion |
|----|-----------|-------|----------|
| CRIT-01 | Critico | `next.config.ts` sin security headers | Agregados 6 headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, DNS-Prefetch |
| HIGH-04 | Alto | Sin `.env.example` | Creado con Supabase, OpenAI, Database, App URL |
| MED-03 | Medio | Search input sin `maxLength` | `maxLength={100}` en `conversation-filters.tsx` |
| HIGH-02 | Alto | Middleware sin auth check | Estructura preparada con `publicRoutes` y TODO para Supabase Auth |

### Resuelto en v0.2.3 (Security Hardening — Audit OWASP)

> Audit completo: `docs/SECURITY-AUDIT-v0.2.2.md`

| ID | Severidad | Issue | Solucion |
|----|-----------|-------|----------|
| CRIT-01 | Critico | Race condition bootstrap | `$transaction` Serializable en `getCurrentUser()` |
| CRIT-02 | Critico | Auth guard faltante en layout | `redirect("/en/login")` si `!user` |
| CRIT-03 | Critico | UUID validation en deletes | `z.string().uuid().parse(id)` en 3 funciones |
| CRIT-04 | Critico | Open redirect auth callback | 6-layer OWASP sanitization + `ALLOWED_HOSTS` allowlist |
| HIGH-01 | Alto | Locale injection en redirects | `sanitizeLocale()` valida contra `routing.locales` |
| HIGH-02 | Alto | Cookies sin security attrs | `Secure;SameSite=Lax` + UUID validation server-side |
| HIGH-03 | Alto | Sin CSP header | 9 directivas CSP environment-aware en `next.config.ts` |
| HIGH-04 | Alto | `Math.random()` en passwords | `crypto.getRandomValues()` + Fisher-Yates shuffle |
| HIGH-05 | Alto | updateUser no atomico | `prisma.$transaction` para name + membership |
| MED-01 | Medio | Orden incorrecto deleteUser | Supabase Auth primero (revoca login), Prisma despues |
| LOW-01 | Bajo | Locale regex hardcoded | Middleware importa `locales` de routing config |
| LOW-05 | Bajo | Catch blocks sin logging | `console.error("[fn]")` en 10 catch blocks |
| LOW-06 | Bajo | Prisma sin logging | `log: ["error"]` prod, `["query","error","warn"]` dev |

### Resuelto en v0.3.2 (OWASP Hardening — Widget API)

| ID | Severidad | Issue | Solucion |
|----|-----------|-------|----------|
| FIX-1 | Medio | CORS method mismatch between `cors.ts` and `next.config.ts` | Synced `Access-Control-Allow-Methods` to `GET, POST, PATCH, OPTIONS` in both locations |
| FIX-2 | Medio | No UUID validation on `conversationId` path param | `z.string().uuid()` parse before any DB query in `app/api/chat/[id]/route.ts`; returns 400 on invalid input |
| FIX-3 | Medio | `visitorId` not validated as UUID format | `closeConversationSchema` and `getHistorySchema` in `lib/api/validate.ts` now enforce `z.string().uuid()` |
| FIX-4 | Alto | Widget used `Math.random()` to generate `visitorId` | Replaced with `crypto.getRandomValues()` (Web Crypto API); produces proper UUID v4 |
| FIX-5 | Medio | No body size limits on widget API routes | 16KB limit on `POST /api/chat`, 1KB limit on `PATCH /api/chat/[id]`; returns 413 if exceeded |
| FIX-6 | Bajo | `request.json()` not wrapped in try/catch | All API route handlers now return 400 `{ error: "Invalid JSON" }` on parse failure |
| FIX-7 | Medio | Zod error details leaked to client | Generic `{ error: "Invalid request" }` returned to client; full `error.errors` logged server-side only |
| FIX-8 | Medio | PATCH endpoint did not validate channel/org `isActive` | Added `isActive` check for channel and org; returns 403 `{ error: "Channel not active" }` if either is inactive |

---

## Pendiente: Phase 2 (Pre-Launch)

| ID | Severidad | Issue | Accion | Esfuerzo |
|----|-----------|-------|--------|----------|
| MED-02 | Medio | Sin rate limiting en login y widget API | `@upstash/ratelimit` + Redis — deferred to production phase (not needed during MVP/testing). Will use `@upstash/ratelimit` for per-IP limiting on `/api/chat` endpoints to protect against API abuse and OpenAI token exhaustion. | 30-60 min |
| ~~MED-03~~ | ~~Medio~~ | ~~Sin CORS infrastructure~~ | **Resuelto en v0.3.1/v0.3.2** — `lib/api/cors.ts` implementado con PATCH support; synced with `next.config.ts` | Done |

### Resuelto en v0.3.3 (Security Fixes — Cascade, TOCTOU, AutoComplete)

| ID | Severidad | Issue | Solucion |
|----|-----------|-------|----------|
| MED-05 | Medio | deleteOrg sin cascade check | `deleteOrganization` ahora verifica `_count.members > 0` antes de borrar. Retorna error `orgHasMembers` si la org tiene miembros activos. Previene borrado accidental en cascada de channels, conversations, messages, AI settings, etc. |
| LOW-02 | Bajo | Slug TOCTOU race condition | `createOrganization` eliminado el `findUnique` check previo. Crea directamente y captura error Prisma `P2002` (unique constraint violation). Atomico — sin race condition posible. |
| LOW-04 | Bajo | autoComplete en admin forms | `autoComplete="off"` agregado en 3 inputs de organizations: org name, org slug, channel name. Users form y AI Settings ya lo tenian. |

## Pendiente: Phase 3 (Cuando Conecte Backend)

| ID | Severidad | Issue | Accion | Esfuerzo |
|----|-----------|-------|--------|----------|
| MED-04 | Medio | Mock data en bundles cliente | Eliminar `lib/mock/data.ts`, reemplazar con server-fetched data | Parte del backend |
| MED-06 | Medio | Channel update sin ownership check | Verificar org membership cuando RBAC exista | 15 min |
| LOW-03 | Bajo | Translation keys dinamicas | Set de error keys conocidos como safeguard (riesgo teorico — keys hardcodeadas en server actions) | 10 min |

## Pendiente: Backend Original (de v0.1.8)

> Items del checklist original que siguen pendientes.

| Area | Item | Cuando |
|------|------|--------|
| Chat (XSS) | Sanitizar mensajes de chat (`DOMPurify` o texto plano) | Antes de conectar mensajes reales |
| AI Settings | Validacion Zod client+server en form (`systemPrompt`, `temperature`, etc.) | Al conectar form con API |
| i18n | Strings hardcoded en `format.ts` — migrar a traducciones | Siguiente refactor i18n |

---

## Checklist Backend Security

### Autenticacion (Supabase Auth)

- [x] Implementar Supabase Auth con PKCE flow
- [x] Activar auth check en `middleware.ts` (getUser server-side)
- [x] Crear paginas `/login`, `/forgot-password`, `/update-password`
- [x] Validar session token en cada request (middleware + layout guard)
- [ ] Implementar refresh token rotation
- [ ] Rate limiting en login (`@upstash/ratelimit`)

### Row Level Security (RLS)

- [x] Habilitar RLS en `conversations` y `messages` tables (v0.3.3)
- [x] Policies por `organization_id` (multi-tenant isolation via `get_user_org_ids()`)
- [x] Verificar que un usuario de org-A NUNCA pueda ver datos de org-B (Realtime events filtered by RLS)
- [ ] Test: intentar acceder a datos de otra organizacion (debe fallar) — manual verification pending
- [ ] Habilitar RLS en tablas restantes (channels, organizations, ai_settings, etc.)

### API Routes / Server Actions

- [x] Validacion Zod en CADA server action
- [x] `requireSuperAdmin()` guard en todas las acciones admin
- [x] Error responses genericas (no exponer stack traces)
- [x] Logging de errores server-side (`console.error("[fn]")`)
- [ ] Rate limiting con `@upstash/ratelimit`

### OpenAI / IA

- [ ] `OPENAI_API_KEY` solo en server-side (NUNCA `NEXT_PUBLIC_`)
- [ ] Rate limit por organizacion para llamadas a OpenAI
- [ ] Sanitizar system prompt antes de enviar a OpenAI (evitar prompt injection)
- [ ] Limitar tamaño de knowledge items (max chars por item)
- [ ] Validar permisos para modificar AI settings (RBAC)

### RAG / Knowledge Base

- [ ] Sanitizar contenido antes de generar embeddings
- [ ] Limitar numero de knowledge items por canal
- [ ] Validar que el canal pertenece a la organizacion del usuario
- [ ] No exponer embeddings raw al cliente

### Widget Embebible

- [ ] CORS restrictivo: solo origenes registrados por canal
- [ ] Validar `channelId` + `origin` en cada request del widget
- [ ] Rate limit por IP para el widget publico
- [ ] No exponer datos internos de la organizacion via el widget
- [ ] CSP del widget: restringir a dominio de ChatFlow360

### Variables de Entorno

- [ ] Usar `@t3-oss/env-nextjs` para validacion tipada de env vars
- [x] Variables sensibles sin prefijo `NEXT_PUBLIC_` (verificado)
- [ ] Variables requeridas: fail fast al iniciar si faltan
- [ ] Secrets diferentes por ambiente (dev / staging / production)

### Monitoreo

- [x] Logging basico en server actions y Prisma
- [ ] Error tracking (Sentry o similar)
- [ ] Alertas para auth failures repetidos (brute force detection)
- [ ] Log de acciones administrativas (audit trail)
- [ ] Health check endpoint

---

## Cuando revisar este documento

1. **Al iniciar cada fase del backend** — verificar items pendientes
2. **Antes de deploy a produccion** — todos los items HIGH deben estar resueltos
3. **Al agregar nuevas features** — evaluar si introducen nuevos vectores de ataque
4. **Trimestralmente** — revisar dependencias con `npm audit`
