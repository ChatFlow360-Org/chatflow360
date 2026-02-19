"use client";

import { AppProgressProvider, Progress } from "@bprogress/next";

export function NavigationProgress({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProgressProvider
      height="3px"
      color="#2f92ad"
      options={{ showSpinner: false }}
      shallowRouting
    >
      {children}
      <Progress />
    </AppProgressProvider>
  );
}
