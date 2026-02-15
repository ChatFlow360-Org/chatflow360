# ChatFlow360 - Changelog

> Historial completo de versiones y cambios del proyecto.

## v0.1.10 (2026-02-14)

### Login Page Polish — Branding Alignment with Website

- Logo oficial (`/logo.png`) centrado sobre "Welcome back" en panel derecho
  - `dark:brightness-0 dark:invert` para visibilidad en ambos modos
- 6 feature cards en grid 2x3 (antes eran 3 cards con descripcion)
  - Always On (Clock, emerald), More Leads (Users, emerald), One Flat Price (DollarSign, amber)
  - Built for Businesses Growth (TrendingUp, violet), More Value Less Overhead (Zap, rose), Enterprise-Level AI (Sparkles, cyan)
  - Colores individuales por card, matcheados con el sitio web (chatflow360.wpenginepowered.com)
- Branding copy actualizado: headline y subheadline alineados con el sitio web
- Dark mode fix: panel derecho usa `bg-card` (#142236) para distincion del izquierdo (#0f1c2e)
- Inputs con efecto inset: `bg-background` sobre superficie `bg-card`
- Borde sutil entre paneles: `border-r border-white/10`
- Contenido del panel izquierdo centrado horizontalmente (`items-center` + `max-w-md`)
- Mobile: logo visible en form, panel branding oculto

## v0.1.9 (2026-02-14)

### Login Page + Security Hardening

- Nueva pagina de login split-screen en `app/[locale]/(auth)/login/page.tsx`
  - Panel izquierdo: branding navy (#0f1c2e) con headline y feature cards
  - Panel derecho: formulario (email, password, forgot password, sign in, sign up link)
  - Mobile: panel branding oculto, logo centrado + form
  - ThemeToggle + language switch (EN/ES) en esquina superior derecha
- Route group `(auth)` separado de `(dashboard)` — sin sidebar/header
- ~25 nuevas translation keys en namespace `auth.*` (EN + ES)
- Security: headers configurados en `next.config.ts` (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Security: `.env.example` creado con variables template (Supabase, OpenAI, DB, App URL)
- Security: `maxLength={100}` en search input de conversations
- Security: middleware preparado con `publicRoutes` array y placeholder para Supabase Auth
- Nuevo: `docs/SECURITY.md` con audit completo y checklist para backend
- Form security: `maxLength` en email (254) y password (minLength 8, maxLength 128)

## v0.1.8 (2026-02-14)

### Dashboard Metrics Refresh + Nav Cleanup

- Sidebar: ocultar nav items "Canales" y "Reportes" (comentados, no eliminados — se abordan a futuro)
- Dashboard: "Channels Performance" renombrado a **"Top Pages"** / **"Páginas Más Relevantes"**
  - Mock data cambiado de channel names a page URLs (`/services`, `/pricing`, `/contact`) con `font-mono`
- Dashboard: "Avg Response Time" reemplazado por **"Avg Session Time"** / **"Tiempo Promedio de Uso"** (mock: 4.2m)
- Dashboard: "Resolution Rate" reemplazado por 2 nuevas metricas:
  - **"AI Handled"** / **"Resueltas por IA"** — % de conversaciones resueltas por IA sin humano (mock: 87%)
  - **"New Visitors"** / **"Visitantes Nuevos"** — visitantes unicos que inician chat (mock: 156)
- Stat cards: ahora son 5 (grid `lg:grid-cols-5`), antes eran 4
- Stat card: borde izquierdo teal ahora sigue `border-radius` del card (pseudo-elemento `rounded-l-lg` en vez de `border-l`)
- Iconos actualizados: `Bot` para AI Handled, `UserPlus` para New Visitors

## v0.1.7 (2026-02-14)

### UI Polish — Interface Design Audit

- Audit completo de light/dark mode con skill `/interface-design`
- Fix: sidebar header separator (`border-b border-sidebar-border`) para separacion visual logo/nav
- Fix: sidebar border contrast en light mode (`--sidebar-border: #b0bfcb`, antes era invisible `#dce4ea`)
- Fix: card surfaces con cool tint sutil (`--card: #fafcfe` en vez de `#ffffff` puro)
- Fix: card shadows reforzados (+2% opacidad en navy-tinted shadows)
- Fix: filter tabs con `border border-border/50` para definicion visual del container
- Fix: search input dark mode con `dark:bg-muted/30 dark:border-muted-foreground/20`
- Fix: date range picker trigger con `rounded-full` (chip/pill shape diferenciado)
- Fix: headings h1 con `tracking-tight` en todas las pages (5 archivos)
- Fix: `--destructive` desaturado en dark mode (`#e25555` en vez de `#ef4444`)
- Nuevo: `.interface-design/system.md` — memoria del skill con decisiones de implementacion UI
- Verificado visualmente en 4 combinaciones: Light EN, Light ES, Dark EN, Dark ES

## v0.1.6 (2026-02-13)

### Conversation Detail Panel — Two-Column Layout + Mobile Drawer

- Conversation detail panel rediseñado con layout de dos columnas en desktop (820px total)
  - Columna izquierda: chat con scroll interno (header + messages + input footer fijo)
  - Columna derecha: lead details sidebar (320px) con perfil, info de conversacion, canal y acciones rapidas
- Mobile: boton Info (reemplazo del back button) abre Bottom Sheet Drawer (vaul) con lead details
- Lead details content extraido en variable reutilizable entre desktop sidebar y mobile drawer
- Nuevo componente `drawer.tsx` (shadcn/ui basado en vaul)
- Fix: scroll interno del chat en mobile — `overflow-hidden` en contenedor + `min-h-0` en chat column (clasico bug flexbox vertical)
- Fix: scroll interno del chat en desktop — `min-h-0` en ScrollArea para constraining en flex parent
- Mock data expandido: conv-2 (John Smith) de 4 a 15 mensajes con handoff AI→Humano realista
- Panel width responsive: mobile full-width, sm 480px (single col), lg 820px (two cols)
- Chat bubbles mejorados: rounded-2xl, visitor bg-muted dark:bg-muted/80, AI/agent bg-cta/10 dark:bg-cta/20
- i18n: 11 nuevas keys en `conversations.detail.*` (EN + ES)
- Verificado en 4 viewports: Desktop light/dark, Mobile light/dark

## v0.1.5 (2026-02-13)

### Soporte Bilingue EN/ES con next-intl

- Implementacion completa de i18n con next-intl v4 y URL-based routing (`/en/`, `/es/`)
- Middleware para auto-deteccion de idioma del browser y routing automatico
- ~160 strings traducidas en EN y ES organizadas en 9 namespaces
- Reestructuracion de App Router: `app/[locale]/(dashboard)/*` para soporte de locale en URL
- Root layout minimal + locale layout con NextIntlClientProvider
- Header: toggle EN/ES funcional con `useLocale()` + `router.replace()` para cambio de idioma
- Sidebar: navegacion locale-aware con `Link` de next-intl (auto-prefix de locale)
- Dashboard: stats, recent conversations, channels performance, AI performance — todo traducido
- Conversations: filtros, cards, detalle, status badges, handler labels — todo traducido
- Settings AI: tabs, form labels, placeholders, botones, preview — ~35 strings traducidas
- Formato de fechas locale-aware: "hace 23h" (ES) vs "23h ago" (EN), "13 feb 2026" vs "Feb 13, 2026"
- Date range picker: presets y labels traducidos
- TypeScript autocomplete para translation keys via `types/i18n.d.ts`
- Cookie `NEXT_LOCALE` para persistencia de preferencia de idioma
- Regla 13 actualizada en RULES.md con guia completa de i18n
- Regla 14 nueva: matriz de verificacion visual (Light/Dark x EN/ES)
- Verificado visualmente en las 4 combinaciones: Light EN, Light ES, Dark EN, Dark ES
- Fix: Calendar range picker se cerraba al primer click (compatibilidad react-day-picker v9)
- Fix: Date picker responsive en mobile (flex-col + right alignment para boton Apply)

## v0.1.4 (2026-02-12)

### Light Mode Premium + Elevation System

- Cool-tinted light mode: background, borders, sidebar y muted colors con tonos navy/teal del brandbook (no mas grises neutros)
- Sistema de elevacion (box-shadow) para cards en ambos modos: navy-tinted en light, depth sutil en dark
- Sidebar con sombra lateral sutil en light mode para separacion visual
- Header con shadow inferior para jerarquia visual
- Stat cards con borde izquierdo teal (border-l-cta) como acento de identidad
- Conversation cards con micro-elevacion en hover (translate-y + shadow intensificado)
- Zebra striping en Recent Conversations (bg-muted/60 en filas impares, empieza desde fila 1)
- Espaciado mejorado entre filas de la tabla (space-y-1.5 + py-3)

## v0.1.3 (2026-02-12)

### Dashboard UI Components + Date Filters

- DateRangePicker reusable: popover con Calendar dual + presets (7d/30d/90d), future dates deshabilitados
- Date range filter en Dashboard y Conversations (default: ultimos 30 dias)
- DashboardClient wrapper para estado de date range
- Conversation detail panel con overlay via createPortal (backdrop blur-md + bg-black/60)
- Portal SSR-safe con patron mounted state (evita hydration mismatch)
- Language toggle moderno: segmented control EN|ES con estado activo (shadow + bg-card)
- Escape key cierra panel de detalle

## v0.1.2 (2026-02-12)

### Frontend Setup Inicial + Theme System

- Proyecto Next.js 16 con App Router, TypeScript strict, Tailwind CSS v4
- Shadcn UI inicializado con componentes: button, card, badge, input, textarea, select, separator, avatar, dropdown-menu, sheet, tabs, slider, switch, label, scroll-area, dialog, popover, calendar
- Theme system: dark/light con next-themes, CSS variables semanticas, light mode como default
- Sidebar (260px): logo, nav links, theme toggle, user info, responsive con Sheet en mobile
- Header: org name, fecha, notificaciones, avatar, language toggle
- Dashboard Home: 4 stat cards, recent conversations, channels performance, AI performance
- Conversations: grid de cards con filtros (All/Active/AI/Human) + search + panel de detalle
- Settings AI: tabs Instructions (system prompt, model, temperature, max tokens, handoff keywords) + Knowledge Base
- Mock data completo: organizacion, usuario, conversaciones, mensajes, AI settings
- Tipos TypeScript basados en DATA-MODELS.md
- Paleta de colores matcheada con design.pen (dark navy scheme + light cool-tinted)
- Regla 12 agregada en RULES.md (theme system)
- Actualizacion de BRANDBOOK.md con tabla completa de tokens por modo

## v0.1.1 (2026-02-12)

### Sistema RAG con Supabase Vector

- Incorporacion de RAG al MVP (antes estaba excluido)
- Separacion de **Instrucciones** (system prompt) y **Conocimiento** (RAG) como conceptos independientes
- Definicion de tabla `channel_knowledge` con pgvector (VECTOR(1536))
- Funciones SQL: `search_channel_knowledge`, `insert_channel_knowledge`
- Estrategia de chunking (~1000 chars, 200 overlap)
- Embeddings con OpenAI `text-embedding-3-small`
- API endpoints para CRUD de conocimiento por canal
- Documentacion: docs/RAG-KNOWLEDGE.md
- Actualizacion de ARCHITECTURE.md, DATA-MODELS.md, INDEX.md, CLAUDE.md

## v0.1.0 (2026-02-12)

### Inicio del Proyecto

- Definicion de arquitectura: Next.js 14+ / TypeScript / Supabase / Prisma
- Definicion de schema Prisma con 7 modelos
- Definicion de API routes (publicas, protegidas, super admin)
- Design system: colores, variables CSS, Tailwind config
- Estructura de carpetas del proyecto
- Documentacion inicial:
  - CLAUDE.md (contexto rapido)
  - docs/INDEX.md (indice maestro)
  - docs/ARCHITECTURE.md (stack y decisiones)
  - docs/DATA-MODELS.md (schema y relaciones)
  - docs/RULES.md (reglas de desarrollo)
  - docs/DATABASE-MIGRATIONS.md (guia migraciones)
  - brand/BRANDBOOK.md (identidad visual)

---

**Formato de entradas:**

```
## vX.Y.Z (YYYY-MM-DD)

### Titulo del Release

- Cambio 1
- Cambio 2
- Fix: descripcion del bug fix
```
