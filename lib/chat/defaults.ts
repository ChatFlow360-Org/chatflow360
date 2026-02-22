/**
 * Default handoff keywords pre-loaded for new organizations.
 * Bilingual EN/ES — universal for any business type.
 * Users can edit, remove, or add their own in AI Settings.
 */
export const DEFAULT_HANDOFF_KEYWORDS = [
  // English
  "human",
  "agent",
  "real person",
  "speak to someone",
  "talk to someone",
  "representative",
  "operator",
  "live agent",
  "supervisor",
  "manager",
  // Spanish
  "humano",
  "agente",
  "persona real",
  "hablar con alguien",
  "representante",
  "operador",
  "agente en vivo",
  "supervisor",
  "gerente",
] as const;

export type DefaultHandoffKeyword = (typeof DEFAULT_HANDOFF_KEYWORDS)[number];
