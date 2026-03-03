# ChatFlow360 - Indice de Documentacion

> Indice maestro del proyecto. Consulta cada archivo segun el tema que necesites.

## Arquitectura y Decisiones Tecnicas

| Documento | Descripcion |
|-----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, estructura, API routes, env vars, billing, multi-canal |
| [ARCHITECTURE-BUSINESS-LOGIC.md](./ARCHITECTURE-BUSINESS-LOGIC.md) | Logica de negocio: AI config, widget, realtime, post-chat, i18n |
| [DATA-MODELS.md](./DATA-MODELS.md) | Schema Prisma, modelos de datos, relaciones, enums |
| [DATABASE-MIGRATIONS.md](./DATABASE-MIGRATIONS.md) | Guia de migraciones Prisma + Supabase |

## Reglas y Convenciones

| Documento | Descripcion |
|-----------|-------------|
| [RULES.md](./RULES.md) | Reglas obligatorias de desarrollo, naming, componentes |
| [SUBAGENTS.md](./SUBAGENTS.md) | Workflows de subagentes en paralelo, protocolos de ejecucion |

## Historial

| Documento | Descripcion |
|-----------|-------------|
| [CHANGELOG.md](./CHANGELOG.md) | Ultimas 5 versiones + indice completo de todas |
| [changelog/v0.3-early.md](./changelog/v0.3-early.md) | Archive: v0.3.0 – v0.3.13 |
| [changelog/v0.2.md](./changelog/v0.2.md) | Archive: v0.2.0 – v0.2.3 |
| [changelog/v0.1.md](./changelog/v0.1.md) | Archive: v0.1.0 – v0.1.10 |

## Brand e Identidad Visual

| Documento | Descripcion |
|-----------|-------------|
| [BRANDBOOK.md](../brand/BRANDBOOK.md) | Design system, colores, tipografia, identidad visual |

## IA y RAG

| Documento | Descripcion |
|-----------|-------------|
| [RAG-KNOWLEDGE.md](./RAG-KNOWLEDGE.md) | Sistema RAG, embeddings, busqueda semantica, instrucciones vs conocimiento |

## Integraciones

| Documento | Descripcion | Estado |
|-----------|-------------|--------|
| AI-AGENTS.md | Configuracion OpenAI, system prompts, handoff | Implementado en codigo (lib/chat/*, lib/openai/*) |
| N8N-SETUP.md | Integracion n8n para eventos async | Pendiente |
| WIDGET.md | Widget embebible, configuracion | Implementado en codigo (public/widget/chatflow360.js) |

## Seguridad

| Documento | Descripcion |
|-----------|-------------|
| [SECURITY.md](./SECURITY.md) | Audit de seguridad frontend + checklist backend (auth, RLS, API, widget, env vars) |
| [archive/SECURITY-AUDIT-v0.2.2.md](./archive/SECURITY-AUDIT-v0.2.2.md) | Audit completo v0.2.2 (21 findings, archivado) |

## Performance (futuro)

| Documento | Descripcion | Estado |
|-----------|-------------|--------|
| PERFORMANCE.md | Optimizaciones, caching, paginacion | Pendiente |

---

**Proyecto:** ChatFlow360 - Multi-tenant Live Chat SaaS con IA
**Version actual:** v0.3.18
**Fase:** MVP Development - Semanas 1-6
**Produccion:** https://app.chatflow360.com
