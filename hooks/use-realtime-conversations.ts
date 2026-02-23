"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const POLL_INTERVAL = 30_000; // 30s safety-net (setAuth handles instant updates)

interface UseRealtimeConversationsOptions {
  /** Optional channel ID to scope the subscription */
  channelId?: string;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Keeps the conversations list up-to-date via two mechanisms:
 * 1. Supabase Realtime postgres_changes with explicit setAuth (instant)
 * 2. Polling fallback every 30s as safety net (visibility-aware)
 */
export function useRealtimeConversations(
  options: UseRealtimeConversationsOptions = {}
) {
  const { channelId, enabled = true } = options;
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const debouncedRefresh = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      router.refresh();
      debounceTimerRef.current = null;
    }, 300);
  }, [router]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const supabase = createClient();

    // --- 1. Supabase Realtime with explicit auth for RLS ---
    (async () => {
      // Propagate auth token so Realtime evaluates RLS as "authenticated"
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      const filter = channelId
        ? `channel_id=eq.${channelId}`
        : undefined;

      const realtimeChannelName = channelId
        ? `conversations-realtime:${channelId}`
        : "conversations-realtime";

      const realtimeChannel = supabase
        .channel(realtimeChannelName)
        .on(
          "postgres_changes" as const,
          {
            event: "INSERT",
            schema: "public",
            table: "conversations",
            ...(filter ? { filter } : {}),
          },
          () => {
            debouncedRefresh();
          }
        )
        .on(
          "postgres_changes" as const,
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
            ...(filter ? { filter } : {}),
          },
          () => {
            debouncedRefresh();
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
        router.refresh();
      }
    }, POLL_INTERVAL);

    // Cleanup
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
  }, [enabled, channelId, debouncedRefresh, router]);
}
