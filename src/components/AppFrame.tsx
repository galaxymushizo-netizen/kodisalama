"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { AppShell } from "./AppShell";

/**
 * Renders the app chrome everywhere except the auth screens (login/register),
 * which have their own standalone layouts.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }
  return <AppShell>{children}</AppShell>;
}
