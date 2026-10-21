"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Card } from "@/components/AppShell";
import {
  IconDownload,
  IconUpload,
  IconUser,
} from "@/components/Icons";
import {
  Field,
  TextInput,
  PrimaryButton,
  SecondaryButton,
} from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { formatTZS, paymentMethodLabel } from "@/lib/utils";

type Landlord = {
  id?: number;
  fullName: string;
  phone: string;
  nida: string | null;
  location: string | null;
};

export default function MipangilioPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    nida: "",
    location: "",
  });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [storageInfo, setStorageInfo] = useState({ used: "—", pct: 0 });
  const [report, setReport] = useState<{
    period: string;
    rooms: number;
    activeTenants: number;
    potentialMonthlyRent: number;
    collectedThisMonth: number;
    totalDebt: number;
    monthly: { month: string; total: number }[];
    methods: { method: string; total: number }[];
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/landlord");
    if (res.ok) {
      const data: Landlord | null = await res.json();
      if (data) {
        setForm({
          fullName: data.fullName || "",
          phone: data.phone || "",
          nida: data.nida || "",
          location: data.location || "",
        });
      }
    }
    // Approximate local usage display (server-side data; show placeholder quota)
    try {
      const backup = await fetch("/api/backup");
      if (backup.ok) {
        const json = await backup.json();
        const size = new Blob([JSON.stringify(json)]).size;
        const kb = size / 1024;
        const maxMb = 5;
        const pct = Math.min(100, (kb / 1024 / maxMb) * 100);
        setStorageInfo({
          used: kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`,
          pct: Math.round(pct * 10) / 10,
        });
      }
    } catch {
      /* ignore */
    }
    try {
      const r = await fetch("/api/reports");
      if (r.ok) setReport(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      toast("Jina kamili linahitajika", "error");
      return;
    }
    if (!form.phone.trim() || form.phone.trim().length < 9) {
      toast("Namba ya simu sahihi inahitajika", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/landlord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          nida: form.nida.trim() || null,
          location: form.location.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      toast("Wasifu umehifadhiwa");
      load();
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) {
        toast("Imeshindwa kupakua nakala", "error");
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kodisalama-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Nakala imepakuliwa");
    } finally {
      setExporting(false);
    }
  }

  async function importData(file: File) {
    setImporting(true);
    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        toast("Faili si JSON sahihi", "error");
        return;
      }
      if (!confirm("Hii itafuta data zilizopo na kurejesha kutoka faili. Endelea?")) {
        return;
      }
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", data: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Imeshindwa kurejesha", "error");
        return;
      }
      toast(data.message || "Data zimerudishwa");
      load();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearAll() {
    if (
      !confirm(
        "FUTA DATA ZOTE? Hatua hii haiwezi kurudishwa. Hakikisha umepakua nakala kwanza."
      )
    ) {
      return;
    }
    if (!confirm("Una uhakika kabisa? Andika akilini: data zote zitafutwa.")) {
      return;
    }
    const res = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Imeshindwa", "error");
      return;
    }
    toast("Data zote zimefutwa");
    setForm({ fullName: "", phone: "", nida: "", location: "" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Mipangilio & Uhifadhi wa Data"
        subtitle="Taarifa za mwenye nyumba, pakua nakala ya data (JSON backup), na urejesheji."
      />

      {/* Landlord profile */}
      <Card className="mb-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <IconUser size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Wasifu wa Mwenye Nyumba
              <span className="ml-1 text-sm font-normal text-slate-500">
                (Landlord Profile)
              </span>
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Taarifa hizi zitatokea kiotomatiki kwenye mikataba na risiti za SMS.
            </p>
          </div>
        </div>

        <Field label="Jina Kamili la Mwenye Nyumba" required>
          <TextInput
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Mzee Juma Ramadhani"
          />
        </Field>
        <Field label="Namba ya Simu (Kwa ajili ya Malipo & SMS)" required>
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0712345678"
            inputMode="tel"
          />
        </Field>
        <Field label="Namba ya Kitambulisho cha NIDA">
          <TextInput
            value={form.nida}
            onChange={(e) => setForm({ ...form, nida: e.target.value })}
            placeholder="19850101-12345-00001-22"
          />
        </Field>
        <Field label="Mahali Nyumba Zilipo (Mtaa / Eneo / Mji)">
          <TextInput
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Sinza Palestina, Kinondoni, Dar es Salaam"
          />
        </Field>

        <div className="flex justify-end">
          <PrimaryButton onClick={saveProfile} loading={saving}>
            Hifadhi Wasifu
          </PrimaryButton>
        </div>
      </Card>

      {/* Monthly report snapshot */}
      {report && (
        <Card className="mb-5">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Ripoti ya Haraka
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Muhtasari wa biashara yako ya kodi · {report.period}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Vyumba
              </div>
              <div className="font-display text-xl font-extrabold tabular-nums">
                {report.rooms}
              </div>
            </div>
            <div className="rounded-2xl bg-violet-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
                Wapangaji
              </div>
              <div className="font-display text-xl font-extrabold tabular-nums text-violet-800">
                {report.activeTenants}
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">
                Zilizokusanywa
              </div>
              <div className="font-display text-lg font-extrabold tabular-nums text-emerald-800">
                {formatTZS(report.collectedThisMonth)}
              </div>
            </div>
            <div className="rounded-2xl bg-red-50 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-red-400">
                Madeni
              </div>
              <div className="font-display text-lg font-extrabold tabular-nums text-red-700">
                {formatTZS(report.totalDebt)}
              </div>
            </div>
          </div>
          {report.methods.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Njia za Malipo
              </p>
              <div className="flex flex-wrap gap-2">
                {report.methods.map((m) => (
                  <span
                    key={m.method}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {paymentMethodLabel(m.method)}: {formatTZS(m.total)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {report.monthly.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                Mapato kwa Miezi
              </p>
              <div className="space-y-1.5">
                {report.monthly.slice(0, 6).map((m) => {
                  const max = Math.max(...report.monthly.map((x) => x.total), 1);
                  const pct = Math.round((m.total / max) * 100);
                  return (
                    <div key={m.month} className="flex items-center gap-3 text-sm">
                      <span className="w-16 shrink-0 font-medium tabular-nums text-slate-600">
                        {m.month}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right font-bold tabular-nums text-slate-800">
                        {formatTZS(m.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Backup & Restore */}
      <Card>
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <IconDownload size={22} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Hifadhi Nakala ya Data (Backup & Restore)
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Linda rekodi zako dhidi ya kupotea kwa kupakua faili la nakala (JSON)
              au kulirejesha kwenye simu/kompyuta nyingine.
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Hali ya Hifadhi ya Kivinjari
              <span className="text-slate-400"> (LocalStorage Quota)</span>:
            </span>
            <span className="font-medium text-slate-800">
              {storageInfo.used} / 5 MB ({storageInfo.pct}%)
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${Math.max(2, storageInfo.pct)}%` }}
            />
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-100 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Pakua Nakala (Export JSON)
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Pakua faili lenye vyumba vyote, wapangaji wote, na historia ya malipo
            kwenye simu yako.
          </p>
          <PrimaryButton
            className="mt-3 w-full sm:w-auto"
            onClick={exportData}
            loading={exporting}
          >
            <IconDownload size={16} /> Pakua Nakala ya Data Sasa
          </PrimaryButton>
        </div>

        <div className="mb-5 rounded-2xl border border-slate-100 p-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Rejesha Data (Import JSON)
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Chagua faili la nakala ulilopakua awali ili kurejesha taarifa zako zote
            mara moja.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importData(f);
            }}
          />
          <SecondaryButton
            className="mt-3 w-full sm:w-auto"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <IconUpload size={16} />{" "}
            {importing ? "Inarejesha..." : "Chagua Faili la Nakala..."}
          </SecondaryButton>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={clearAll}
            className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            Futa Data Zote (Anza Upya)
          </button>
        </div>
      </Card>
    </div>
  );
}
