/**
 * Location & Contact — Structured Knowledge Category
 *
 * Converts structured location/contact data into natural-language text for RAG embedding.
 */

import { z } from "zod";

// ─── Types ───────────────────────────────────────────────────────

export interface SocialMediaEntry {
  platform: string; // e.g. "Facebook", "Instagram"
  url: string;
}

export interface AdditionalLocation {
  name: string; // e.g. "Miami Office"
  address: string;
  phone?: string;
}

export interface LocationContactData {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  socialMedia: SocialMediaEntry[];
  additionalLocations: AdditionalLocation[];
}

// ─── Defaults ────────────────────────────────────────────────────

export const DEFAULT_LOCATION_CONTACT: LocationContactData = {
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  email: "",
  website: "",
  socialMedia: [],
  additionalLocations: [],
};

export const SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "X (Twitter)",
  "LinkedIn",
  "YouTube",
  "TikTok",
  "WhatsApp",
  "Yelp",
  "Google Business",
];

// ─── Zod Validation ──────────────────────────────────────────────

const socialMediaSchema = z.object({
  platform: z.string().min(1).max(50),
  url: z.string().min(1).max(500),
});

const additionalLocationSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().min(1).max(300),
  phone: z.string().max(30).optional(),
});

export const locationContactSchema = z.object({
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().max(200).optional(),
  website: z.string().max(300).optional(),
  socialMedia: z.array(socialMediaSchema).max(10),
  additionalLocations: z.array(additionalLocationSchema).max(5),
});

// ─── Composer: Structured → Text ─────────────────────────────────

/**
 * Compose location/contact structured data into natural language text for RAG.
 * Output is bilingual (EN/ES) so the AI can answer in either language.
 */
export function composeLocationContactText(data: LocationContactData): string {
  const sections: string[] = [];

  sections.push("LOCATION & CONTACT / UBICACIÓN Y CONTACTO:");

  // Primary address
  const addressParts = [data.address, data.city, data.state, data.zipCode].filter(Boolean);
  if (addressParts.length > 0) {
    sections.push(`Address / Dirección: ${addressParts.join(", ")}`);
  }

  if (data.phone) sections.push(`Phone / Teléfono: ${data.phone}`);
  if (data.email) sections.push(`Email: ${data.email}`);
  if (data.website) sections.push(`Website / Sitio web: ${data.website}`);

  // Social media
  if (data.socialMedia.length > 0) {
    sections.push("\nSocial Media / Redes Sociales:");
    for (const sm of data.socialMedia) {
      sections.push(`- ${sm.platform}: ${sm.url}`);
    }
  }

  // Additional locations
  if (data.additionalLocations.length > 0) {
    sections.push("\nAdditional Locations / Ubicaciones Adicionales:");
    for (const loc of data.additionalLocations) {
      const phone = loc.phone ? ` — Phone: ${loc.phone}` : "";
      sections.push(`- ${loc.name}: ${loc.address}${phone}`);
    }
  }

  return sections.join("\n");
}
