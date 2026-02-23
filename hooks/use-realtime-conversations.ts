"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, Subscription } from "@supabase/supabase-js";

const POLL_INTERVAL = 30_000; // 30s safety-net
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const authSubRef = useRef<Subscription | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // MED-03: Sanitize channelId to prevent filter injection
  const safeChannelId = channelId && UUID_RE.test(channelId) ? channelId : undefined;

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

    // HIGH-01: Listen for token refresh + sign out
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "TOKEN_REFRESHED" && session?.access_token) {
          supabase.realtime.setAuth(session.access_token);
        }
        if (event === "SIGNED_OUT" && channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
      }
    );
    authSubRef.current = authSub;

    // --- 1. Supabase Realtime with explicit auth for RLS ---
    (async () => {
      // HIGH-02: Validate session server-side, then get fresh token
      const { error } = await supabase.auth.getUser();
      if (cancelled) return;
      if (error) return; // Session invalid — polling still works

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.access_token) return;

      supabase.realtime.setAuth(session.access_token);

      const filter = safeChannelId
        ? `channel_id=eq.${safeChannelId}`
        : undefined;

      const realtimeChannelName = safeChannelId
        ? `conversations-realtime:${safeChannelId}`
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
      if (authSubRef.current) {
        authSubRef.current.unsubscribe();
        authSubRef.current = null;
      }
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
  }, [enabled, safeChannelId, debouncedRefresh, router]);
}
