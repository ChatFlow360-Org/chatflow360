# ChatFlow360 - Reglas de Desarrollo

> Reglas obligatorias para todo el desarrollo del proyecto.

## Regla 1: TypeScript Estricto

- Usar TypeScript en modo strict en todo el proyecto
- Tipar TODO: props, retornos, variables
- Usar Zod para validacion de inputs
- No usar `any` salvo casos justificados

## Regla 2: Server Components por Defecto

- Preferir Server Components siempre que sea posible
- Solo usar `"use client"` cuando sea necesario (interactividad, hooks, browser APIs)
- Separar logica de servidor y cliente claramente

## Regla 3: Naming Conventions

| Contexto | Convencion | Ejemplo |
|----------|-----------|---------|
| Archivos | kebab-case | `user-profile.tsx` |
| Componentes | PascalCase | `UserProfile` |
| Funciones/variables | camelCase | `getUserProfile` |
| Base de datos | snake_case | `user_profile` |
| API routes | kebab-case | `/api/user-profile` |

## Regla 4: Estructura de Componentes

```typescript
// components/chat/message-bubble.tsx
interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
}

export function MessageBubble({ message, isOwn = false }: MessageBubbleProps) {
  // ...
}
```

- Exportar como named export (no default)
- Interface de props declarada arriba del componente
- Props destructuradas con defaults

## Regla 5: Prisma para Queries, Supabase para Realtime/Auth

```typescript
// Prisma - queries, CRUD, joins
import { prisma } from '@/lib/db/prisma';

// Supabase - realtime subscriptions
import { createClient } from '@/lib/supabase/client';

// Supabase - auth verification en server
import { createClient } from '@/lib/supabase/server';
```

Nunca mezclar: no usar Supabase para queries normales, no intentar realtime con Prisma.

## Regla 6: Validacion con Playwright MCP

Cuando Leo suba cambios a produccion:
- Revisar en 3 breakpoints: Desktop (1920x1080), Tablet (768x1024), Mobile (390x844)
- En mobile, verificar scroll nativo y que todas las secciones se muestren
- Tomar screenshots para documentar problemas visuales
- Esperar confirmacion de Leo antes de re-verificar

## Regla 7: Seguridad

- Usar Supabase RLS para autorizacion
- Validar inputs del lado del servidor con Zod
- No exponer datos sensibles en el cliente
- Sanitizar contenido de mensajes
- Rate limiting en endpoints publicos (widget)

## Regla 8: Mobile-First

- Disenar desde mobile hacia desktop
- Breakpoints: 390px (mobile) > 768px (tablet) > 1024px+ (desktop)
- Probar scroll y touch en mobile

## Regla 9: Codigo Limpio

- Funciones pequenas y con proposito unico
- Variables con nombres semanticos y descriptivos
- No comentarios obvios; solo cuando la logica no es evidente
- No sobre-ingenieria: resolver el problema actual, no el hipotetico

## Regla 10: Sin Emojis

- No usar emojis en codigo, documentacion tecnica, ni comunicacion a menos que Leo lo pida explicitamente

## Regla 11: Prisma Client Singleton

Siempre usar el singleton para evitar conexiones excesivas:

```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Regla 12: Theme System (Dark / Light)

- Light mode por defecto
- Clase `dark` en `<html>` para activar dark mode
- SIEMPRE usar CSS variables semanticas (`--background`, `--foreground`, `--card`, etc.)
- NUNCA hardcodear colores directamente (ej: `bg-white` o `text-black`)
- Usar `dark:` prefix de Tailwind solo para casos puntuales que las variables no cubran
- Persistir preferencia en localStorage + cookie (SSR-safe)
- Todo componente nuevo debe verse bien en ambos modos

## Regla 13: Bilingue (EN/ES) - OBLIGATORIO

Todo componente, pagina o feature nuevo **DEBE** soportar ingles y espanol desde el primer commit.

- **Libreria:** next-intl v4 con URL-based routing (`/en/`, `/es/`)
- **Traducciones:** `lib/i18n/messages/en.json` + `es.json` — agregar strings a AMBOS archivos
- **Hooks:** usar `useTranslations("namespace")` para textos, `useLocale()` para locale actual
- **Navegacion:** usar `Link`, `useRouter`, `usePathname` de `@/lib/i18n/navigation` (NO de next/link)
- **Formato de fechas/tiempos:** pasar `locale` a funciones de formato (`formatRelativeTime`, `formatTime`)
- **NUNCA hardcodear strings** visibles al usuario en componentes — siempre via traducciones
- Widget: parametro `data-lang`, fallback a deteccion del browser
- Respuestas de IA siguen el idioma de la conversacion
- Preferencia de idioma: cookie `NEXT_LOCALE` (auto via middleware), futuro: `users.preferred_language`

### Estructura i18n

```
lib/i18n/
├── routing.ts          # defineRouting (locales, defaultLocale)
├── request.ts          # getRequestConfig (server-side)
├── navigation.ts       # Link, useRouter, usePathname (locale-aware)
└── messages/
    ├── en.json         # Traducciones EN (~160+ strings)
    └── es.json         # Traducciones ES (~160+ strings)
middleware.ts           # createMiddleware (auto-detection + routing)
types/i18n.d.ts         # IntlMessages type (autocomplete)
```

### Namespaces de traducciones

| Namespace | Contenido |
|-----------|-----------|
| `common` | save, cancel, add, delete, etc. |
| `layout` | sidebar nav, header dropdown |
| `dashboard` | stats, sections, labels |
| `conversations` | filters, status, handlers |
| `settings` | tabs, forms, buttons |
| `channels` | title, placeholder |
| `reports` | title, placeholder |
| `dateRange` | presets, labels |
| `time` | relative time strings |

## Regla 14: Consistencia Visual - Matriz de Verificacion

Todo componente nuevo **DEBE** verificarse en las 4 combinaciones antes de considerarse completo:

| | Light Mode | Dark Mode |
|---|---|---|
| **English** | Verificar | Verificar |
| **Espanol** | Verificar | Verificar |

- Textos en espanol suelen ser mas largos — verificar que no rompen layout
- Usar CSS variables semanticas (Regla 12) para que ambos modos funcionen automaticamente
- No asumir que un color se ve bien en ambos modos — siempre verificar visualmente
- Usar Playwright MCP para screenshots de verificacion cuando sea posible
