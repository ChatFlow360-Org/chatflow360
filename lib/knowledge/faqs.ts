/**
 * FAQs — Structured Knowledge Category
 *
 * Converts structured Q&A pairs into natural-language text for RAG embedding.
 */

import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────

export interface FAQItem {
  question: string; // max 300
  answer: string; // max 1000
}

export interface FAQsData {
  items: FAQItem[];
}

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_FAQS: FAQsData = {
  items: [],
};

// ─── Zod Validation ──────────────────────────────────────────────

const faqItemSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(1000),
});

export const faqsSchema = z.object({
  items: z.array(faqItemSchema).min(1).max(50),
});

// ─── Composer: Structured → Text ─────────────────────────────────

/**
 * Compose FAQ structured data into natural language text for RAG.
 * Output is bilingual (EN/ES) so the AI can answer in either language.
 */
export function composeFaqsText(data: FAQsData): string {
  const sections: string[] = [];

  sections.push("FREQUENTLY ASKED QUESTIONS / PREGUNTAS FRECUENTES:");

  for (const item of data.items) {
    sections.push(`\nQ: ${item.question}`);
    sections.push(`A: ${item.answer}`);
  }

  return sections.join("\n");
}
