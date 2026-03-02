import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

export const PIECE_TYPES = ["role", "rule", "personality"] as const;
export type PieceType = (typeof PIECE_TYPES)[number];

export interface PromptPieceData {
  id: string;
  categoryId: string | null;
  type: PieceType;
  name: string;
  content: string;
  sortOrder: number;
}

export interface BusinessCategoryData {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

export const businessCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
});

export const promptPieceSchema = z.object({
  categoryId: z.string().uuid(),
  type: z.enum(PIECE_TYPES),
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const globalRuleSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
