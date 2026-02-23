"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseTypingIndicatorOptions {
  /** HMAC-derived channel name from getTypingChannel() */
  channelName: string | null;
  /** Role that this side broadcasts as */
  role: "agent" | "visitor";
  /** Whether the subscription is enabled */
  enabled?: boolean;
}

interface UseTypingIndicatorReturn {
  /** Whether the remote party is typing */
  isRemoteTyping: boolean;
  /** Call this to broadcast that you started typing (throttled) */
  sendTyping: () => void;
  /** Call this to broadcast that you stopped typing */
  sendStopTyping: () => void;
}

const THROTTLE_MS = 2000;
const TYPING_TIMEOUT_MS = 3000;

/**
 * Bidirectional typing indicator via Supabase Realtime Broadcast.
 * - Broadcasts typing events for the current role (agent/visitor)
 * - Listens for typing events from the opposite role
 * - Throttles outgoing events to max 1 per 2s
 * - Auto-clears remote typing after 3s timeout
 */
export function useTypingIndicator(
  options: UseTypingIndicatorOptions
): UseTypingIndicatorReturn {
  const { channelName, role, enabled = true } = options;
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !channelName) return;

    const supabase = createClient();
    const remoteRole = role === "agent" ? "visitor" : "agent";

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as { role?: string; isTyping?: boolean };
        if (data.role !== remoteRole) return;

        if (data.isTyping) {
          setIsRemoteTyping(true);
          // Auto-clear after timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsRemoteTyping(false);
          }, TYPING_TIMEOUT_MS);
        } else {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setIsRemoteTyping(false);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsRemoteTyping(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [enabled, channelName, role]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) return;
    lastSentRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { role, isTyping: true },
    });
  }, [role]);

  const sendStopTyping = useCallback(() => {
    lastSentRef.current = 0; // Reset throttle so next typing sends immediately
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { role, isTyping: false },
    });
  }, [role]);

  return { isRemoteTyping, sendTyping, sendStopTyping };
}
