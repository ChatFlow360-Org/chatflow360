# Self-Service Sign-Up Flow — Implementation Plan

> **Status:** Planned (not yet implemented)
> **Target version:** v0.4.x
> **Created:** 2026-03-05

## Context

ChatFlow360 actualmente solo permite crear usuarios via Super Admin. Necesitamos un flujo self-service donde usuarios llegan desde un Landing Page (WordPress) tras pagar via Square. El LP hace redirect a nuestra app con params firmados (HMAC) y el usuario completa su registro en un wizard de 3 pasos.

**Flujo completo:**
```
WordPress LP → Square pago → redirect con HMAC → /sign-up wizard → dashboard
```

**Seguridad en 2 fases:**
- **Fase 1 (ahora):** HMAC-SHA256 + `consumed_payment` table + 10min timestamp
- **Fase 2 (futuro):** Agregar verificacion contra Square API (aditivo, no cambia nada)

---

## PHASE 0: Database Migration (`fullName` → `firstName` + `lastName`)

**Por que primero:** Todo lo demas depende de esta estructura. Solo 3 usuarios existen.

### 0.1 Schema — `prisma/schema.prisma`

Reemplazar en model User:
```prisma
# ANTES:
fullName  String?  @map("full_name")

# DESPUES:
firstName String?  @map("first_name")
lastName  String?  @map("last_name")
```

### 0.2 Migration SQL

```bash
npx prisma migrate dev --name split_fullname_to_first_last
```

**Editar la migracion generada** para incluir data migration ANTES del DROP:
```sql
ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN "last_name" TEXT;

UPDATE "users" SET
  "first_name" = CASE
    WHEN "full_name" IS NOT NULL AND position(' ' in "full_name") > 0
    THEN left("full_name", position(' ' in "full_name") - 1)
    ELSE "full_name"
  END,
  "last_name" = CASE
    WHEN "full_name" IS NOT NULL AND position(' ' in "full_name") > 0
    THEN substring("full_name" from position(' ' in "full_name") + 1)
    ELSE NULL
  END;

ALTER TABLE "users" DROP COLUMN "full_name";
```

### 0.3 Actualizar todas las referencias a `fullName`

| Archivo | Cambio |
|---------|--------|
| `lib/auth/user.ts` (L35, L60) | `fullName: metadata` → `firstName/lastName: metadata` |
| `lib/admin/actions.ts` (L184, 192, 208, 249, 308) | Zod schemas + Prisma create/update |
| `app/[locale]/(dashboard)/layout.tsx` (L63) | userName display |
| `app/[locale]/(dashboard)/users/page.tsx` (L29) | Serializacion |
| `app/[locale]/(dashboard)/users/users-client.tsx` | Interface, form, display, getInitials() |

### 0.4 Helper — `lib/utils/format.ts`

```typescript
export function formatUserName(firstName: string | null, lastName: string | null, email: string): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : email;
}
```

### 0.5 Admin "New User" dialog — `users-client.tsx`

Reemplazar input unico `fullName` con grid 2 columnas (firstName + lastName).

### 0.6 i18n — `en.json` + `es.json`

- Remover `"fullName"` keys
- Agregar `"firstName": "First Name"` / `"Nombre"` y `"lastName": "Last Name"` / `"Apellido"`

---

## PHASE 1: Security Layer

### 1.1 Env Vars

```
SIGNUP_HMAC_SECRET=<64-char-hex>
```
Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**NO usar prefijo `NEXT_PUBLIC_`** — es server-only.

### 1.2 Modelo `ConsumedPayment` — `prisma/schema.prisma`

```prisma
model ConsumedPayment {
  id        String   @id @default(uuid()) @db.Uuid
  paymentId String   @unique @map("payment_id")
  email     String
  plan      String
  createdAt DateTime @default(now()) @map("created_at")
  @@map("consumed_payments")
}
```

RLS: `ALTER TABLE "consumed_payments" ENABLE ROW LEVEL SECURITY;` (sin policies — server-only).

### 1.3 HMAC Verification — `lib/signup/verify-hmac.ts`

- Canonical string (sorted keys): `email|firstName|lastName|pid|plan|ts`
- `crypto.timingSafeEqual()` para comparison
- 10-minute timestamp expiry
- Fail fast: timestamp check antes de HMAC computation

---

## PHASE 2: Sign-Up Server Action — `lib/signup/actions.ts`

### Zod Schema

```typescript
const signupSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  confirmPassword: z.string().min(8).max(128),
  orgName: z.string().min(1).max(100),
  websiteUrl: z.string().url().max(500),
  plan: z.enum(["starter", "pro", "growth"]),
  pid: z.string().min(1),
  ts: z.string().min(1),
  sig: z.string().min(1),
}).refine(d => d.password === d.confirmPassword, { path: ["confirmPassword"] });
```

### Action: `signup()` — Orden de ejecucion

```
1. Zod validate
2. verifySignupHmac() ← fast, CPU only, fail first
3. Check consumed_payment (prevent replay)
4. admin.createUser() en Supabase Auth (email_confirm: true)
5. Prisma $transaction:
   - user.create({ id: supabaseUserId, firstName, lastName, email })
   - organization.create({ name, slug, plan, aiSettings: { create: defaults } })
   - organizationMember.create({ userId, orgId, role: "owner" })
   - channel.create({ orgId, name: hostname, type: "website", publicKey: randomUUID() })
   - consumedPayment.create({ paymentId: pid, email, plan })
6. Si Prisma falla → rollback: admin.deleteUser(userId)
7. Auto-login: signInWithPassword({ email, password })
8. redirect(`/${locale}/`)
```

**Patron de referencia:** `lib/admin/actions.ts` L199-270 (createUser con rollback).

**Slug:** `orgName → kebab-case` + `-` + `userId.slice(0,8)` para unicidad.

**Channel name:** `new URL(websiteUrl).hostname`.

**Role:** `"owner"` — el creador de la organizacion.

---

## PHASE 3: Sign-Up Page UI — `app/[locale]/(auth)/sign-up/page.tsx`

### Layout

Mismo split layout que login: left branding panel (dark navy) + right wizard form.

### Progress Indicator

3 circulos horizontales con lineas conectoras:
- Completado: `bg-emerald-500` + check icon
- Actual: `bg-cta` (teal)
- Pendiente: `bg-muted`
- Labels: "Account" / "Organization" / "Website"

### Step 1 — Account

```
[firstName] [lastName]   ← readonly, pre-filled from URL params
[email]                  ← readonly, pre-filled from URL params
[password]               ← Generate btn + eye toggle + validation checklist
[confirm password]       ← eye toggle
[Next →]
```

Reutilizar patron de `update-password/page.tsx` L29-72 (passwordChecks, generatePassword, Fisher-Yates).

### Step 2 — Organization

```
[Organization Name]      ← input libre
  slug preview           ← "app.chatflow360.com/{slug}" auto-generado
[← Back] [Next →]
```

### Step 3 — Website

```
[Website URL]            ← type="url", placeholder: https://yourbusiness.com
  hint                   ← "The website where your chat widget will appear"
[← Back] [Create Account]
```

### Estado sin params

Si la URL no tiene `pid` o `sig`, mostrar error:
> "This signup link is invalid or has expired."
> [Go to login →]

### Notas UX

- **Plan es INVISIBLE** al usuario. Se auto-setea desde los params de URL.
- Campos name/email son **readonly** (pre-filled del LP).
- El submit recolecta TODOS los valores de los 3 steps + hidden fields.

### i18n

Agregar namespace `auth.signUp` con todas las keys en EN y ES:
- title, subtitle, step labels, field labels, placeholders, hints
- button texts (next, back, createAccount, creating)
- error/invalid link messages
- password checklist keys

Agregar a `auth.errors`: emailExists, signupFailed, invalidLink, linkAlreadyUsed, validationFailed

---

## PHASE 4: Integration

### Login "Get Started" — `login/page.tsx`

Cambiar `<button>` muerto por link al LP de WordPress (pricing page).

### Middleware — `middleware.ts`

Agregar `/sign-up` a publicRoutes.

### WordPress — PHP snippet

```php
function chatflow360_signup_url($first_name, $last_name, $email, $plan, $payment_id) {
    $secret = 'SHARED_HMAC_SECRET';
    $ts = time();
    // Canonical: email|firstName|lastName|pid|plan|ts (MISMO orden que TypeScript)
    $canonical = implode('|', [$email, $first_name, $last_name, $payment_id, $plan, $ts]);
    $sig = hash_hmac('sha256', $canonical, $secret);
    $params = http_build_query([
        'firstName' => $first_name, 'lastName' => $last_name,
        'email' => $email, 'plan' => $plan,
        'pid' => $payment_id, 'ts' => $ts, 'sig' => $sig,
    ]);
    return "https://app.chatflow360.com/en/sign-up?{$params}";
}
```

---

## PHASE 5: Verificacion

### Testing Checklist

1. Generar URL de prueba con script Node
2. Happy path: link → password + org + website → submit → verificar en DB
3. Replay: misma URL → error "link already used"
4. Expirado: timestamp > 10 min → error "invalid link"
5. Tampered: modificar param → error "invalid link"
6. Sin params: `/sign-up` sin query → error state + link a login
7. 4-way: Light EN, Light ES, Dark EN, Dark ES
8. Responsive: Desktop 1920x1080, Tablet 768x1024, Mobile 390x844

### Security Checklist

- [ ] `crypto.timingSafeEqual()` para HMAC
- [ ] Timestamp check ANTES de DB query
- [ ] `consumed_payments.payment_id` UNIQUE
- [ ] Prisma `$transaction` atomico
- [ ] Rollback Supabase Auth si Prisma falla
- [ ] Error messages genericos al client
- [ ] `email_confirm: true` en createUser
- [ ] Campos name/email readonly en UI
- [ ] RLS en `consumed_payments`
- [ ] `SIGNUP_HMAC_SECRET` sin `NEXT_PUBLIC_`

---

## Resumen de Archivos

| Accion | Archivo |
|--------|---------|
| MODIFY | `prisma/schema.prisma` — User (firstName/lastName) + ConsumedPayment |
| MODIFY | `lib/auth/user.ts` — bootstrap firstName/lastName |
| MODIFY | `lib/admin/actions.ts` — Zod schemas + create/update user |
| MODIFY | `app/[locale]/(dashboard)/layout.tsx` — userName display |
| MODIFY | `app/[locale]/(dashboard)/users/page.tsx` — serialization |
| MODIFY | `app/[locale]/(dashboard)/users/users-client.tsx` — form + display |
| MODIFY | `middleware.ts` — add /sign-up to publicRoutes |
| MODIFY | `app/[locale]/(auth)/login/page.tsx` — Get started link |
| MODIFY | `lib/i18n/messages/en.json` — signUp keys + rename fullName |
| MODIFY | `lib/i18n/messages/es.json` — same |
| MODIFY | `.env.local` — SIGNUP_HMAC_SECRET |
| CREATE | `lib/signup/verify-hmac.ts` — HMAC verification |
| CREATE | `lib/signup/actions.ts` — signup server action |
| CREATE | `app/[locale]/(auth)/sign-up/page.tsx` — wizard UI |
| ADD    | `lib/utils/format.ts` — formatUserName() helper |

**Orden de ejecucion:** Phase 0 → 1 → 2 → 3 → 4 → 5
