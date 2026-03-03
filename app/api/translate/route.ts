import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth/user";
import { resolvePlatformApiKey } from "@/lib/openai/client";

const translateSchema = z.object({
  texts: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        from: z.enum(["en", "es"]),
        to: z.enum(["en", "es"]),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = translateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const apiKey = await resolvePlatformApiKey();
    const openai = new OpenAI({ apiKey });

    const { texts } = parsed.data;
    const fromLang = texts[0].from === "en" ? "English" : "Spanish";
    const toLang = texts[0].to === "en" ? "English" : "Spanish";

    const numbered = texts.map((t, i) => `${i + 1}. ${t.text}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `You are a professional translator for a business chat widget. Translate from ${fromLang} to ${toLang}. Keep the same tone, length, and formality. Preserve template variables like {{visitor_name}} and {{org_name}} exactly as-is. Return ONLY the translations, one per line, numbered to match the input. No explanations.`,
        },
        { role: "user", content: numbered },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const lines = raw.split("\n").filter((l) => l.trim());
    const translations = lines.map((line) =>
      line.replace(/^\d+\.\s*/, "").trim(),
    );

    if (translations.length !== texts.length) {
      return NextResponse.json(
        { error: "Translation mismatch" },
        { status: 500 },
      );
    }

    return NextResponse.json({ translations });
  } catch (error) {
    console.error(
      "[POST /api/translate]",
      error instanceof Error ? error.message : error,
    );
    if (
      error instanceof Error &&
      error.message === "No platform OpenAI API key configured"
    ) {
      return NextResponse.json(
        { error: "Translation not available" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 },
    );
  }
}
