"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const POLL_INTERVAL = 30_000; // 30s safety-net (setAuth handles instant updates)

interface UseRealtimeMessagesOptions {
  /** Conversation ID to scope the subscription */
  conversationId: string;
  /** Callback when new messages arrive */
  onNewMessage: () => void;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Keeps conversation messages up-to-date via two mechanisms:
 * 1. Supabase Realtime postgres_changes with explicit setAuth (instant)
 * 2. Polling fallback every 30s as safety net (visibility-aware)
 */
export function useRealtimeMessages(options: UseRealtimeMessagesOptions) {
  const { conversationId, onNewMessage, enabled = true } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

    let cancelled = false;
    const supabase = createClient();

    // --- 1. Supabase Realtime with explicit auth for RLS ---
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

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
        .subscribe();

      if (cancelled) {
        supabase.removeChannel(realtimeChannel);
        return;
      }

      channelRef.current = realtimeChannel;
    })();

    // --- 2. Polling safety net (visibility-aware) ---
    pollRef.current = setInterval(() => {
      if (!document.hidden) {
        callbackRef.current();
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, conversationId, debouncedCallback]);
}
