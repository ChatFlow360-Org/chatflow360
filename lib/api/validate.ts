import { z } from "zod";

export const chatMessageSchema = z.object({
  publicKey: z.string().uuid("Invalid channel key"),
  visitorId: z.string().uuid("Invalid visitor ID"),
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  pageUrl: z.string().url().max(2048).optional(),
});

export const chatHistorySchema = z.object({
  visitorId: z.string().uuid("Invalid visitor ID"),
});

export const closeConversationSchema = z.object({
  visitorId: z.string().uuid("Invalid visitor ID"),
});

export const ratingSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  visitorId: z.string().uuid("Invalid visitor ID"),
  rating: z.number().int().min(1).max(5),
});

export const transcriptSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  visitorId: z.string().uuid("Invalid visitor ID"),
  email: z.string().email().max(254),
  name: z.string().min(1).max(100),
  lang: z.enum(["en", "es"]).optional().default("en"),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
