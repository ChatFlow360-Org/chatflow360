# CLAUDE.md - ChatFlow360

> **Version:** v0.3.9 | **Fase:** MVP Development (Semanas 1-6)

## Quick Context

- **Producto:** SaaS B2B - Live Chat multi-tenant con IA
- **Mercado:** Miami businesses, audiencia bilingue EN/ES
- **Stack:** Next.js 14+ (App Router) / TypeScript / Supabase / Prisma / OpenAI
- **RAG:** Supabase Vector (pgvector) para base de conocimiento
- **Hosting:** Vercel → https://app.chatflow360.com

## Flujo Core

```
Super Admin → Organizations → Channels (website widget) → Conversations → Messages
AI responde con RAG (conocimiento) + instrucciones | Human takeover via keyword trigger
```

### IA: Instrucciones vs Conocimiento (separados)

- **Instrucciones** = como se comporta la IA (tono, reglas, personalidad) → `ai_settings.system_prompt`
- **Conocimiento** = info factual que consulta via RAG (FAQs, precios, servicios) → `channel_knowledge` + pgvector

## Documentacion Completa

> Consultar bajo demanda. No cargar todo en contexto.

| Documento | Contenido |
|-----------|-----------|
| [docs/INDEX.md](docs/INDEX.md) | Indice maestro - navega toda la documentacion |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, estructura, API routes, decisiones tecnicas |
| [docs/DATA-MODELS.md](docs/DATA-MODELS.md) | Schema Prisma, modelos, relaciones, enums |
| [docs/RULES.md](docs/RULES.md) | Reglas obligatorias de desarrollo |
| [docs/DATABASE-MIGRATIONS.md](docs/DATABASE-MIGRATIONS.md) | Guia de migraciones Prisma + Supabase |
| [docs/RAG-KNOWLEDGE.md](docs/RAG-KNOWLEDGE.md) | Sistema RAG, embeddings, busqueda semantica |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Historial de versiones y cambios |
| [docs/SUBAGENTS.md](docs/SUBAGENTS.md) | Workflows de subagentes en paralelo |
| [docs/SECURITY.md](docs/SECURITY.md) | Audit de seguridad + checklist backend |
| [brand/BRANDBOOK.md](brand/BRANDBOOK.md) | Design system, colores, tipografia |

## Reglas Criticas

1. **TypeScript strict** - Tipar todo, Zod para validacion
2. **Prisma para queries** - Supabase solo para Auth y Realtime
3. **Server Components por defecto** - `"use client"` solo cuando sea necesario
4. **Naming:** archivos kebab-case, componentes PascalCase, funciones camelCase, DB snake_case
5. **Prisma Client Singleton** - Siempre usar `@/lib/db/prisma`
6. **Seguridad:** RLS, validacion server-side, no exponer datos sensibles
7. **RAG:** Tabla `channel_knowledge` con pgvector - NUNCA usar `prisma db push` (eliminaria columnas vector)
8. **i18n obligatorio** - Todo string visible al usuario via `useTranslations()`, NUNCA hardcodear texto. Ver Regla 13
9. **Verificacion 4-way** - Todo componente nuevo debe verse bien en Light EN, Light ES, Dark EN, Dark ES. Ver Regla 14

## Enfoque Hibrido Prisma + Supabase

| Caso | Herramienta |
|------|-------------|
| Queries, CRUD, Joins | Prisma |
| Migraciones | Prisma Migrate |
| Realtime | Supabase SDK |
| Auth | Supabase Auth |
| RAG / Vectores | Supabase Vector (pgvector) via SQL |

## Comandos Basicos

```bash
npm run dev                    # Development
npx prisma generate            # Generar client
npx prisma migrate dev         # Crear migracion
npx prisma studio              # Browser visual DB
npm run build                  # Build produccion
```

## Estado Actual

**v0.3.9** - Post-Chat Backend (end-to-end) + Security Hardening. Rating endpoint (`POST /api/widget/rating`), transcript email via Resend (`POST /api/widget/transcript`), branded HTML email renderer (`lib/email/transcript.ts`), widget JS multi-step flow (confirm → rating → transcript → success). Domain `chatflow360.com` verified in Resend. Security fixes deployed (commit c7ecb58): transcript anti-spam (1 per conversation via `metadata.transcriptSent`), tenant isolation in admin server actions (`getConversationMessages`, `closeConversation`, `sendAgentMessage`), orgName header injection prevention, logoUrl Zod allowlist (HTTPS/data:image only), body size via `request.text()` (all 4 routes), widget `safeHex()` CSS color guard, 200-message query cap, single-quote escaping in email HTML. Logo upload functional (base64 data URL, 100KB max). Mock data removed. Pendiente: rate limiting (Upstash Redis — CRIT-01, deferred).
