# Subagent Workflows - ChatFlow360

> Protocolo para uso de subagentes especializados en paralelo. Maximiza velocidad y calidad ejecutando multiples agentes simultaneamente.

## Principio General

Cuando una tarea involucra multiples dimensiones (implementacion + types + docs + tests), lanzar subagentes en paralelo en lugar de hacerlo secuencialmente. El agente principal coordina y consolida resultados.

## Workflows por Tipo de Tarea

### 1. Feature Nuevo (pagina, componente complejo)

| Agente | Tarea |
|--------|-------|
| **frontend-developer** | Implementar componente/pagina con React, Tailwind, accesibilidad |
| **typescript-pro** | Revisar/crear types, interfaces, validaciones Zod |
| **docs-architect** | Actualizar CHANGELOG, ARCHITECTURE si aplica |

**Trigger:** Cuando se pida crear una pagina nueva, componente complejo, o feature multi-archivo.

### 2. Code Review / Pre-merge

| Agente | Tarea |
|--------|-------|
| **code-reviewer** | Calidad de codigo, patterns, bugs potenciales, maintainability |
| **security-auditor** | Vulnerabilidades OWASP, XSS, SQL injection, auth issues |
| **performance-engineer** | Core Web Vitals, renders innecesarios, bundle size |

**Trigger:** Antes de dar por terminado un feature grande, o cuando se pida revision explicita.

### 3. Backend / API Routes

| Agente | Tarea |
|--------|-------|
| **backend-architect** | Disenar API routes, endpoints, middleware, error handling |
| **typescript-pro** | Types compartidos frontend/backend, Zod schemas, validacion |
| **test-automator** | Tests unitarios e integracion para endpoints |

**Trigger:** Cuando se implementen API routes, server actions, o integracion con Supabase/Prisma.

### 4. Debugging

| Agente | Tarea |
|--------|-------|
| **debugger** | Root cause analysis, fix propuesto |
| **Explore** | Buscar patterns similares en codebase que puedan tener el mismo bug |

**Trigger:** Cuando se reporte un bug o comportamiento inesperado.

### 5. Integraciones Externas

| Agente | Tarea |
|--------|-------|
| **meta-waba-expert** | WhatsApp Business API, Cloud API, webhooks, templates |
| **n8n-expert** | Workflows de automatizacion, triggers, nodes |
| **backend-architect** | Webhooks, API design, event handling |

**Trigger:** Cuando se trabaje en integraciones con WhatsApp, Facebook, o n8n.

### 6. Infraestructura / Deploy

| Agente | Tarea |
|--------|-------|
| **deployment-engineer** | CI/CD, Vercel config, GitHub Actions |
| **security-auditor** | Variables de entorno, secrets, headers de seguridad |

**Trigger:** Cuando se configure deploy, CI/CD, o variables de entorno.

### 7. Documentacion Masiva

| Agente | Tarea |
|--------|-------|
| **docs-architect** | Documentacion tecnica, guias de arquitectura |
| **tutorial-engineer** | Guias de onboarding, tutoriales paso a paso |

**Trigger:** Cuando se pida documentar un sistema completo o crear guias.

## Agentes Siempre Disponibles (bajo demanda)

| Agente | Uso |
|--------|-----|
| **Explore** | Exploracion rapida de codebase, buscar archivos/patterns |
| **Plan** | Disenar planes de implementacion antes de ejecutar |
| **general-purpose** | Tareas complejas multi-step que no encajan en los workflows |

## Reglas de Ejecucion

1. **Paralelismo:** Lanzar todos los agentes relevantes en un solo mensaje cuando las tareas son independientes
2. **Consolidacion:** El agente principal revisa, integra y presenta resultados coherentes
3. **No duplicar:** Si un subagente investiga algo, el agente principal no repite esa busqueda
4. **Background:** Tareas largas (docs, tests extensos) se lanzan en background para no bloquear
5. **Contexto:** Dar a cada subagente solo el contexto necesario para su tarea especifica
6. **Verificacion visual:** Despues de cambios UI, siempre validar con Playwright MCP (light + dark, EN + ES)
