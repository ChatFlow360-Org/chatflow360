"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const POLL_INTERVAL = 10_000; // 10 seconds

interface UseRealtimeConversationsOptions {
  /** Optional channel ID to scope the subscription */
  channelId?: string;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Keeps the conversations list up-to-date via two mechanisms:
 * 1. Supabase Realtime postgres_changes (instant, when available)
 * 2. Polling fallback every 10s (reliable, visibility-aware)
 *
 * Both trigger router.refresh() to re-fetch server data.
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

    const supabase = createClient();

    // --- 1. Supabase Realtime (best-effort) ---
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

    channelRef.current = realtimeChannel;

    // --- 2. Polling fallback (visibility-aware) ---
    pollRef.current = setInterval(() => {
      if (!document.hidden) {
        router.refresh();
      }
    }, POLL_INTERVAL);

    // Cleanup on unmount or when dependencies change
    return () => {
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
