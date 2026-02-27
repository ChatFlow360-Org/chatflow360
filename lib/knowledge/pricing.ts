/**
 * Pricing / Services — Structured Knowledge Category
 *
 * Converts structured service + price data into natural-language text for RAG embedding.
 */

import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────

export interface ServiceItem {
  name: string; // max 100
  price: string; // max 50 — e.g. "99.99", "From $50", "Custom"
  description?: string; // max 300
}

export interface PricingData {
  currency: string; // e.g. "USD", "EUR"
  items: ServiceItem[];
  notes?: string; // max 500
}

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_PRICING: PricingData = {
  currency: "USD",
  items: [],
  notes: "",
};

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (\u20AC)" },
  { value: "GBP", label: "GBP (\u00A3)" },
  { value: "MXN", label: "MXN ($)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "BRL", label: "BRL (R$)" },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  MXN: "MXN $",
  CAD: "CA$",
  BRL: "R$",
};

// ─── Zod Validation ──────────────────────────────────────────────

const serviceItemSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.string().min(1).max(50),
  description: z.string().max(300).optional(),
});

export const pricingSchema = z.object({
  currency: z.string().min(1).max(10),
  items: z.array(serviceItemSchema).min(1).max(50),
  notes: z.string().max(500).optional(),
});

// ─── Composer: Structured → Text ─────────────────────────────────

/**
 * Compose pricing structured data into natural language text for RAG.
 * Output is bilingual (EN/ES) so the AI can answer in either language.
 */
export function composePricingText(data: PricingData): string {
  const sections: string[] = [];
  const sym = CURRENCY_SYMBOLS[data.currency] || data.currency;

  sections.push("SERVICES & PRICING / SERVICIOS Y PRECIOS:");
  sections.push(`Currency / Moneda: ${data.currency}`);

  for (const item of data.items) {
    const priceStr = /^\d/.test(item.price) ? `${sym}${item.price}` : item.price;
    const desc = item.description ? ` — ${item.description}` : "";
    sections.push(`- ${item.name}: ${priceStr}${desc}`);
  }

  if (data.notes?.trim()) {
    sections.push(`\nAdditional notes / Notas adicionales: ${data.notes.trim()}`);
  }

  return sections.join("\n");
}
