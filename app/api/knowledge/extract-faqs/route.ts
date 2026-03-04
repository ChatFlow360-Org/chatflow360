import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { resolvePlatformApiKey } from "@/lib/openai/client";

// ─── Validation ──────────────────────────────────────────

const extractFaqsSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("url"),
    urls: z.array(z.string().url().max(2048)).min(1).max(5),
  }),
  z.object({
    source: z.literal("text"),
    text: z.string().min(50).max(50_000),
  }),
]);

// ─── HTML Stripping ──────────────────────────────────────

function stripHtml(html: string, charLimit = 15_000): string {
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

  if (stripped.length > charLimit) {
    const headSize = Math.floor(charLimit * 0.8);
    const tailSize = charLimit - headSize;
    return stripped.slice(0, headSize) + "\n...\n" + stripped.slice(-tailSize);
  }

  return stripped;
}

// ─── URL Fetch ───────────────────────────────────────────

async function fetchPageContent(
  url: string,
  charLimit = 15_000,
): Promise<string> {
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
    return stripHtml(html, charLimit);
  } finally {
    clearTimeout(timeout);
  }
}

// ─── System Prompt ───────────────────────────────────────

const SYSTEM_PROMPT = `You are an FAQ extraction specialist. You ONLY extract question-and-answer pairs that LITERALLY exist in the provided content.

STRICT RULES:
1. ONLY extract Q&A pairs that are VERBATIM present in the text
2. Do NOT rephrase questions — copy them exactly as written
3. Do NOT rephrase answers — copy them exactly as written
4. Do NOT generate, invent, or infer any questions or answers
5. Do NOT convert general information, service descriptions, or marketing copy into Q&A format
6. If the content does not contain explicit Q&A pairs, return {"faqs": []}

What counts as a Q&A pair:
- Explicit FAQ sections with questions and answers
- Q: / A: formatted text
- Accordion or collapsible question blocks with corresponding answers
- Text clearly structured as "Question? Answer." format

What does NOT count:
- General service or product descriptions
- Marketing copy or slogans
- Navigation, menu items, or page headings
- Content that COULD be turned into Q&A but is NOT already in Q&A format

Format rules:
- Each question must end with "?"
- Keep answers under 500 characters
- Extract up to 30 pairs maximum
- If content is in Spanish, keep it in Spanish. If mixed, keep each pair in its original language.

Return ONLY valid JSON: {"faqs": [{"question": "...", "answer": "..."}, ...]}
If no explicit Q&A content is found, return: {"faqs": []}`;

// ─── Constants ───────────────────────────────────────────

const TOTAL_CHAR_BUDGET = 15_000;

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
    let warnings: string[] = [];

    if (parsed.data.source === "url") {
      const { urls } = parsed.data;
      const perUrlLimit = Math.floor(TOTAL_CHAR_BUDGET / urls.length);

      const results = await Promise.allSettled(
        urls.map((u) => fetchPageContent(u, perUrlLimit)),
      );

      const successes: { url: string; content: string }[] = [];
      const failures: string[] = [];

      results.forEach((result, i) => {
        if (result.status === "fulfilled" && result.value.length >= 50) {
          successes.push({ url: urls[i], content: result.value });
        } else {
          failures.push(urls[i]);
        }
      });

      if (successes.length === 0) {
        return NextResponse.json(
          { error: "Could not fetch any of the provided URLs" },
          { status: 422 },
        );
      }

      warnings = failures;

      contentToProcess = successes
        .map(({ url, content }) => `--- Content from ${url} ---\n${content}`)
        .join("\n\n");
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

    return NextResponse.json({
      faqs,
      ...(warnings.length > 0 ? { warnings } : {}),
    });
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
