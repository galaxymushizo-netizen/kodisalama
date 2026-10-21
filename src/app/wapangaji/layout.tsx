import { Suspense, type ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-white" />
          <div className="h-40 animate-pulse rounded-3xl bg-white" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
