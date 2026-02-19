"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname } from "@/lib/i18n/navigation";

export function NavigationProgress({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath = useRef(pathname);

  const start = useCallback(() => {
    // Clear any pending completion
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setVisible(true);
    setWidth(15);

    // Gradually increase width, slowing as it approaches 90%
    intervalRef.current = setInterval(() => {
      setWidth((prev) => {
        if (prev >= 90) return prev;
        return prev + (90 - prev) * 0.08;
      });
    }, 150);
  }, []);

  const done = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    setWidth(100);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 300);
  }, []);

  // Detect navigation start via click on internal <a> tags
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href === "#" || anchor.target === "_blank") return;

      // Resolve to full URL for comparison
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      start();
    };

    // Use capture phase to fire before Next.js handlers
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start]);

  // Detect browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      start();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [start]);

  // Detect navigation complete via pathname change
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      done();
    }
  }, [pathname, done]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {visible && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            zIndex: 99999,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              height: "100%",
              background: "#2f92ad",
              width: `${width}%`,
              transition:
                width === 100
                  ? "width 0.2s ease-out"
                  : "width 0.4s ease",
              boxShadow: "0 0 10px rgba(47, 146, 173, 0.4)",
              borderRadius: "0 2px 2px 0",
            }}
          />
        </div>
      )}
      {children}
    </>
  );
}
