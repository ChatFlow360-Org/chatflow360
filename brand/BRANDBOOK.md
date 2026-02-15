# ChatFlow360 - Brandbook

> Identidad visual, colores, tipografia y design system.

## Paleta de Colores

### Variables CSS

```css
/* ===== LIGHT MODE (default) ===== */
:root {
  /* Primary */
  --primary-dark: #1c2e47;
  --primary-light: #6cb5d6;

  /* Secondary (Grays) */
  --gray-dark: #212121;
  --gray-light: #f4f4f4;

  /* CTA */
  --cta: #2f92ad;

  /* Semantic */
  --background: #f4f4f4;
  --foreground: #212121;
  --card: #ffffff;
  --border: #e5e5e5;

  /* Surfaces */
  --surface: #ffffff;
  --surface-hover: #e8e8e8;
  --muted: #6b7280;
  --muted-foreground: #9ca3af;
}

/* ===== DARK MODE ===== */
.dark {
  --primary-dark: #6cb5d6;
  --primary-light: #8ecde6;

  --gray-dark: #f4f4f4;
  --gray-light: #1a1a2e;

  --cta: #3ba8c4;

  --background: #0f0f23;
  --foreground: #e4e4e7;
  --card: #1a1a2e;
  --border: #2a2a3e;

  --surface: #1a1a2e;
  --surface-hover: #2a2a3e;
  --muted: #9ca3af;
  --muted-foreground: #6b7280;
}
```

### Tailwind Config

```javascript
// tailwind.config.js
colors: {
  primary: {
    DEFAULT: '#1c2e47',   // Azul oscuro - headers, nav, textos principales
    light: '#6cb5d6',     // Azul claro - acentos, links, hover states
  },
  secondary: {
    dark: '#212121',      // Gris oscuro - texto body
    light: '#f4f4f4',     // Gris claro - fondos
  },
  cta: '#2f92ad',         // Teal - botones de accion, CTAs
}
```

### Uso de Colores por Modo

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| --background | `#f4f4f4` | `#0f0f23` | Fondo de pagina |
| --foreground | `#212121` | `#e4e4e7` | Texto principal |
| --card | `#ffffff` | `#1a1a2e` | Tarjetas, modales |
| --border | `#e5e5e5` | `#2a2a3e` | Bordes, separadores |
| --cta | `#2f92ad` | `#3ba8c4` | Botones, CTAs |
| --primary-dark | `#1c2e47` | `#6cb5d6` | Headers, nav |
| --primary-light | `#6cb5d6` | `#8ecde6` | Acentos, links |
| --surface | `#ffffff` | `#1a1a2e` | Superficies elevadas |
| --muted | `#6b7280` | `#9ca3af` | Texto secundario |

## Tipografia

- **Font family:** System font stack (o Inter si se decide custom)
- **Pesos:** Regular (400), Medium (500), SemiBold (600), Bold (700)

### Escala Tipografica

| Elemento | Tamano | Peso |
|----------|--------|------|
| H1 | 2rem (32px) | Bold (700) |
| H2 | 1.5rem (24px) | SemiBold (600) |
| H3 | 1.25rem (20px) | SemiBold (600) |
| Body | 1rem (16px) | Regular (400) |
| Small | 0.875rem (14px) | Regular (400) |
| Caption | 0.75rem (12px) | Medium (500) |

## Personalidad de Marca

- **Profesional** pero accesible
- **Moderno** y limpio
- **Confiable** - transmite seguridad para negocios
- **Bilingue** - inclusivo para audiencia EN/ES

## Theme System (Dark / Light)

- **Default:** Light mode
- **Toggle:** El usuario puede cambiar entre dark y light desde el dashboard
- **Persistencia:** Preferencia guardada en localStorage + cookie (para SSR)
- **Implementacion:** Clase `dark` en `<html>` + CSS variables
- **Tailwind:** Usar `dark:` prefix para overrides puntuales
- Todos los componentes DEBEN respetar las CSS variables semanticas (`--background`, `--foreground`, `--card`, etc.)
- NUNCA usar colores hardcodeados; siempre referenciar variables

## UI Components (Shadcn)

El proyecto usa Shadcn UI como base de componentes. Los colores se aplican via CSS variables y Tailwind classes. Shadcn ya soporta dark mode nativo via CSS variables.

### Botones

```
Primary:   bg-cta text-white hover:bg-cta/90
Secondary: bg-primary text-white hover:bg-primary/90
Ghost:     hover:bg-secondary-light text-secondary-dark
Outline:   border-border text-secondary-dark hover:bg-secondary-light
```

### Chat Bubbles (Widget)

```
Visitor:   bg-secondary-light text-secondary-dark (izquierda)
AI/Agent:  bg-primary-light/10 text-secondary-dark (derecha)
```
