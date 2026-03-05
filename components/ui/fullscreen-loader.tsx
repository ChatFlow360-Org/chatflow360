"use client";

import Image from "next/image";

/**
 * Fullscreen loading overlay with ChatFlow360 logo animation.
 * Reusable — render conditionally in any transition/loading state.
 *
 * Usage:
 *   {isPending && <FullscreenLoader />}
 */
export function FullscreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative flex items-center justify-center">
        {/* Spinning ring */}
        <div
          className="absolute h-20 w-20 rounded-full border-[2.5px] border-muted-foreground/10 border-t-cta"
          style={{ animation: "cf360-spin 1.2s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite" }}
        />
        {/* Logo with gentle breathing */}
        <Image
          src="/logo.png"
          alt=""
          width={44}
          height={44}
          className="dark:brightness-0 dark:invert"
          style={{ animation: "cf360-breathe 2s ease-in-out infinite" }}
          priority
        />
      </div>
    </div>
  );
}
