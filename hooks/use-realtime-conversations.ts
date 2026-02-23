"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeConversationsOptions {
  /** Optional channel ID to scope the subscription */
  channelId?: string;
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Subscribes to Supabase Realtime postgres_changes on the "conversations" table.
 * When INSERT or UPDATE events fire, triggers router.refresh() to re-fetch server data.
 * Debounces rapid events to avoid multiple refreshes within 300ms.
 */
export function useRealtimeConversations(
  options: UseRealtimeConversationsOptions = {}
) {
  const { channelId, enabled = true } = options;
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Build the filter for the subscription
    // If channelId is provided, scope to that channel's conversations
    const filter = channelId
      ? `channel_id=eq.${channelId}`
      : undefined;

    // Create a unique channel name to avoid collisions
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
      .subscribe((status, err) => {
        console.log("[Realtime:conversations]", status, err ?? "");
      });

    channelRef.current = realtimeChannel;

    // Cleanup on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, channelId, debouncedRefresh]);
}
