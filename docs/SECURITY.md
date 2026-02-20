# ChatFlow360 - Security Checklist

> Auditoria de seguridad del proyecto. Actualizado en v0.2.3 (2026-02-19).
> Audit completo: `docs/SECURITY-AUDIT-v0.2.2.md` (21 findings, OWASP ASVS v4.0)

## Estado del Frontend (v0.2.3)

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

---

## Pendiente: Phase 2 (Pre-Launch)

| ID | Severidad | Issue | Accion | Esfuerzo |
|----|-----------|-------|--------|----------|
| MED-02 | Medio | Sin rate limiting en login | `@upstash/ratelimit` + Redis (Supabase tiene proteccion basica) | 30-60 min |
| MED-03 | Medio | Sin CORS infrastructure | Crear `lib/api/cors.ts` con allowlist (usar cuando widget API exista) | 20 min |

## Pendiente: Phase 3 (Cuando Conecte Backend)

| ID | Severidad | Issue | Accion | Esfuerzo |
|----|-----------|-------|--------|----------|
| MED-04 | Medio | Mock data en bundles cliente | Eliminar `lib/mock/data.ts`, reemplazar con server-fetched data | Parte del backend |
| MED-05 | Medio | deleteOrg sin cascade check | Verificar members/channels antes de borrar | 15 min |
| MED-06 | Medio | Channel update sin ownership check | Verificar org membership cuando RBAC exista | 15 min |
| LOW-02 | Bajo | Slug TOCTOU race | Catch P2002 en vez de findUnique + create | 10 min |
| LOW-03 | Bajo | Translation keys dinamicas | Set de error keys conocidos como safeguard | 10 min |
| LOW-04 | Bajo | autoComplete en admin forms | `autoComplete="off"` en 3 inputs | 5 min |

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

- [ ] Habilitar RLS en TODAS las tablas de Supabase
- [ ] Policies por `organization_id` (multi-tenant isolation)
- [ ] Verificar que un usuario de org-A NUNCA pueda ver datos de org-B
- [ ] Test: intentar acceder a datos de otra organizacion (debe fallar)

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
