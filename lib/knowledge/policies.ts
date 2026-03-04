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

// ─── Policy Presets ──────────────────────────────────────────────

export interface PolicyPreset {
  key: string;
  name: string;
  nameEs: string;
  group: "common" | "other";
}

export const POLICY_PRESETS: PolicyPreset[] = [
  // Most Common
  { key: "privacy", name: "Privacy Policy", nameEs: "Política de Privacidad", group: "common" },
  { key: "terms", name: "Terms of Use / Conditions", nameEs: "Términos de Uso / Condiciones", group: "common" },
  { key: "cookie", name: "Cookie Policy", nameEs: "Política de Cookies", group: "common" },
  { key: "accessibility", name: "Accessibility Statement", nameEs: "Declaración de Accesibilidad", group: "common" },
  { key: "refund", name: "Refund Policy", nameEs: "Política de Reembolso", group: "common" },
  { key: "shipping", name: "Shipping Policy", nameEs: "Política de Envíos", group: "common" },
  // Others
  { key: "ftc", name: "FTC Act (Section 5)", nameEs: "Ley FTC (Sección 5)", group: "other" },
  { key: "hipaa", name: "HIPAA", nameEs: "HIPAA", group: "other" },
  { key: "ccpa", name: "CCPA/CPRA (California)", nameEs: "CCPA/CPRA (California)", group: "other" },
  { key: "coppa", name: "COPPA (Children's Online Privacy)", nameEs: "COPPA (Privacidad Infantil en Línea)", group: "other" },
  { key: "data-protection", name: "Data Protection", nameEs: "Protección de Datos", group: "other" },
];

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
