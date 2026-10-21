"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AppShell } from "./AppShell";

/**
 * Renders the app chrome everywhere except the login screen, which has its
 * own standalone layout.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
