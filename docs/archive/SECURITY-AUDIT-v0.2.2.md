# ChatFlow360 Security Audit Report

> **Version audited:** v0.2.2
> **Date:** 2026-02-19
> **Auditor:** Adan (DevSecOps Security Audit)
> **Scope:** Full application code review — authentication, authorization, input validation, XSS, CSRF, data exposure, missing controls
> **Methodology:** Manual source code review following OWASP ASVS v4.0 and OWASP Top 10 (2021)

---

## Executive Summary

| Severity | Count | Fixed (v0.2.3) | Pending |
|----------|-------|-----------------|---------|
| CRITICAL | 4 | 4 | 0 |
| HIGH | 5 | 5 | 0 |
| MEDIUM | 6 | 1 (MED-01) | 5 (MED-02 pre-launch, MED-03/04/05/06 backend) |
| LOW | 6 | 3 (LOW-01/05/06) | 3 (LOW-02/03/04 backend) |
| INFO | 4 | 0 (no action needed) | 0 |

> **Status:** All CRITICAL and HIGH vulnerabilities resolved in v0.2.3. Phase 2 pending: MED-02 (rate limiting), MED-03 (CORS). Phase 3 deferred to backend integration.

The application has a solid security foundation: server-side auth validation via `getUser()`, Zod schema validation on all server actions, consistent `requireSuperAdmin()` guards, React auto-escaping for XSS prevention, and proper environment variable segregation. The 4 CRITICAL findings from the previous audit phase have been resolved correctly. This report covers the remaining 21 findings across HIGH, MEDIUM, LOW, and INFO severity levels.

---

## Previously Fixed (CRITICAL) -- Not Reassessed

| ID | Issue | Status |
|----|-------|--------|
| CRIT-01 | Race condition in bootstrap (`getCurrentUser`) | Fixed -- `$transaction` Serializable |
| CRIT-02 | Dashboard layout missing auth guard | Fixed -- redirects to login if `!user` |
| CRIT-03 | UUID validation on delete functions | Fixed -- `z.string().uuid().parse(id)` |
| CRIT-04 | Open redirect in auth callback | Fixed -- 6-layer OWASP sanitization + allowlist |

---

## HIGH Severity Findings

### HIGH-01: Locale Parameter Injection in Auth Redirects

**File:** `lib/auth/actions.ts` -- Lines 57, 123
**OWASP:** A01:2021 Broken Access Control (Open Redirect)
**CWE:** CWE-601 URL Redirection to Untrusted Site

**Description:**
The `login()` and `updatePassword()` server actions extract a `locale` value from `formData` and interpolate it directly into `redirect()` with zero validation:

```typescript
// Line 57 (login)
const locale = (formData.get("locale") as string) || "en";
redirect(`/${locale}/`);

// Line 123 (updatePassword)
const locale = (formData.get("locale") as string) || "en";
redirect(`/${locale}/`);
```

The `locale` value comes from a hidden `<input type="hidden" name="locale" value={locale}>` in the login form (login/page.tsx line 140), but an attacker can submit any value via a crafted form or direct POST request. Setting `locale` to a value like `en/../../api/auth/callback?code=ATTACKER` or injecting path segments would cause Next.js to redirect to an unintended route after successful authentication.

While CRIT-04 sanitized the `/api/auth/callback` redirect, this is a completely separate redirect path in a different file that remains unsanitized.

**Proof of concept:**
An attacker submits a POST to the login action with `locale=en%2F..%2F..%2Fmalicious-path`. After successful authentication, the server calls `redirect("/en/../../malicious-path/")`.

**Fix:**

```typescript
// Add at the top of lib/auth/actions.ts
import { locales } from "@/lib/i18n/routing";

function sanitizeLocale(raw: unknown): string {
  if (typeof raw === "string" && (locales as readonly string[]).includes(raw)) {
    return raw;
  }
  return "en";
}

// In login() line 57:
const locale = sanitizeLocale(formData.get("locale"));
redirect(`/${locale}/`);

// In updatePassword() line 123:
const locale = sanitizeLocale(formData.get("locale"));
redirect(`/${locale}/`);
```

**Priority:** Fix now.

---

### HIGH-02: Context Selector Cookies Missing Security Attributes

**File:** `components/layout/sidebar.tsx` -- Lines 74-75, 82
**Also affects:** `app/[locale]/(dashboard)/layout.tsx` -- Lines 34-35 (server-side consumption)
**OWASP:** A07:2021 Identification and Authentication Failures
**CWE:** CWE-614 Sensitive Cookie in HTTPS Session Without 'Secure' Attribute

**Description:**
The `selectedOrgId` and `selectedChannelId` cookies are set via `document.cookie` in the sidebar component without `Secure`, `SameSite`, or any validation:

```typescript
// sidebar.tsx line 74
document.cookie = `selectedOrgId=${newOrgId};path=/;max-age=${60 * 60 * 24 * 90}`;
// sidebar.tsx line 75
document.cookie = "selectedChannelId=;path=/;max-age=0";
// sidebar.tsx line 82
document.cookie = `selectedChannelId=${newChannelId};path=/;max-age=${60 * 60 * 24 * 90}`;
```

These cookies are then consumed server-side in `layout.tsx` without validation:

```typescript
// layout.tsx lines 34-35
const selectedOrgId = cookieStore.get("selectedOrgId")?.value || "";
const selectedChannelId = cookieStore.get("selectedChannelId")?.value || "";
```

**Security issues:**
1. **Missing `SameSite` attribute:** Without `SameSite`, the cookie is sent on cross-site requests by default in older browsers, enabling CSRF-style context switching
2. **Missing `Secure` attribute:** On HTTPS deployments, the cookie can be intercepted if a user visits an HTTP page on the same domain
3. **No value validation:** The cookie value is not validated as a UUID on either the client or server side. Malformed values pass directly into the `adminContext` object and are used to filter organization data
4. **Multi-tenant impact:** These cookies control which organization's data the super admin sees. Cookie manipulation could cause the admin to unknowingly act on the wrong tenant

**Fix (client-side -- sidebar.tsx):**

```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function setContextCookie(name: string, value: string, maxAge: number) {
  if (value && !UUID_RE.test(value)) return;
  const secure = window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

const handleOrgChange = (orgId: string) => {
  const newOrgId = orgId === "none" ? "" : orgId;
  setSelectedOrg(newOrgId);
  setSelectedChannel("");
  setContextCookie("selectedOrgId", newOrgId, 60 * 60 * 24 * 90);
  setContextCookie("selectedChannelId", "", 0);
  router.refresh();
};

const handleChannelChange = (channelId: string) => {
  const newChannelId = channelId === "none" ? "" : channelId;
  setSelectedChannel(newChannelId);
  setContextCookie("selectedChannelId", newChannelId, 60 * 60 * 24 * 90);
  router.refresh();
};
```

**Fix (server-side -- layout.tsx):**

```typescript
import { z } from "zod";
const optionalUuid = z.string().uuid().optional().or(z.literal(""));

const rawOrgId = cookieStore.get("selectedOrgId")?.value || "";
const rawChannelId = cookieStore.get("selectedChannelId")?.value || "";
const selectedOrgId = optionalUuid.safeParse(rawOrgId).success ? rawOrgId : "";
const selectedChannelId = optionalUuid.safeParse(rawChannelId).success ? rawChannelId : "";
```

**Priority:** Fix now.

---

### HIGH-03: No Content-Security-Policy Header

**File:** `next.config.ts` -- Lines 6-31
**OWASP:** A05:2021 Security Misconfiguration
**CWE:** CWE-1021 Improper Restriction of Rendered UI Layers

**Description:**
The application sets six security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-DNS-Prefetch-Control, Permissions-Policy) but does NOT include a `Content-Security-Policy` header. CSP is the single most effective browser-side defense against XSS attacks. Without CSP:

- If any XSS vector is introduced (especially when real chat messages connect), there is no browser-level mitigation
- Inline scripts and external script injection have no restrictions
- There is no `frame-ancestors` directive (the CSP successor to X-Frame-Options)
- There is no `form-action` restriction (forms could submit to external domains)

The application currently has no `dangerouslySetInnerHTML` or `innerHTML` usage (confirmed via codebase search), so the immediate XSS risk is low. However, CSP provides defense-in-depth that must be in place BEFORE real user-generated content flows through the system.

**Fix (add to `securityHeaders` array in next.config.ts):**

```typescript
{
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
},
```

Note: `'unsafe-inline'` and `'unsafe-eval'` are required by Next.js in development mode. For production hardening, implement nonce-based CSP via Next.js `nonce` support. The most important directives for immediate protection are `frame-ancestors 'none'` (clickjacking), `base-uri 'self'` (base tag injection), and `form-action 'self'` (form hijacking).

**Priority:** Fix now.

---

### HIGH-04: Insecure Password Generation Using Math.random()

**File:** `app/[locale]/(dashboard)/users/users-client.tsx` -- Lines 77-101
**OWASP:** A02:2021 Cryptographic Failures
**CWE:** CWE-338 Use of Cryptographically Weak PRNG

**Description:**
The `generatePassword()` function uses `Math.random()` on six separate calls (lines 85-88, 92, 96) to generate passwords for new user accounts:

```typescript
// Lines 85-88
upper[Math.floor(Math.random() * upper.length)],
lower[Math.floor(Math.random() * lower.length)],
digits[Math.floor(Math.random() * digits.length)],
symbols[Math.floor(Math.random() * symbols.length)],

// Line 92
all[Math.floor(Math.random() * all.length)]

// Line 96 -- biased shuffle
.sort(() => Math.random() - 0.5)
```

`Math.random()` uses a PRNG (typically xorshift128+ in V8) that is NOT cryptographically secure. The internal state can be recovered from a small number of observed outputs. Additionally, `Array.sort()` with `Math.random() - 0.5` produces a biased permutation -- some orderings are statistically more likely than others.

These passwords are used for real user accounts created via Supabase Auth (`lib/admin/actions.ts` line 193: `password: parsed.data.password`).

**Fix:**

```typescript
const generatePassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*_+-=";
  const all = upper + lower + digits + symbols;

  // Cryptographically secure random index
  const secureRandom = (max: number): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
  };

  const required = [
    upper[secureRandom(upper.length)],
    lower[secureRandom(lower.length)],
    digits[secureRandom(digits.length)],
    symbols[secureRandom(symbols.length)],
  ];

  const remaining = Array.from({ length: 12 }, () =>
    all[secureRandom(all.length)]
  );

  // Unbiased Fisher-Yates shuffle
  const chars = [...required, ...remaining];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  setPasswordValue(chars.join(""));
  setShowPassword(true);
};
```

`crypto.getRandomValues()` is available in all browsers that support Next.js (all modern browsers). No polyfill needed.

**Priority:** Fix now.

---

### HIGH-05: Non-Atomic User Update Creates Orphaned Membership State

**File:** `lib/admin/actions.ts` -- Lines 261-284
**OWASP:** A04:2021 Insecure Design
**CWE:** CWE-362 Race Condition / CWE-754 Improper Check for Unusual or Exceptional Conditions

**Description:**
The `updateUser()` function performs three sequential database operations without a transaction:

```typescript
// Line 262: Step 1 -- update user name
await prisma.user.update({
  where: { id: parsed.data.id },
  data: { fullName: parsed.data.fullName },
});

// Line 271: Step 2 -- delete ALL memberships (POINT OF NO RETURN)
await prisma.organizationMember.deleteMany({
  where: { userId: parsed.data.id },
});

// Line 277: Step 3 -- create new membership (if specified)
if (orgId && orgId !== "") {
  await prisma.organizationMember.create({
    data: { userId: parsed.data.id, organizationId: orgId, role: parsed.data.role || "admin" },
  });
}
```

If the process fails between Step 2 and Step 3 (network error, database timeout, connection pool exhaustion, Vercel function timeout), the user loses all organization memberships. The user can still log in but has no organization context, effectively being locked out of all tenant data. The `catch` block on line 288 returns a generic error, and there is no recovery mechanism.

**Fix:**

```typescript
export async function updateUser(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = updateUserSchema.safeParse({
      id: formData.get("id"),
      fullName: formData.get("fullName"),
      organizationId: formData.get("organizationId") || "",
      role: formData.get("role") || undefined,
    });

    if (!parsed.success) {
      return { error: "createFailed" };
    }

    const orgId = parsed.data.organizationId;

    await prisma.$transaction(async (tx) => {
      // Update user name
      await tx.user.update({
        where: { id: parsed.data.id },
        data: { fullName: parsed.data.fullName },
      });

      // Remove existing memberships
      await tx.organizationMember.deleteMany({
        where: { userId: parsed.data.id },
      });

      // Add new membership if specified
      if (orgId && orgId !== "") {
        await tx.organizationMember.create({
          data: {
            userId: parsed.data.id,
            organizationId: orgId,
            role: parsed.data.role || "admin",
          },
        });
      }
    });

    revalidatePath("/users");
    return { success: "userUpdated" };
  } catch (e) {
    console.error("[updateUser] Failed:", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}
```

**Priority:** Fix now.

---

## MEDIUM Severity Findings

### MED-01: User Deletion Order Creates Auth Orphans

**File:** `lib/admin/actions.ts` -- Lines 293-319
**OWASP:** A04:2021 Insecure Design
**CWE:** CWE-459 Incomplete Cleanup

**Description:**
The `deleteUser()` function deletes the Prisma record first, then the Supabase Auth record:

```typescript
// Line 307: Delete from Prisma FIRST
await prisma.user.delete({ where: { id } });

// Line 312-313: Delete from Supabase Auth SECOND
const supabase = createAdminClient();
await supabase.auth.admin.deleteUser(id);
```

If the Supabase Auth deletion fails (network error, rate limit, service outage), the user's Prisma record is already deleted but their authentication credentials remain active in Supabase. The user can still log in, and `getCurrentUser()` (`lib/auth/user.ts` line 26) will trigger a `user.upsert`, recreating the Prisma record. Worse, if no other super admin exists at that moment, the bootstrap logic (`superAdminCount === 0` on line 33) could grant the recreated user super admin privileges.

**Fix -- reverse the deletion order:**

```typescript
export async function deleteUser(id: string): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();
    z.string().uuid().parse(id);

    const currentUser = await getCurrentUser();
    if (currentUser?.id === id) {
      return { error: "cannotDeleteSelf" };
    }

    // Step 1: Delete from Supabase Auth FIRST (revokes login ability)
    const supabase = createAdminClient();
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) {
      console.error("[deleteUser] Supabase Auth deletion failed:", authError.message);
      return { error: "createFailed" };
    }

    // Step 2: Delete from Prisma (auth already revoked, safe if this fails)
    try {
      await prisma.user.delete({ where: { id } });
    } catch (e) {
      // Log but don't fail -- the user can't log in anymore
      console.error("[deleteUser] Prisma deletion failed after auth revoked:", e instanceof Error ? e.message : e);
    }

    revalidatePath("/users");
    return { success: "userDeleted" };
  } catch (e) {
    console.error("[deleteUser] Failed:", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}
```

The principle: revoke authentication first, clean up data second. An orphan Prisma record with no auth is harmless. An orphan auth account with no Prisma record is dangerous.

**Priority:** Fix now.

---

### MED-02: No Rate Limiting on Login

**File:** `lib/auth/actions.ts` -- Lines 34-60
**OWASP:** A07:2021 Identification and Authentication Failures
**CWE:** CWE-307 Improper Restriction of Excessive Authentication Attempts

**Description:**
The `login()` server action accepts unlimited authentication attempts. There is no rate limiting, account lockout, or progressive delay mechanism. While Supabase Auth has some built-in rate limiting at the infrastructure level, the application layer has no protection against:

- Credential stuffing attacks using breached password databases
- Brute-force attacks against known email addresses
- Enumeration attacks (the login returns generic `invalidCredentials` for both wrong email and wrong password, which is correct, but rate limiting is still needed)

**Impact:** An attacker could make thousands of login attempts per minute from a single IP.

**Fix (recommended for pre-launch, using Upstash Rate Limit for Vercel Edge):**

```typescript
// lib/auth/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const loginRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:login",
});

// Then in login() server action, before auth check:
export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  // Rate limit by IP (from headers in server action context)
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = await loginRateLimit.limit(ip);
  if (!success) {
    return { error: "tooManyAttempts" };
  }
  // ... rest of login logic
}
```

**Priority:** Fix before public launch. Supabase provides baseline protection for MVP.

---

### MED-03: No CORS Infrastructure for Future API Routes

**File:** `app/api/auth/callback/route.ts` (and future API routes)
**OWASP:** A05:2021 Security Misconfiguration
**CWE:** CWE-942 Permissive Cross-domain Policy

**Description:**
The application currently has one API route (`/api/auth/callback`) and no explicit CORS configuration. Next.js API routes do not enable CORS by default (which is safe). However, when the public-facing chat widget API endpoints are built (the widget will be embedded on customer websites), those endpoints will need strict CORS with origin allowlisting. There is no CORS utility infrastructure in place.

**Fix (create the utility now, apply when widget API is built):**

```typescript
// lib/api/cors.ts
const STATIC_ALLOWED_ORIGINS = new Set([
  "https://app.chatflow360.com",
]);

export async function getAllowedOrigin(origin: string | null): Promise<string> {
  if (!origin) return "";

  // Check static allowlist
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return origin;

  // TODO: When widget API is built, check channel.config for allowed origins
  // const channel = await prisma.channel.findFirst({
  //   where: { config: { path: ["allowedOrigins"], array_contains: origin } },
  // });
  // if (channel) return origin;

  return "";
}

export function corsHeaders(allowedOrigin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Public-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
```

**Priority:** Create infrastructure now. Enforce when widget API is built.

---

### MED-04: Mock Data Exposed in Production Client Bundles

**File:** `lib/mock/data.ts` -- entire file (318 lines)
**Consumers (all `"use client"` components -- shipped to browser):**
- `app/[locale]/(dashboard)/settings/ai/settings-ai-client.tsx` -- line 22 (imports `mockAiSettings`, `mockKnowledge`)
- `app/[locale]/(dashboard)/conversations/conversations-client.tsx` -- line 13 (imports `mockConversations`)
- `components/chat/conversation-detail.tsx` -- line 20 (imports `mockMessages`)
- `components/dashboard/recent-conversations.tsx` -- line 6 (imports `mockConversations`)
- `components/dashboard/stats-grid.tsx` -- line 6 (imports `mockStats`)

**OWASP:** A01:2021 Broken Access Control (Information Disclosure)
**CWE:** CWE-200 Exposure of Sensitive Information

**Description:**
The mock data file is imported in 5 different `"use client"` components, meaning the entire dataset is bundled into the JavaScript delivered to the browser. This exposes:

1. **AI system prompt template** (line 289): `"You are a friendly dental clinic assistant..."` -- reveals AI behavior instructions
2. **Handoff trigger keywords** (line 292): `["human", "agent", "person", "manager", "complaint", "urgent"]` -- an attacker could intentionally trigger human takeover
3. **Business pricing data** (lines 299-301): internal pricing structure
4. **Fake PII** (emails, names) that could confuse users or be mistaken for real data leaks
5. **Internal channel IDs and mock structure** revealing architecture patterns

An attacker can inspect the browser bundle (via DevTools Sources tab or downloading JS chunks) and extract all of this information.

**Fix:**
When connecting the backend, replace each mock import with server-fetched data passed as props from Server Components. For immediate mitigation, at minimum mark the file:

```typescript
// lib/mock/data.ts -- line 1
/**
 * @deprecated SECURITY: This file is bundled into client-side JavaScript.
 * DO NOT add real credentials, API keys, or sensitive business logic here.
 * Replace all consumers with server-fetched data before public launch.
 * Tracked in: docs/SECURITY-AUDIT-v0.2.2.md (MED-04)
 */
```

**Priority:** Fix when backend connects. Add deprecation notice now.

---

### MED-05: Organization Deletion Has No Cascade Impact Check

**File:** `lib/admin/actions.ts` -- Lines 130-146
**OWASP:** A04:2021 Insecure Design
**CWE:** CWE-754 Improper Check for Unusual or Exceptional Conditions

**Description:**
The `deleteOrganization()` function performs a direct delete without checking for cascading impact:

```typescript
// Line 137
await prisma.organization.delete({ where: { id } });
```

While the Prisma schema has `onDelete: Cascade` on all child relations, a single delete call will cascade-delete: all channels, all conversations, all messages, all organization members, AI settings, and usage tracking records. In production with active live chat, this could disconnect dozens of active visitors mid-conversation with no warning or graceful shutdown.

**Fix:**

```typescript
export async function deleteOrganization(id: string): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();
    z.string().uuid().parse(id);

    // Check cascade impact before deletion
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            channels: true,
          },
        },
      },
    });

    if (!org) {
      return { error: "createFailed" };
    }

    // Block deletion if org has active channels or members
    // (super admin must deactivate/remove them first)
    if (org._count.members > 0) {
      return { error: "orgHasMembers" };
    }

    await prisma.organization.delete({ where: { id } });

    revalidatePath("/organizations");
    return { success: "organizationDeleted" };
  } catch (e) {
    console.error("[deleteOrganization] Failed:", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}
```

**Priority:** Fix when backend connects (currently only test data exists).

---

### MED-06: Channel Update Does Not Verify Ownership

**File:** `lib/admin/actions.ts` -- Lines 385-414
**OWASP:** A01:2021 Broken Access Control
**CWE:** CWE-639 Authorization Bypass Through User-Controlled Key

**Description:**
The `updateChannel()` function validates that the user is a super admin, but does not verify that the channel ID being updated actually belongs to the expected organization. The update schema only validates `id`, `name`, and `isActive`:

```typescript
const updateChannelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});
```

Currently, only super admins can call this action, and they have global access. However, when org-admin RBAC is implemented, an org admin could modify any channel's name or active status by providing a channel ID from a different organization. The same issue exists in `deleteChannel()` (line 417).

**Fix (prepare now for RBAC):**

```typescript
export async function updateChannel(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const user = await requireSuperAdmin(); // Will become requireAdmin() with RBAC

    const parsed = updateChannelSchema.safeParse({ /* ... */ });
    if (!parsed.success) return { error: "channelNameRequired" };

    // Verify channel exists and check org ownership
    const channel = await prisma.channel.findUnique({
      where: { id: parsed.data.id },
      select: { organizationId: true },
    });

    if (!channel) {
      return { error: "createFailed" };
    }

    // When RBAC is added: verify user has access to this org
    // if (!user.isSuperAdmin) {
    //   const membership = user.memberships.find(m => m.organizationId === channel.organizationId);
    //   if (!membership || membership.role !== "admin") return { error: "unauthorized" };
    // }

    await prisma.channel.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, isActive: parsed.data.isActive },
    });

    revalidatePath("/organizations");
    return { success: "channelUpdated" };
  } catch (e) {
    console.error("[updateChannel] Failed:", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}
```

**Priority:** Fix when RBAC is implemented.

---

## LOW Severity Findings

### LOW-01: Middleware Locale Regex Hardcoded Separately from Routing Config

**File:** `middleware.ts` -- Lines 15, 55, 66
**CWE:** CWE-1078 Inappropriate Source Code Style or Formatting

**Description:**
The middleware uses a hardcoded regex `/^\/(en|es)/` to strip and extract locales, while the canonical locale list lives in `lib/i18n/routing.ts`. If a new locale (e.g., `pt`) is added to the routing config but not the middleware regex, the middleware will fail to recognize it and treat authenticated users on that locale as unauthenticated.

```typescript
// middleware.ts line 15 -- hardcoded
const pathnameWithoutLocale = pathname.replace(/^\/(en|es)/, "") || "/";

// lib/i18n/routing.ts line 3 -- canonical source
export const locales = ["en", "es"] as const;
```

**Fix:**

```typescript
import { locales } from "./lib/i18n/routing";

const localePattern = new RegExp(`^\\/(${locales.join("|")})`);
const pathnameWithoutLocale = pathname.replace(localePattern, "") || "/";

// Lines 55, 66:
const locale = pathname.match(localePattern)?.[1] || "en";
```

**Priority:** Low -- good practice to prevent maintenance drift.

---

### LOW-02: Slug Uniqueness TOCTOU Race Condition

**File:** `lib/admin/actions.ts` -- Lines 65-73
**CWE:** CWE-367 Time-of-check Time-of-use Race Condition

**Description:**
The `createOrganization()` function checks slug uniqueness with a `findUnique` query, then creates the organization in a separate `create` call:

```typescript
// Line 65: Check
const existing = await prisma.organization.findUnique({ where: { slug: parsed.data.slug } });
if (existing) return { error: "slugExists" };

// Line 73: Create (separate operation)
await prisma.organization.create({ data: { ... } });
```

Two concurrent requests with the same slug could both pass the uniqueness check. The database `@unique` constraint on `slug` will prevent the duplicate at the DB level, but the error surfaces as a generic "createFailed" instead of "slugExists".

**Fix:**

```typescript
import { PrismaClientKnownRequestError } from "@/lib/generated/prisma/client/runtime/library";

// Remove the findUnique check entirely, and catch the unique constraint violation:
try {
  await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan: parsed.data.plan,
      aiSettings: { create: { provider: "openai", model: "gpt-4o-mini", temperature: 0.7, maxTokens: 500 } },
    },
  });
} catch (e) {
  if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
    return { error: "slugExists" };
  }
  throw e;
}
```

**Priority:** Low -- the DB constraint prevents actual duplicates.

---

### LOW-03: Dynamic Translation Key Construction from Server Action Responses

**Files:**
- `app/[locale]/(dashboard)/organizations/organizations-client.tsx` -- Lines 270, 371
- `app/[locale]/(dashboard)/users/users-client.tsx` -- Line 283

**CWE:** CWE-134 Use of Externally-Controlled Format String

**Description:**
Error messages from server actions are interpolated into translation keys:

```typescript
{te(`errors.${orgActionState.error}`)}
```

The `error` values currently only come from hardcoded server action returns (e.g., `"orgNameRequired"`, `"createFailed"`), so this is safe today. However, if a future developer returns user-controlled data or an unhandled exception message as the error value, it could:
- Expose internal error details through translation fallback behavior
- Cause `next-intl` to throw for missing keys

**Fix:**

```typescript
const KNOWN_ERRORS = new Set([
  "orgNameRequired", "slugExists", "createFailed", "emailRequired",
  "passwordTooShort", "emailExists", "channelNameRequired",
  "channelLimitReached", "cannotDeleteSelf", "orgHasMembers",
  "tooManyAttempts",
]);

// In the component:
{orgActionState?.error && (
  <div className="...">
    {KNOWN_ERRORS.has(orgActionState.error)
      ? te(`errors.${orgActionState.error}`)
      : te("errors.createFailed")}
  </div>
)}
```

**Priority:** Low -- purely defensive; current code is safe.

---

### LOW-04: Missing `autoComplete="off"` on Admin Forms

**Files:**
- `app/[locale]/(dashboard)/organizations/organizations-client.tsx` -- Lines 279, 293
- `app/[locale]/(dashboard)/organizations/organizations-client.tsx` -- Line 384 (channel name)

**CWE:** CWE-525 Use of Web Browser Cache Containing Sensitive Information

**Description:**
The organization name, slug, and channel name input fields do not have `autoComplete="off"`. Browsers may cache and auto-suggest these values. In a multi-user admin environment (shared computer), this could leak organization names to unauthorized users. The user management forms correctly use `autoComplete="off"` and `autoComplete="new-password"`.

**Fix:**

```tsx
<Input id="name" name="name" autoComplete="off" /* ...rest */ />
<Input id="slug" name="slug" autoComplete="off" /* ...rest */ />
<Input id="channelName" name="name" autoComplete="off" /* ...rest */ />
```

**Priority:** Low.

---

### LOW-05: All Server Action Catch Blocks Swallow Errors Silently

**File:** `lib/admin/actions.ts` -- Lines 91, 125, 143, 238, 288, 317, 380, 412, 430
**CWE:** CWE-390 Detection of Error Condition Without Action

**Description:**
Every `catch` block in all 9 server actions discards the error entirely:

```typescript
} catch {
  return { error: "createFailed" };
}
```

This is correct for the client response (never expose internal errors to users). However, there is ZERO server-side logging. The only `console.warn` in the entire codebase is in the auth callback route (line 82). When a production operation fails, there is no way to diagnose the cause without adding logging.

**Fix:**
Add structured server-side logging to every catch block:

```typescript
} catch (e) {
  console.error("[createOrganization] Failed:", e instanceof Error ? e.message : String(e));
  return { error: "createFailed" };
}
```

Pattern for all 9 server actions: `[functionName] Failed:` followed by the error message (never the full stack trace to avoid log pollution, but enough to diagnose).

**Priority:** Low -- operational issue, but critical for debugging production failures.

---

### LOW-06: Prisma Client Has No Query Logging

**File:** `lib/db/prisma.ts` -- Lines 8-11
**CWE:** CWE-778 Insufficient Logging

**Description:**
The Prisma client is created without any logging configuration:

```typescript
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}
```

In development, this makes it impossible to detect N+1 queries, slow queries, or unexpected data access patterns. In production, errors from the database layer are silently discarded.

**Fix:**

```typescript
function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}
```

**Priority:** Low.

---

## INFO Severity Findings

### INFO-01: `isSuperAdmin` Boolean Exposed in Client Component Props

**Files:**
- `app/[locale]/(dashboard)/layout.tsx` -- Line 59 (passes to DashboardShell)
- `components/layout/dashboard-shell.tsx` -- Line 46 (passes to Sidebar)
- `components/layout/sidebar.tsx` -- Line 47 (uses for conditional rendering)

**Description:**
The `isSuperAdmin` boolean is passed from the server layout through client components to control sidebar rendering. This value is visible in React DevTools. An attacker could observe this to confirm whether the current user is a super admin. However, all actual authorization checks happen server-side (`requireSuperAdmin()` in actions, `redirect` in pages), so this is informational leakage only with no exploitable impact.

**Recommendation:** No code change needed. Document that the client-side `isSuperAdmin` flag is for UI rendering only and must never be trusted for authorization decisions.

---

### INFO-02: Browser `confirm()` Used for Destructive Actions

**Files:**
- `app/[locale]/(dashboard)/users/users-client.tsx` -- Line 147
- `app/[locale]/(dashboard)/organizations/organizations-client.tsx` -- Lines 159, 181

**Description:**
Destructive operations (delete org, delete user, delete channel) use the browser's native `confirm()` dialog:

```typescript
if (!confirm(t("deleteConfirm"))) return;
```

`confirm()` is not a security control -- it can be bypassed by any script. The actual authorization happens server-side via `requireSuperAdmin()`, so this is purely a UX protection. However, the dialogs cannot be styled and may not show in headless browser contexts or automated testing.

**Recommendation:** For better UX, consider replacing with a custom confirmation dialog component (e.g., shadcn/ui AlertDialog) that requires typing the entity name. No security urgency.

---

### INFO-03: Non-Assertion Environment Variable Access

**Files:**
- `middleware.ts` -- Lines 29-30
- `lib/supabase/admin.ts` -- Lines 10-11
- `lib/supabase/server.ts` -- Lines 8-9
- `lib/supabase/client.ts` -- Lines 5-6
- `lib/db/prisma.ts` -- Line 9

**Description:**
All environment variables are accessed with the non-null assertion operator (`!`):

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL!
process.env.SUPABASE_SERVICE_ROLE_KEY!
```

If any of these environment variables are missing in a deployment, the application will crash with an unhelpful `undefined` error. There is no startup validation that all required environment variables are present.

**Recommendation:** Add a startup validation module:

```typescript
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

No security urgency -- this is a reliability improvement.

---

### INFO-04: Chat Message Input Not Connected to Any Handler

**File:** `components/chat/conversation-detail.tsx` -- Lines 210-218
**Description:**
The chat input field in the conversation detail panel has no `onSubmit` handler, no form wrapper, and the Send button has no `onClick`:

```tsx
<Input placeholder={t("typeMessage")} className="flex-1 text-sm" />
<Button size="icon" className="h-9 w-9 bg-cta text-cta-foreground hover:bg-cta/90">
  <Send className="h-4 w-4" />
</Button>
```

This is expected (the input is a placeholder for future real-time messaging). However, when this is connected, it must include: input sanitization, rate limiting, maximum message length validation, and XSS protection (the current React JSX rendering in `chat-message.tsx` auto-escapes, which is correct).

**Recommendation:** Track as a future implementation requirement. Ensure the connected version validates message content server-side with Zod (max length, no control characters) before storing in the database.

---

## Positive Security Findings

These practices are implemented correctly and should be maintained:

| # | Practice | Evidence |
|---|----------|----------|
| 1 | Server-side auth validation via `getUser()` | `middleware.ts` line 50 -- validates JWT against Supabase server, not `getSession()` |
| 2 | Consistent `requireSuperAdmin()` on all admin actions | `lib/admin/actions.ts` -- called in all 9 server actions |
| 3 | Zod schema validation on all server action inputs | `lib/admin/actions.ts` and `lib/auth/actions.ts` -- every action validates with `safeParse` |
| 4 | UUID validation on all delete operations | `lib/admin/actions.ts` lines 135, 298, 423 -- `z.string().uuid().parse(id)` |
| 5 | No `dangerouslySetInnerHTML` usage | Codebase-wide search: zero instances found |
| 6 | No `eval()` or `Function()` constructor usage | Codebase-wide search: zero instances found |
| 7 | React auto-escaping for chat messages | `components/chat/chat-message.tsx` line 25: `{message.content}` in JSX |
| 8 | Proper env var segregation | `SUPABASE_SERVICE_ROLE_KEY` is NOT `NEXT_PUBLIC_` prefixed |
| 9 | `.env` files in `.gitignore` | `.gitignore` line 34: `.env*` with exception for `.env.example` |
| 10 | HSTS with preload | `next.config.ts` line 13: `max-age=63072000; includeSubDomains; preload` |
| 11 | Email enumeration prevention | `lib/auth/actions.ts` line 93: forgot-password always returns success |
| 12 | Self-deletion prevention | `lib/admin/actions.ts` line 302: `if (currentUser?.id === id)` check |
| 13 | Serializable transaction for bootstrap | `lib/auth/user.ts` line 42: `{ isolationLevel: "Serializable" }` |
| 14 | Input length limits on all forms | All `<Input>` fields have `maxLength` attributes |
| 15 | Auth callback redirect sanitization | 6-layer OWASP defense + x-forwarded-host allowlist |
| 16 | Password minimum requirements | `z.string().min(8).max(128)` on all password schemas |

---

## Recommended Fix Priority

### Phase 1: Fix Now (before next deploy)
| Finding | Effort |
|---------|--------|
| HIGH-01: Locale sanitization in redirects | 10 min |
| HIGH-02: Cookie security attributes + validation | 20 min |
| HIGH-03: Add CSP header | 15 min |
| HIGH-04: Crypto-secure password generation | 15 min |
| HIGH-05: Transaction on user update | 10 min |
| MED-01: Reverse user deletion order | 10 min |

**Total Phase 1 estimate: ~80 minutes**

### Phase 2: Fix Before Public Launch
| Finding | Effort |
|---------|--------|
| MED-02: Rate limiting on login | 30-60 min (depends on infrastructure choice) |
| MED-03: CORS utility infrastructure | 20 min |
| LOW-01: Dynamic locale regex | 5 min |
| LOW-05: Server action error logging | 15 min |
| LOW-06: Prisma query logging | 5 min |

### Phase 3: Fix When Backend Connects
| Finding | Effort |
|---------|--------|
| MED-04: Replace mock data with real data | Part of backend integration |
| MED-05: Org deletion cascade check | 15 min |
| MED-06: Channel ownership verification | 15 min |
| LOW-02: Slug TOCTOU race condition | 10 min |
| LOW-03: Translation key safelist | 10 min |
| LOW-04: autoComplete attributes | 5 min |
