"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeMessagesOptions {
  /** Conversation ID to scope the subscription */
  conversationId: string;
  /** Callback when new messages arrive */
  onNewMessage: () => void;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the "messages" table,
 * filtered by conversation_id. Debounces rapid events to 300ms.
 */
export function useRealtimeMessages(options: UseRealtimeMessagesOptions) {
  const { conversationId, onNewMessage, enabled = true } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(onNewMessage);

  // Keep callback ref fresh without triggering re-subscriptions
  useEffect(() => {
    callbackRef.current = onNewMessage;
  }, [onNewMessage]);

  const debouncedCallback = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      callbackRef.current();
      debounceTimerRef.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    const supabase = createClient();

    const realtimeChannel = supabase
      .channel(`messages-realtime:${conversationId}`)
      .on(
        "postgres_changes" as const,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          debouncedCallback();
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime:messages]", status, err ?? "");
      });

    channelRef.current = realtimeChannel;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, conversationId, debouncedCallback]);
}
