# Dashboard AI Assistant (Copilot) — Technical Spec

> **Status:** Planning — not yet implemented
> **Version:** v0.4.0 target
> **Priority:** High — core differentiator feature

## 1. Overview

An AI assistant that lives inside the dashboard to help org admins configure their account via natural conversation. Uses OpenAI function calling to write structured data into existing DB tables.

- **Onboarding (first login):** Fullscreen chat — guides new users through complete account setup
- **Post-onboarding (always available):** Side panel widget — identical to the visitor chat widget — for ongoing management

## 2. User Experience

### 2.1 First Login — Fullscreen Onboarding

```
User logs in → Dashboard layout checks org.isOnboarded === false
  → redirect("/onboarding")
  → Fullscreen page (no sidebar, no nav, just the chat)
  → Assistant introduces itself and guides setup
  → At completion → marks isOnboarded = true → redirect to dashboard
```

**The assistant guides through these areas (conversational, not rigid steps):**

| Area | What it configures | DB Target |
|------|-------------------|-----------|
| Business Identity | Name, type, location, website | `organizations`, `channels` |
| Business Hours | Day-by-day AM/PM, timezone, holidays | `organization_knowledge` (category: `business_hours`) |
| Services & Pricing | Currency, service list with prices | `organization_knowledge` (category: `pricing`) |
| Contact & Location | Address, phone, email, social media | `organization_knowledge` (category: `location_contact`) |
| AI Agent Setup | Agent name, role, personality, rules | `ai_settings.prompt_structure` |
| FAQs | Common Q&A (can extract from website) | `organization_knowledge` (category: `faqs`) |

**Template integration:** When the assistant asks about agent role/personality/rules, it queries `prompt_pieces` for the org's `businessCategoryId` and presents matching templates as clickable chips. User can pick one or write custom.

**AM/PM rule:** The assistant ALWAYS confirms hours in AM/PM format and asks for timezone before saving business hours. Example:
- User: "We're open 9 to 5"
- Assistant: "Got it — 9:00 AM to 5:00 PM, correct? And what's your timezone? EST, CST, MST, or PST?"

**Skip option:** A "Skip, I'll configure manually" link at the bottom of the onboarding screen. Sets `isOnboarded = true` and redirects to dashboard.

### 2.2 Post-Onboarding — Side Panel Widget

After onboarding, a floating bubble appears in the dashboard (bottom-right), identical to the visitor-facing widget bubble. Clicking opens a side panel chat identical to the visitor widget.

**Key UX principle:** The admin interacts with the SAME visual design their customers will see. This serves as a live demo of the product.

**Post-onboarding capabilities (Phase 1):**
- "Update my Saturday hours to 9 AM - 1 PM"
- "Add a new service: Deep Cleaning $200"
- "Change the agent's tone to more casual"
- "Add a FAQ about parking"
- "Remove the refund policy"

## 3. Architecture

### 3.1 System Diagram

```
┌──────────────────────────────────────────────────────────┐
│  Dashboard (React)                                       │
│  ┌─────────────────────┐  ┌───────────────────────────┐  │
│  │ OnboardingScreen    │  │ AssistantBubble (widget)   │  │
│  │ (fullscreen, first  │  │ (side panel, post-        │  │
│  │  login only)        │  │  onboarding, always)      │  │
│  └────────┬────────────┘  └────────────┬──────────────┘  │
│           │                            │                 │
│           └───────────┬────────────────┘                 │
│                       ▼                                  │
│              AssistantChat (shared component)            │
│              - Widget-identical UI                       │
│              - Streams messages via SSE                  │
│              - Renders tool confirmations                │
│              - Renders template chips                    │
└───────────────────────┬──────────────────────────────────┘
                        │ POST /api/assistant/chat (streaming SSE)
                        ▼
┌──────────────────────────────────────────────────────────┐
│  API Route: /api/assistant/chat                          │
│  1. Auth check (Supabase session)                        │
│  2. Load org context (settings, category, templates)     │
│  3. Build system prompt with context                     │
│  4. Call OpenAI with tools/functions                     │
│  5. Stream response tokens via SSE                       │
│  6. When tool_call received → execute handler            │
│  7. Feed tool result back to OpenAI → continue stream    │
└───────────────────────┬──────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ai_settings│  │org_know- │  │prompt_   │
    │(Prisma)  │  │ledge     │  │pieces    │
    │          │  │(Supabase)│  │(read only)│
    └──────────┘  └──────────┘  └──────────┘
```

### 3.2 Streaming Flow (SSE)

The existing `/api/chat` endpoint is **blocking** (no streaming). The assistant endpoint will use **Server-Sent Events** for real-time typing effect:

```typescript
// Simplified flow
const stream = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...systemPrompt, ...history],
  tools: ASSISTANT_TOOLS,
  stream: true,
});

// SSE encoder
const encoder = new TextEncoder();
const readable = new ReadableStream({
  async start(controller) {
    let toolCallBuffer = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        // Stream text token to client
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: delta.content })}\n\n`));
      }

      if (delta?.tool_calls) {
        // Buffer tool call arguments (they arrive in chunks)
        // ... accumulate into toolCallBuffer
      }

      if (chunk.choices[0]?.finish_reason === "tool_calls") {
        // Execute tool handlers server-side
        const results = await executeTools(toolCallBuffer);

        // Send tool results to client for UI confirmation cards
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", results })}\n\n`));

        // Feed results back to OpenAI for continuation
        // ... recursive call or loop
      }
    }

    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
    controller.close();
  }
});

return new Response(readable, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
});
```

**Client-side SSE consumption:**
```typescript
const response = await fetch("/api/assistant/chat", { method: "POST", body: JSON.stringify({ messages }) });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split("\n\n");
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const data = JSON.parse(line.slice(6));
    if (data.type === "token") appendToCurrentMessage(data.content);
    if (data.type === "tool_result") showConfirmationCard(data.results);
    if (data.type === "done") finishMessage();
  }
}
```

## 4. Database Changes

### 4.1 Migration: Add `isOnboarded` to Organization

```prisma
// schema.prisma — Organization model, add:
isOnboarded Boolean @default(false) @map("is_onboarded")
```

```sql
-- Migration SQL:
ALTER TABLE organizations ADD COLUMN is_onboarded BOOLEAN NOT NULL DEFAULT false;

-- Mark existing orgs as onboarded (they don't need the wizard)
UPDATE organizations SET is_onboarded = true;
```

**No other schema changes.** All data targets (ai_settings, organization_knowledge, prompt_pieces) already exist.

## 5. OpenAI Tool Definitions

### 5.1 `set_business_hours`

```typescript
{
  type: "function",
  function: {
    name: "set_business_hours",
    description: "Set the business operating hours. IMPORTANT: Always confirm AM/PM with the user before calling this. Times are in 24h format (HH:mm).",
    parameters: {
      type: "object",
      properties: {
        schedule: {
          type: "object",
          description: "Weekly schedule. Each day has open (boolean), openTime (HH:mm 24h), closeTime (HH:mm 24h)",
          properties: {
            monday: { type: "object", properties: { open: { type: "boolean" }, openTime: { type: "string" }, closeTime: { type: "string" } }, required: ["open"] },
            tuesday: { /* same */ },
            wednesday: { /* same */ },
            thursday: { /* same */ },
            friday: { /* same */ },
            saturday: { /* same */ },
            sunday: { /* same */ },
          },
          required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        timezone: {
          type: "string",
          enum: ["EST", "CST", "MST", "PST"],
          description: "Business timezone. MUST ask the user."
        },
        holidays: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              month: { type: "integer", minimum: 1, maximum: 12 },
              day: { type: "integer", minimum: 1, maximum: 31 },
              open: { type: "boolean" },
              openTime: { type: "string" },
              closeTime: { type: "string" }
            },
            required: ["name", "month", "day", "open"]
          }
        },
        notes: { type: "string", maxLength: 500 }
      },
      required: ["schedule", "timezone"]
    }
  }
}
```

**Handler:** Validates with existing `businessHoursSchema` from `lib/knowledge/business-hours.ts`, calls `upsertBusinessHours` server action. Reuses `composeBusinessHoursText()` for RAG embedding.

### 5.2 `set_services_pricing`

```typescript
{
  type: "function",
  function: {
    name: "set_services_pricing",
    description: "Set the business services and pricing information",
    parameters: {
      type: "object",
      properties: {
        currency: { type: "string", enum: ["USD", "EUR", "GBP", "MXN", "CAD", "BRL"] },
        services: {
          type: "array",
          maxItems: 50,
          items: {
            type: "object",
            properties: {
              name: { type: "string", maxLength: 100 },
              price: { type: "number", minimum: 0 },
              description: { type: "string", maxLength: 300 }
            },
            required: ["name", "price"]
          }
        },
        notes: { type: "string", maxLength: 500 }
      },
      required: ["currency", "services"]
    }
  }
}
```

**Handler:** Validates with `pricingSchema`, calls `upsertStructuredKnowledge` with category `"pricing"`. Reuses `composePricingText()`.

### 5.3 `set_location_contact`

```typescript
{
  type: "function",
  function: {
    name: "set_location_contact",
    description: "Set business location, contact info, and social media",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "object",
          properties: {
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zipCode: { type: "string" }
          }
        },
        contact: {
          type: "object",
          properties: {
            phone: { type: "string" },
            email: { type: "string" },
            website: { type: "string" }
          }
        },
        socialMedia: {
          type: "array",
          items: {
            type: "object",
            properties: {
              platform: { type: "string", enum: ["facebook", "instagram", "x", "linkedin", "youtube", "tiktok", "whatsapp", "yelp", "google_business"] },
              url: { type: "string" }
            },
            required: ["platform", "url"]
          }
        },
        additionalLocations: {
          type: "array",
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              phone: { type: "string" }
            },
            required: ["name", "address"]
          }
        }
      }
    }
  }
}
```

**Handler:** Validates with `locationContactSchema`, calls `upsertStructuredKnowledge` with category `"location_contact"`. Reuses `composeLocationContactText()`.

### 5.4 `set_faqs`

```typescript
{
  type: "function",
  function: {
    name: "set_faqs",
    description: "Set frequently asked questions. Max 20 FAQ entries.",
    parameters: {
      type: "object",
      properties: {
        faqs: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              question: { type: "string", maxLength: 300 },
              answer: { type: "string", maxLength: 1000 }
            },
            required: ["question", "answer"]
          }
        }
      },
      required: ["faqs"]
    }
  }
}
```

**Handler:** Validates with `faqsSchema`, calls `upsertStructuredKnowledge` with category `"faqs"`. Reuses `composeFaqsText()`.

### 5.5 `set_policies`

```typescript
{
  type: "function",
  function: {
    name: "set_policies",
    description: "Set business policies (privacy, terms, refund, etc). Max 20 entries.",
    parameters: {
      type: "object",
      properties: {
        policies: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              title: { type: "string", maxLength: 100 },
              content: { type: "string", maxLength: 2000 }
            },
            required: ["title", "content"]
          }
        }
      },
      required: ["policies"]
    }
  }
}
```

**Handler:** Validates with `policiesSchema`, calls `upsertStructuredKnowledge` with category `"policies"`. Reuses `composePoliciesText()`.

### 5.6 `set_agent_config`

```typescript
{
  type: "function",
  function: {
    name: "set_agent_config",
    description: "Configure the AI agent's name, role, personality, and rules. Only include fields that should be updated.",
    parameters: {
      type: "object",
      properties: {
        agentName: { type: "string", maxLength: 50 },
        role: { type: "string", maxLength: 2000 },
        personality: { type: "string", maxLength: 2000 },
        rules: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 50 },
        additionalInstructions: { type: "string", maxLength: 2000 }
      }
    }
  }
}
```

**Handler:** Reads current `ai_settings.prompt_structure`, merges incoming fields, recomposes `system_prompt` via `composeSystemPrompt()`, saves both to DB via Prisma update.

### 5.7 `get_category_templates`

```typescript
{
  type: "function",
  function: {
    name: "get_category_templates",
    description: "Fetch available templates (role, rule, or personality) for the organization's business category. Present them as options to the user.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["role", "rule", "personality"] }
      },
      required: ["type"]
    }
  }
}
```

**Handler:** Queries `prompt_pieces WHERE categoryId = org.businessCategoryId AND type = requested`. Returns `{ templates: [{ id, name, content }] }`. The assistant then presents these as options.

### 5.8 `apply_template`

```typescript
{
  type: "function",
  function: {
    name: "apply_template",
    description: "Apply a selected template to the agent configuration",
    parameters: {
      type: "object",
      properties: {
        pieceId: { type: "string", description: "UUID of the PromptPiece" },
        type: { type: "string", enum: ["role", "rule", "personality"] }
      },
      required: ["pieceId", "type"]
    }
  }
}
```

**Handler:** Fetches the `PromptPiece` by ID, reads current `prompt_structure`, sets the corresponding field (role→role, personality→personality, rule→appends to rules[]), recomposes and saves.

### 5.9 `extract_website_faqs`

```typescript
{
  type: "function",
  function: {
    name: "extract_website_faqs",
    description: "Extract FAQ-like content from the organization's website URL using AI. Returns extracted Q&A pairs for the user to review.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The website URL to extract from" }
      },
      required: ["url"]
    }
  }
}
```

**Handler:** Calls the existing `/api/knowledge/extract-faqs` logic (fetch URL, strip HTML, send to gpt-4o-mini for extraction). Returns extracted FAQs. The assistant then asks the user which ones to keep before calling `set_faqs`.

### 5.10 `set_free_text_knowledge`

```typescript
{
  type: "function",
  function: {
    name: "set_free_text_knowledge",
    description: "Add a free-text knowledge entry that doesn't fit the structured categories",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", maxLength: 200 },
        content: { type: "string", maxLength: 2000 }
      },
      required: ["title", "content"]
    }
  }
}
```

**Handler:** Calls `createKnowledgeItem` server action with category `"free_text"`.

### 5.11 `mark_onboarding_complete`

```typescript
{
  type: "function",
  function: {
    name: "mark_onboarding_complete",
    description: "Mark the onboarding as complete. Call this when the user has finished setting up or wants to skip remaining setup.",
    parameters: { type: "object", properties: {} }
  }
}
```

**Handler:** `prisma.organization.update({ where: { id: orgId }, data: { isOnboarded: true } })`.

## 6. System Prompt

```typescript
function buildAssistantSystemPrompt(context: {
  orgName: string;
  categoryName: string | null;
  channelUrl: string | null;
  isOnboarding: boolean;
  configuredAreas: string[];  // e.g., ["business_hours", "faqs"]
  agentName: string | null;
  templateCounts: { role: number; rule: number; personality: number };
}): string {
  return `You are the Setup Assistant for ChatFlow360, an AI-powered live chat platform.
You help business owners configure their AI chat agent through natural conversation.

CURRENT CONTEXT:
- Organization: ${context.orgName}
- Business Category: ${context.categoryName ?? "Not assigned"}
- Website: ${context.channelUrl ?? "Not set"}
- AI Agent Name: ${context.agentName ?? "Not set yet"}
- Already configured: ${context.configuredAreas.length > 0 ? context.configuredAreas.join(", ") : "Nothing yet"}
${context.templateCounts.role > 0 ? `- Available templates: ${context.templateCounts.role} roles, ${context.templateCounts.rule} rules, ${context.templateCounts.personality} personalities` : ""}

LANGUAGE:
- Respond in the same language the user writes in (English or Spanish).
- This is a bilingual platform for Miami businesses.

${context.isOnboarding ? `ONBOARDING MODE:
- This is a new account. Guide the user through setting up their AI assistant.
- Be conversational and friendly — don't make it feel like a form.
- Cover these areas naturally (order can vary based on conversation):
  1. Business info: what they do, where they are, contact info
  2. Business hours: day-by-day schedule. CRITICAL: Always confirm AM/PM explicitly. Always ask timezone (EST/CST/MST/PST).
  3. Services & pricing: what they offer, prices
  4. AI agent personality: name, role, personality, rules
     → When relevant, use get_category_templates to show available templates as options
     → Present templates as numbered choices, always offer "I'll write my own" as the last option
  5. FAQs: common questions visitors ask
     → Offer to extract from their website if they have one
  6. Policies (optional): privacy, refund, etc.
- Don't ask everything at once — have a natural conversation.
- After each tool call, briefly confirm what was saved and smoothly move to the next area.
- When all essential areas are covered, summarize what was configured and call mark_onboarding_complete.
- Skip areas the user says are not relevant to their business.` : `ASSISTANT MODE:
- The account is already set up. Help the admin manage and update their configuration.
- When the user asks to change something, use the appropriate tool to update it.
- Be concise — the user is busy.
- If asked about something you can't do (analytics, conversations), explain it's coming soon.`}

RULES:
- Never make up information — only save what the user explicitly tells you.
- For business hours: NEVER assume AM/PM. If the user says "9 to 5", ask "9:00 AM to 5:00 PM, correct?"
- For business hours: ALWAYS ask timezone before saving.
- When presenting templates, show the template name and a brief preview of content.
- Confirm before overwriting existing data: "You already have business hours set. Want me to replace them?"
- Keep responses concise (2-4 sentences max per message).
- Don't ask more than 2 questions per message.`;
}
```

## 7. File Structure — New Files

```
lib/
  assistant/
    system-prompt.ts       — buildAssistantSystemPrompt()
    tools.ts               — ASSISTANT_TOOLS array (tool definitions)
    tool-handlers.ts       — executeToolCall() dispatcher + individual handlers
    types.ts               — AssistantMessage, ToolResult, SSE event types

app/
  api/
    assistant/
      chat/
        route.ts           — POST handler: streaming SSE endpoint

  [locale]/
    (onboarding)/
      onboarding/
        page.tsx           — Server component: auth guard + redirect if already onboarded
      layout.tsx           — Minimal layout (no sidebar, no nav)

components/
  assistant/
    assistant-chat.tsx     — Main chat component (widget-like UI, shared by onboarding + panel)
    assistant-bubble.tsx   — Floating bubble for post-onboarding (in dashboard)
    onboarding-screen.tsx  — Fullscreen wrapper for onboarding
    tool-confirmation.tsx  — UI cards showing what was saved after tool calls
    template-chips.tsx     — Clickable chips for template selection
```

## 8. File Structure — Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `isOnboarded` field to Organization |
| `prisma/migrations/YYYYMMDD_add_onboarding/migration.sql` | ALTER TABLE + UPDATE existing |
| `app/[locale]/(dashboard)/layout.tsx` | Check `isOnboarded`, redirect if false. Add `<AssistantBubble>` |
| `components/layout/dashboard-shell.tsx` | Accept + render `<AssistantBubble>` prop/child |
| `lib/i18n/messages/en.json` | Add `assistant.*` keys |
| `lib/i18n/messages/es.json` | Add `assistant.*` keys |

## 9. UI Component Specs

### 9.1 AssistantChat (shared component)

Reuses the exact visual design of the visitor widget. Key CSS specs:

**Header:**
```css
background: linear-gradient(135deg, #1c2e47 0%, {headerColor} 100%)
padding: 18px 20px 30px
border-radius: 20px 20px 0 0  (in panel mode, 0 for side panel)
```
- Avatar: 42x42px circle, `rgba(255,255,255,0.15)` bg, chat icon 22px
- Online dot: 10x10px, `#34d399`, border 2px solid `#1c2e47`
- Title: 16px/600, white — shows "Setup Assistant" or "Assistant"
- Subtitle: 12px, opacity 0.7 — shows "Let's get your account ready" or "How can I help?"
- Close button: X icon 18px, opacity 0.7

**Messages area:**
```css
flex: 1; overflow-y: auto; padding: 20px 16px;
background: #f8fafc; border-radius: 16px 16px 0 0; margin-top: -16px;
```
- AI bubbles: `aiBubbleBg` bg, `aiBubbleText` color, `border-radius: 20px 20px 20px 6px`, max-width 78%
- User bubbles: `visitorBubbleBg` bg, `visitorBubbleText` color, `border-radius: 20px 20px 6px 20px`, max-width 78%
- Font: 14px, line-height 1.5, padding 10px 16px
- Typing indicator: 3 dots (7x7px, border-radius 50%, sendButtonColor, opacity 0.6), wave animation 1.3s

**Input area:**
```css
padding: 12px 14px; background: #fff; border-top: 1px solid #f1f5f9;
```
- Input: 42px height, border-radius 24px, bg #f1f5f9, border 1px solid #e2e8f0
- Send button: 42x42px circle, sendButtonColor bg, white icon

**Tool confirmation cards (inline in messages):**
- Styled as AI message but with a subtle colored left border
- Icon + title ("Business Hours Saved") + brief summary
- Background slightly different from regular AI bubble (e.g., `#f0fdf4` green tint for success)

**Template chips:**
- Rendered inside an AI message as clickable pills
- Border: 1px solid `sendButtonColor`, border-radius 20px, padding 8px 16px
- On click: sends the selection as a user message or directly triggers apply_template

### 9.2 AssistantBubble (dashboard floating button)

- Positioned: fixed bottom-6 right-6 (same as visitor widget)
- Size: 56x56px, border-radius 50%
- Background: gradient matching the org's widget bubbleColor
- Icon: chat bubble SVG, white
- Animation: same nudge as the visitor bubble (tuck-in bounce)
- Click: opens side panel (400px wide, full height, fixed right)
- Badge: unread count (future use)

### 9.3 OnboardingScreen (fullscreen)

- Full viewport, centered content
- Max-width: 500px for the chat panel (slightly wider than widget)
- Background: cool gradient or subtle pattern (brandbook bg)
- ChatFlow360 logo at top
- "Skip setup" link at bottom: `text-sm text-muted-foreground underline`
- Progress dots or percentage (optional, based on configured areas)

## 10. API Endpoint Detail

### `POST /api/assistant/chat`

**Request body:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  organizationId: string;   // UUID
  channelId: string;         // UUID
  isOnboarding: boolean;     // determines system prompt mode
}
```

**Auth:** Supabase session cookie → `getUser()` → verify user has membership in the org.

**Response:** `text/event-stream` (SSE). Events:

| Event type | Payload | When |
|------------|---------|------|
| `token` | `{ content: string }` | Each streamed text token |
| `tool_start` | `{ name: string, args: object }` | Tool call begins (show loading) |
| `tool_result` | `{ name: string, success: boolean, summary: string }` | Tool executed |
| `templates` | `{ type: string, templates: [{id, name, preview}] }` | Template options to display |
| `done` | `{}` | Stream complete |
| `error` | `{ message: string }` | Error occurred |

**Flow:**
1. Validate auth + org membership
2. Load org context: name, category, channelUrl, current ai_settings, configured knowledge areas
3. Build system prompt via `buildAssistantSystemPrompt(context)`
4. Create OpenAI streaming completion with tools
5. Stream tokens to client
6. On tool_call: execute handler → send result to client → feed result back to OpenAI → continue
7. Handle recursive tool calls (OpenAI may call multiple tools in sequence)

## 11. Execution Plan (Build Order)

### Phase 1a — Data Layer
1. **Prisma migration:** Add `isOnboarded` to Organization
2. **`lib/assistant/types.ts`** — TypeScript interfaces
3. **`lib/assistant/tools.ts`** — Tool definitions array
4. **`lib/assistant/tool-handlers.ts`** — Tool execution logic (reuses existing server actions)
5. **`lib/assistant/system-prompt.ts`** — System prompt builder

### Phase 1b — API
6. **`app/api/assistant/chat/route.ts`** — Streaming SSE endpoint

### Phase 1c — UI Components
7. **`components/assistant/assistant-chat.tsx`** — Chat component (widget-like)
8. **`components/assistant/tool-confirmation.tsx`** — Tool result cards
9. **`components/assistant/template-chips.tsx`** — Template selection chips

### Phase 1d — Onboarding Page
10. **`app/[locale]/(onboarding)/layout.tsx`** — Minimal layout
11. **`app/[locale]/(onboarding)/onboarding/page.tsx`** — Server component
12. **`components/assistant/onboarding-screen.tsx`** — Fullscreen wrapper
13. **Redirect logic** in dashboard layout (check `isOnboarded`)

### Phase 1e — Side Panel (Post-onboarding)
14. **`components/assistant/assistant-bubble.tsx`** — Floating bubble
15. **Add bubble to DashboardShell**
16. **Side panel open/close animation**

### Phase 1f — Polish & i18n
17. **i18n keys** (en.json + es.json)
18. **Testing** — full onboarding flow end-to-end
19. **Edge cases** — network errors, tool failures, concurrent sessions

## 12. Existing Code to Reuse (DO NOT recreate)

| What | Where | How we reuse it |
|------|-------|----------------|
| OpenAI client factory | `lib/openai/client.ts` | `createOpenAIClient(orgId)` |
| Business hours schema + compose | `lib/knowledge/business-hours.ts` | Validate tool args + generate RAG text |
| FAQs schema + compose | `lib/knowledge/faqs.ts` | Same |
| Pricing schema + compose | `lib/knowledge/pricing.ts` | Same |
| Location schema + compose | `lib/knowledge/location-contact.ts` | Same |
| Policies schema + compose | `lib/knowledge/policies.ts` | Same |
| Upsert business hours | `lib/admin/actions.ts` → `upsertBusinessHours` | Call from tool handler |
| Upsert structured knowledge | `lib/admin/actions.ts` → `upsertStructuredKnowledge` | Call from tool handler |
| Create free text knowledge | `lib/admin/actions.ts` → `createKnowledgeItem` | Call from tool handler |
| System prompt composer | `lib/chat/prompt-builder.ts` → `composeSystemPrompt` | Recompose after agent config changes |
| PromptPiece queries | `lib/prompt-pieces.ts` | Fetch templates for org's category |
| FAQ extraction from URL | `app/api/knowledge/extract-faqs/route.ts` | Reuse extraction logic |
| Widget appearance defaults | `lib/widget/appearance.ts` | Use for chat panel styling |
| RAG knowledge insert | `lib/rag/knowledge.ts` | `createKnowledge()`, `updateKnowledge()` |

## 13. Security Considerations

- **Auth required:** Every `/api/assistant/chat` call validates Supabase session
- **Org scoping:** User must be a member of the org they're configuring
- **Tool handlers validate:** Each handler checks org ownership before writing
- **Rate limiting:** Consider adding rate limit per org (future — Upstash Redis)
- **No sensitive data in SSE:** Tool results are summaries, not raw DB records
- **Input validation:** All tool args validated with Zod before execution
- **Super Admin bypass:** Super Admins can access any org's assistant (uses adminContext)

## 14. Open Questions / Future Phases

### Phase 2 (Read/Analytics)
- `get_conversation_summary` — summarize recent conversations
- `get_lead_stats` — lead counts, conversion rates
- `get_usage_stats` — token usage, conversation counts

### Phase 3 (Advanced)
- Widget appearance configuration via chat ("make the bubble red")
- Export data ("export my leads as CSV")
- Multi-channel support ("add a new website channel")

### Decisions Deferred
- Should the assistant chat history persist across sessions? (Currently: no, ephemeral)
- Should there be a "restart onboarding" option in settings? (Probably yes)
- Max tokens per assistant conversation? (Need to balance cost vs quality)
