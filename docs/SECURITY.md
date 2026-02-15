# ChatFlow360 - Security Checklist

> Auditoria de seguridad del frontend (v0.1.8) y checklist para desarrollo backend.
> Basado en audit de ciberseguridad realizado 2026-02-14.

## Estado del Frontend

**Dependencias:** 29 paquetes, 0 vulnerabilidades conocidas
**Buenas practicas ya implementadas:**
- TypeScript strict en todo el proyecto
- Sin uso de `dangerouslySetInnerHTML`
- `.gitignore` robusto (node_modules, .env*, .next, etc.)
- Server Components por defecto, `"use client"` solo donde es necesario
- i18n con next-intl (locale validation en routing)
- Security headers configurados en `next.config.ts` (HSTS, X-Frame-Options, CSP, etc.)
- Search input con `maxLength={100}`
- Middleware preparado para auth check (placeholder con `publicRoutes`)
- `.env.example` creado como template de variables

---

## Resuelto en v0.1.8 (Frontend Security Hardening)

| ID | Severidad | Issue | Solucion |
|----|-----------|-------|----------|
| CRIT-01 | Critico | `next.config.ts` sin security headers | Agregados 6 headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, DNS-Prefetch |
| HIGH-04 | Alto | Sin `.env.example` | Creado con Supabase, OpenAI, Database, App URL |
| MED-03 | Medio | Search input sin `maxLength` | `maxLength={100}` en `conversation-filters.tsx` |
| HIGH-02 | Alto | Middleware sin auth check | Estructura preparada con `publicRoutes` y TODO para Supabase Auth |

---

## Pendiente: Resolver al iniciar Backend

### HIGH-01: Sanitizar mensajes de chat (XSS)

**Archivo:** `components/chat/chat-message.tsx`
**Riesgo:** Cuando los mensajes vengan de usuarios reales, el contenido podria contener scripts maliciosos.
**Accion:**
```tsx
// Opcion A: Usar DOMPurify para sanitizar HTML
import DOMPurify from "dompurify";
const clean = DOMPurify.sanitize(message.content);

// Opcion B: Renderizar como texto plano (recomendado para chat)
// React ya escapa texto por defecto, pero si en el futuro
// necesitamos markdown/rich text, usar una libreria segura
```
**Cuando:** Antes de conectar mensajes reales del backend.

### HIGH-03: Mock data con info personal

**Archivo:** `lib/mock/data.ts`
**Riesgo:** Emails y nombres mock podrian filtrarse si el archivo se importa en produccion.
**Accion:**
- Cuando conectemos el backend real, eliminar `lib/mock/data.ts` completamente
- O condicionar imports con `process.env.NODE_ENV === "development"`
**Cuando:** Al reemplazar mock data con API calls reales.

### MED-01: Validar locale en i18n request

**Archivo:** `lib/i18n/request.ts`
**Riesgo:** Si el locale no se valida contra la lista permitida, podria haber path traversal.
**Accion:**
```ts
// Verificar que next-intl ya valida contra routing.locales
// Si no, agregar check explicito:
const validLocales = ["en", "es"];
if (!validLocales.includes(requestedLocale)) {
  return defaultLocale;
}
```
**Cuando:** Revisar al configurar el backend.

### MED-02: Strings hardcoded en format.ts

**Archivo:** `lib/utils/format.ts`
**Riesgo:** Algunas strings de tiempo estan fuera del sistema i18n.
**Accion:** Migrar a usar traducciones de `time.*` namespace consistentemente.
**Cuando:** Siguiente refactor de i18n.

### MED-04: Forms sin validacion Zod

**Archivo:** `app/[locale]/(dashboard)/settings/ai/settings-ai-client.tsx`
**Riesgo:** System prompt, temperature, max tokens sin validacion client-side.
**Accion:**
```ts
import { z } from "zod";

const aiSettingsSchema = z.object({
  systemPrompt: z.string().min(1).max(4000),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(100).max(4096),
  handoffKeywords: z.array(z.string().max(50)).max(20),
});
```
**Cuando:** Al conectar el form con el API real. Validar en AMBOS lados (client + server).

### MED-05: Root layout sin lang attribute

**Archivo:** `app/layout.tsx`
**Riesgo:** Accesibilidad — el `<html>` del root layout no tiene `lang`.
**Accion:** El locale layout ya lo tiene (`<html lang={locale}>`), pero verificar que el root no lo sobreescriba.
**Cuando:** Verificar que no haya conflicto al hacer build de produccion.

### LOW-01 a LOW-03: Mejoras menores

| ID | Issue | Accion |
|----|-------|--------|
| LOW-01 | `suppressHydrationWarning` sin comentario | Agregar comentario explicando por que (next-themes) |
| LOW-02 | `channelId` fallback hardcoded | Eliminar cuando tengamos channels reales |
| LOW-03 | `Date.now()` para IDs temporales | Usar `crypto.randomUUID()` en produccion |

---

## Checklist Backend Security

### Autenticacion (Supabase Auth)

- [ ] Implementar Supabase Auth con PKCE flow (no implicit)
- [ ] Activar auth check en `middleware.ts` (descomentar bloque TODO)
- [ ] Crear paginas `/login`, `/signup`, `/forgot-password`
- [ ] Validar session token en cada API route
- [ ] Implementar refresh token rotation
- [ ] Agregar CSRF protection en forms que mutan datos

### Row Level Security (RLS)

- [ ] Habilitar RLS en TODAS las tablas de Supabase
- [ ] Policies por `organization_id` (multi-tenant isolation)
- [ ] Verificar que un usuario de org-A NUNCA pueda ver datos de org-B
- [ ] Test: intentar acceder a datos de otra organizacion (debe fallar)

### API Routes

- [ ] Validacion Zod en CADA endpoint (request body + query params)
- [ ] Rate limiting con `@upstash/ratelimit` o similar
- [ ] Error responses genericas (no exponer stack traces ni detalles internos)
- [ ] Logging de errores server-side (no en response al cliente)

### OpenAI / IA

- [ ] `OPENAI_API_KEY` solo en server-side (NUNCA `NEXT_PUBLIC_`)
- [ ] Rate limit por organizacion para llamadas a OpenAI
- [ ] Sanitizar system prompt antes de enviar a OpenAI (evitar prompt injection)
- [ ] Limitar tamaño de knowledge items (max chars por item)
- [ ] Validar que el user tiene permisos para modificar AI settings de su org

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
- [ ] Verificar que NINGUNA variable sensible tenga prefijo `NEXT_PUBLIC_`
- [ ] Variables requeridas: fail fast al iniciar si faltan
- [ ] Secrets diferentes por ambiente (dev / staging / production)

### Monitoreo

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
