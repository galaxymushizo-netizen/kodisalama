"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/AppShell";
import {
  IconBuilding,
  IconChevronRight,
  IconMoney,
  IconPlus,
  IconUser,
  IconUsers,
  IconWallet,
  IconChat,
  IconDoc,
} from "@/components/Icons";
import { formatTZS, formatDate, paymentMethodLabel } from "@/lib/utils";

type DebtRow = {
  tenantId: number;
  fullName: string;
  phone: string;
  roomName: string | null;
  balance: number;
  status: string;
};

type RecentPayment = {
  id: number;
  amount: number;
  paymentDate: string;
  method: string;
  tenantName: string;
  roomName: string | null;
};

type DashboardData = {
  totalRooms: number;
  occupied: number;
  empty: number;
  occupancyRate: number;
  activeTenants: number;
  monthRevenue: number;
  allTimeRevenue: number;
  monthLabel: string;
  totalDebt: number;
  overdueCount: number;
  topDebts: DebtRow[];
  recentPayments: RecentPayment[];
  expectedMonthRent: number;
  collectionRate: number;
  paymentCount: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Dashibodi Kuu"
        subtitle="Muhtasari wa vyumba, wapangaji, mapato na madeni ya mwezi huu."
        actions={
          <>
            <Link
              href="/malipo?new=1"
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-800"
            >
              <IconPlus size={16} /> Rekodi Malipo
            </Link>
            <Link
              href="/wapangaji?new=1"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <IconUser size={16} /> Mpangaji Mpya
            </Link>
            <Link
              href="/vyumba?new=1"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <IconBuilding size={16} /> Chumba Kipya
            </Link>
          </>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="!p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Vyumba
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums">
                {data?.totalRooms ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {data?.occupied ?? 0} kamili · {data?.empty ?? 0} wazi
              </p>
            </Card>
            <Card className="!p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Wapangaji
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-violet-700">
                {data?.activeTenants ?? 0}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">wanaoishi sasa</p>
            </Card>
            <Card className="!p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Mapato
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-emerald-700 sm:text-2xl">
                {formatTZS(data?.monthRevenue ?? 0).replace("TZS ", "")}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {data?.monthLabel ?? "mwezi huu"}
              </p>
            </Card>
            <Card className="!p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Madeni
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums text-red-600 sm:text-2xl">
                {formatTZS(data?.totalDebt ?? 0).replace("TZS ", "")}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {data?.overdueCount ?? 0} wenye deni
              </p>
            </Card>
          </div>

          {/* Rooms occupancy */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">Vyumba Vyote</p>
                <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {data?.totalRooms ?? 0}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <IconBuilding size={20} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>
                Vilivyochukuliwa:{" "}
                <strong className="tabular-nums text-slate-900">
                  {data?.occupied ?? 0}
                </strong>
              </span>
              <span>
                Vilivyo Wazi:{" "}
                <strong className="tabular-nums text-slate-900">
                  {data?.empty ?? 0}
                </strong>
              </span>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-500">Kiwango cha Upangaji</span>
                <span className="font-bold tabular-nums text-slate-800">
                  {data?.occupancyRate ?? 0}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                  style={{ width: `${data?.occupancyRate ?? 0}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Collection rate + tenants */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Wapangaji Waliopo
                  </p>
                  <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-slate-900">
                    {data?.activeTenants ?? 0}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <IconUsers size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Wanaishi kwenye vyumba kwa sasa.
              </p>
              <Link
                href="/wapangaji"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
              >
                Tazama Orodha Yote <IconChevronRight size={14} />
              </Link>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Ukusanyaji wa Kodi
                  </p>
                  <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-emerald-700">
                    {data?.collectionRate ?? 0}%
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <IconMoney size={20} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Ya kodi inayotarajiwa mwezi huu (
                {formatTZS(data?.expectedMonthRent ?? 0)})
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${data?.collectionRate ?? 0}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Month revenue */}
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Mapato ya {data?.monthLabel ?? "Mwezi Huu"}
                </p>
                <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-emerald-700 sm:text-4xl tabular-nums">
                  {formatTZS(data?.monthRevenue ?? 0)}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <IconMoney size={20} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>
                Jumla ya milele:{" "}
                <strong className="text-slate-800 tabular-nums">
                  {formatTZS(data?.allTimeRevenue ?? 0)}
                </strong>
              </span>
              <span>·</span>
              <span>
                Malipo:{" "}
                <strong className="text-slate-800 tabular-nums">
                  {data?.paymentCount ?? 0}
                </strong>
              </span>
            </div>
            <Link
              href="/malipo"
              className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              <IconWallet size={14} /> Historia ya Malipo <IconChevronRight size={14} />
            </Link>
          </Card>

          {/* Debts section */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Madeni Yanayodaiwa
                </h2>
                <p className="text-sm text-slate-500">
                  Jumla:{" "}
                  <strong className="text-red-600 tabular-nums">
                    {formatTZS(data?.totalDebt ?? 0)}
                  </strong>
                </p>
              </div>
              <Link
                href="/malipo"
                className="text-sm font-bold text-emerald-700 hover:underline"
              >
                Rekodi malipo
              </Link>
            </div>
            {(data?.topDebts?.length ?? 0) === 0 ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Hakuna madeni yanayodaiwa — wapangaji wote wamelipa!
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data!.topDebts.map((d) => (
                  <li
                    key={d.tenantId}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {d.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {d.roomName ?? "Hakuna chumba"} · {d.phone}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display font-bold tabular-nums text-red-600">
                        {formatTZS(d.balance)}
                      </p>
                      <Link
                        href={`/sms`}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline"
                      >
                        Tuma kikumbusho
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recent payments */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                Malipo ya Hivi Karibuni
              </h2>
              <Link
                href="/malipo"
                className="text-sm font-bold text-emerald-700 hover:underline"
              >
                Yote
              </Link>
            </div>
            {(data?.recentPayments?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                Bado hakuna malipo yaliyorekodiwa.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data!.recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {p.tenantName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(p.paymentDate)} · {paymentMethodLabel(p.method)}
                        {p.roomName ? ` · ${p.roomName}` : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-display font-bold tabular-nums text-emerald-700">
                      {formatTZS(p.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                href: "/vyumba",
                label: "Vyumba",
                icon: IconBuilding,
                color: "bg-blue-50 text-blue-700",
              },
              {
                href: "/wapangaji",
                label: "Wapangaji",
                icon: IconUsers,
                color: "bg-violet-50 text-violet-700",
              },
              {
                href: "/sms",
                label: "SMS / Risiti",
                icon: IconChat,
                color: "bg-teal-50 text-teal-700",
              },
              {
                href: "/mikataba",
                label: "Mikataba",
                icon: IconDoc,
                color: "bg-amber-50 text-amber-700",
              },
            ].map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex flex-col items-center gap-2 rounded-3xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ${q.color}`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-bold text-slate-800">{q.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
