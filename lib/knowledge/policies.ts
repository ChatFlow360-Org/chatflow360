/**
 * Policies — Structured Knowledge Category
 *
 * Converts structured policy entries into natural-language text for RAG embedding.
 */

import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────

export interface PolicyItem {
  title: string; // max 100 — e.g. "Cancellation Policy", "Refund Policy"
  content: string; // max 2000
}

export interface PoliciesData {
  items: PolicyItem[];
}

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_POLICIES: PoliciesData = {
  items: [],
};

// ─── Zod Validation ──────────────────────────────────────────────

const policyItemSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
});

export const policiesSchema = z.object({
  items: z.array(policyItemSchema).min(1).max(20),
});

// ─── Composer: Structured → Text ─────────────────────────────────

/**
 * Compose policies structured data into natural language text for RAG.
 * Output is bilingual (EN/ES) so the AI can answer in either language.
 */
export function composePoliciesText(data: PoliciesData): string {
  const sections: string[] = [];

  sections.push("POLICIES / POLÍTICAS:");

  for (const item of data.items) {
    sections.push(`\n[${item.title}]`);
    sections.push(item.content);
  }

  return sections.join("\n");
}
