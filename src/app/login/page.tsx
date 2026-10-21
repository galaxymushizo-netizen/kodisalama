"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconKey } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, remember }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Imeshindwa kuingia.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Hitilafu ya mtandao. Jaribu tena.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-950/40">
            <IconKey size={32} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            KodiSalama
          </h1>
          <p className="mt-1 text-sm text-emerald-100/80">
            Usimamizi wa Wapangaji · Tanzania
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl bg-white p-6 shadow-2xl shadow-emerald-950/30"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Neno la Siri
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
            />
            Nikumbuke kwenye kifaa hiki (siku 30)
          </label>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || password.length === 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-700/20 transition hover:bg-emerald-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : null}
            Ingia
          </button>

          <p className="mt-4 text-center text-xs leading-relaxed text-slate-400">
            Ufikiaji ni kwa mmiliki tu. Ikiwa umesahau neno la siri, wasiliana na msimamizi wa mfumo.
          </p>
        </form>

        <p className="mt-6 text-center text-[11px] text-emerald-100/60">
          KodiSalama · Ilindwa kwa nenosiri · 🇹🇿
        </p>
      </div>
    </div>
  );
}
