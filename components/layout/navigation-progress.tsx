"use client";

import { AppProgressBar } from "next-nprogress-bar";

export function NavigationProgress() {
  return (
    <AppProgressBar
      height="3px"
      color="#2f92ad"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
