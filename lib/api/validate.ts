import { z } from "zod";

export const chatMessageSchema = z.object({
  publicKey: z.string().uuid("Invalid channel key"),
  visitorId: z.string().min(1).max(100),
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
});

export const chatHistorySchema = z.object({
  visitorId: z.string().min(1).max(100),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
