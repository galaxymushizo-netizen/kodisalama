"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  IconBuilding,
  IconChat,
  IconClose,
  IconDoc,
  IconHome,
  IconKey,
  IconMenu,
  IconPlus,
  IconSettings,
  IconUsers,
  IconWallet,
} from "./Icons";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashibodi", icon: IconHome },
  { href: "/vyumba", label: "Vyumba", icon: IconBuilding },
  { href: "/wapangaji", label: "Wapangaji", icon: IconUsers },
  { href: "/malipo", label: "Malipo", icon: IconWallet },
  { href: "/sms", label: "SMS", icon: IconChat },
  { href: "/mikataba", label: "Mikataba", icon: IconDoc },
  { href: "/mipangilio", label: "Mipangilio", icon: IconSettings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="ks-app-bg min-h-screen text-slate-900">
      {/* Top header */}
      <header className="no-print sticky top-0 z-40 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white shadow-lg shadow-emerald-950/20">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="KodiSalama — Nyumbani">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-inner shadow-emerald-900/20">
              <IconKey size={22} />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="truncate text-base font-bold leading-tight font-display tracking-tight">
                KodiSalama
              </div>
              <div className="truncate text-[11px] font-medium text-emerald-100/85">
                Usimamizi wa Wapangaji
              </div>
            </div>
            <div className="min-w-0 sm:hidden">
              <div className="truncate text-base font-bold leading-tight font-display">
                KodiSalama
              </div>
              <div className="truncate text-[10px] text-emerald-100/85">
                Usimamizi wa Wapangaji
              </div>
            </div>
          </Link>

          <div className="flex-1" />

          <Link
            href="/malipo?new=1"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-2 text-sm font-bold shadow-md shadow-emerald-950/30 transition hover:bg-emerald-400 active:scale-[0.98]"
          >
            <IconPlus size={16} />
            <span>Lipa</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="rounded-xl p-2 text-emerald-100/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Toka (Logout)"
            title="Toka"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 17l5-5-5-5M20 12H9m3 8H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="rounded-xl p-2 hover:bg-white/10 md:hidden"
            aria-label="Menyu"
            onClick={() => setMenuOpen(true)}
          >
            <IconMenu />
          </button>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden max-w-5xl gap-1 overflow-x-auto px-3 pb-2.5 md:flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold transition",
                  active
                    ? "bg-white/15 text-white shadow-sm ring-1 ring-white/10"
                    : "text-emerald-100/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile side menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="Funga menyu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(86vw,320px)] flex-col bg-white shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between border-b border-slate-100 bg-emerald-950 px-4 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <IconKey size={20} />
                </div>
                <div>
                  <div className="font-bold font-display">KodiSalama</div>
                  <div className="text-[11px] text-emerald-100/80">Menyu kuu</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-full p-2 hover:bg-white/10"
              >
                <IconClose />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition",
                      active
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl",
                        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                disabled={loggingOut}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
              >
                Toka (Logout)
              </button>
              <div className="mt-3 text-center text-[11px] text-slate-400">
                KodiSalama · Tanzania
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-12 animate-fade-up">
        {children}
      </main>

      {/* Bottom mobile nav */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-between px-0.5 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-2 text-[9.5px] font-semibold transition",
                  active ? "text-emerald-700" : "text-slate-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-xl transition",
                    active && "bg-emerald-50"
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[1.85rem]">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
          {subtitle}
        </p>
      )}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-100/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-14 text-center">
      <div className="mb-4 opacity-80">{icon}</div>
      <h3 className="font-display text-base font-bold text-slate-800">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function FilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.98]",
        active
          ? "bg-emerald-700 text-white shadow-sm shadow-emerald-700/20"
          : "bg-slate-100/90 text-slate-600 hover:bg-slate-200"
      )}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-10 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
      />
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "ok" | "warn" | "danger";
}) {
  const tones = {
    neutral: "bg-slate-50 text-slate-700",
    ok: "bg-emerald-50 text-emerald-800",
    warn: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-red-800",
  };
  return (
    <div className={cn("rounded-2xl px-3 py-2", tones[tone])}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
