import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { resolvePlatformApiKey } from "@/lib/openai/client";

// ─── Validation ──────────────────────────────────────────

const extractFaqsSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("url"),
    url: z.string().url().max(2048),
  }),
  z.object({
    source: z.literal("text"),
    text: z.string().min(50).max(50_000),
  }),
]);

// ─── HTML Stripping ──────────────────────────────────────

function stripHtml(html: string): string {
  const stripped = html
    // Remove script, style, nav, header, footer, aside, noscript blocks
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    // Replace block elements with newlines
    .replace(/<\/?(p|div|br|li|h[1-6]|section|article|main)[^>]*>/gi, "\n")
    // Strip remaining tags
    .replace(/<[^>]+>/g, "")
    // Decode common HTML entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Limit to 15,000 chars to avoid token overflow
  if (stripped.length > 15_000) {
    return stripped.slice(0, 12_000) + "\n...\n" + stripped.slice(-3_000);
  }

  return stripped;
}

// ─── URL Fetch ───────────────────────────────────────────

async function fetchPageContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatFlow360Bot/1.0)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("Not an HTML page");
    }

    const html = await response.text();
    return stripHtml(html);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are an FAQ extraction specialist. Your job is to identify and extract question-and-answer pairs from website content.

Extract ALL FAQ-style content you find, including:
- Explicit FAQ sections
- Q: / A: style formatting
- Accordion or collapsible question blocks
- "How do I...?", "What is...?", "Do you...?" questions with their answers
- Service descriptions that answer common questions

Rules:
- Extract up to 30 Q&A pairs maximum
- Each question must be a complete, natural question (end with "?")
- Each answer must be a complete, informative response
- Keep answers concise (under 500 characters) but informative
- Do NOT invent or paraphrase questions/answers — extract only what exists
- Skip navigation text, menu items, generic marketing slogans
- If content is in Spanish, keep it in Spanish. If mixed, keep each pair in its original language.

Return ONLY valid JSON, no markdown, no explanation:
{"faqs": [{"question": "...", "answer": "..."}, ...]}

If no FAQ content is found, return: {"faqs": []}`;

// ─── Route Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = extractFaqsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const apiKey = await resolvePlatformApiKey();
    const openai = new OpenAI({ apiKey });

    let contentToProcess: string;

    if (parsed.data.source === "url") {
      try {
        contentToProcess = await fetchPageContent(parsed.data.url);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Fetch failed";
        console.error(
          "[POST /api/knowledge/extract-faqs] URL fetch error:",
          message,
        );
        return NextResponse.json(
          { error: `Could not fetch URL: ${message}` },
          { status: 422 },
        );
      }

      if (contentToProcess.length < 100) {
        return NextResponse.json(
          { error: "Page content is too short or empty" },
          { status: 422 },
        );
      }
    } else {
      contentToProcess = parsed.data.text;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract FAQs from this content:\n\n${contentToProcess}`,
        },
      ],
    });

    const rawJson = completion.choices[0]?.message?.content ?? "{}";

    let extracted: { faqs?: unknown[] };
    try {
      extracted = JSON.parse(rawJson);
    } catch {
      throw new Error("Invalid JSON from AI");
    }

    // Validate and sanitize extracted pairs
    const faqArray = Array.isArray(extracted.faqs) ? extracted.faqs : [];
    const faqs = faqArray
      .filter(
        (item): item is { question: string; answer: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).question === "string" &&
          typeof (item as Record<string, unknown>).answer === "string" &&
          ((item as Record<string, unknown>).question as string).trim()
            .length > 0 &&
          ((item as Record<string, unknown>).answer as string).trim().length >
            0,
      )
      .slice(0, 30)
      .map((item) => ({
        question: item.question.trim().slice(0, 300),
        answer: item.answer.trim().slice(0, 1000),
      }));

    return NextResponse.json({ faqs });
  } catch (error) {
    console.error(
      "[POST /api/knowledge/extract-faqs]",
      error instanceof Error ? error.message : error,
    );
    if (
      error instanceof Error &&
      error.message === "No platform OpenAI API key configured"
    ) {
      return NextResponse.json(
        { error: "AI extraction not available" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Extraction failed" },
      { status: 500 },
    );
  }
}
