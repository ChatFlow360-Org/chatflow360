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

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
