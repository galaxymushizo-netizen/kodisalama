"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, Card, EmptyState, SearchInput } from "@/components/AppShell";
import {
  IconEmptyWallet,
  IconPlus,
  IconTrash,
  IconWallet,
} from "@/components/Icons";
import {
  Modal,
  Field,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  SecondaryButton,
} from "@/components/Modal";
import { useToast } from "@/components/Toast";
import {
  formatTZS,
  formatDate,
  PAYMENT_METHODS,
  paymentMethodLabel,
  currentPeriodMonth,
} from "@/lib/utils";

type Tenant = {
  id: number;
  fullName: string;
  phone: string;
  monthlyRent: number;
  room: { id: number; name: string } | null;
  status: string;
};

type PaymentRow = {
  id: number;
  tenantId: number;
  amount: number;
  paymentDate: string;
  method: string;
  periodMonth: string | null;
  reference: string | null;
  notes: string | null;
  tenant: { id: number; fullName: string; phone: string } | null;
  room: { id: number; name: string } | null;
};

export default function MalipoPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tenantId: "",
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "cash",
    periodMonth: currentPeriodMonth(),
    reference: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tenantFilter) params.set("tenantId", tenantFilter);
      if (methodFilter !== "all") params.set("method", methodFilter);
      const [pRes, tRes] = await Promise.all([
        fetch(`/api/payments?${params}`),
        fetch("/api/tenants?status=active"),
      ]);
      if (pRes.ok) {
        const data = await pRes.json();
        setPayments(data.payments ?? []);
        setTotal(data.total ?? 0);
      }
      if (tRes.ok) setTenants(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, [q, tenantFilter, methodFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openCreate();
      router.replace("/malipo");
    }
  }, [searchParams, router]);

  function openCreate() {
    setForm({
      tenantId: "",
      amount: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "cash",
      periodMonth: currentPeriodMonth(),
      reference: "",
      notes: "",
    });
    setModalOpen(true);
  }

  function onTenantChange(id: string) {
    const t = tenants.find((x) => String(x.id) === id);
    setForm((f) => ({
      ...f,
      tenantId: id,
      amount: t ? String(t.monthlyRent) : f.amount,
    }));
  }

  async function save() {
    if (!form.tenantId) {
      toast("Chagua mpangaji", "error");
      return;
    }
    const amount = parseInt(form.amount || "0", 10);
    if (!amount || amount <= 0) {
      toast("Kiasi cha malipo si sahihi", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: form.tenantId,
          amount,
          paymentDate: form.paymentDate,
          method: form.method,
          periodMonth: form.periodMonth || null,
          reference: form.reference.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      toast("Malipo yamerekodiwa");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: PaymentRow) {
    if (!confirm("Futa rekodi hii ya malipo?")) return;
    const res = await fetch(`/api/payments?id=${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast(data.error || "Imeshindwa", "error");
      return;
    }
    toast("Malipo yamefutwa");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Ufuatiliaji wa Malipo na Madeni"
        subtitle="Rekodi malipo ya kodi, hesabu salio la madeni, na toa risiti."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 sm:w-auto"
          >
            <IconPlus size={16} /> Rekodi Malipo Mpya
          </button>
        }
      />

      <Card className="mb-4 space-y-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tafuta mpangaji, maelezo..."
        />
        <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
          <option value="">Wapangaji Wote</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
              {t.room ? ` — ${t.room.name}` : ""}
            </option>
          ))}
        </Select>
        <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
          <option value="all">Njia Zote za Malipo</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 px-4 py-3.5 text-right ring-1 ring-emerald-100">
          <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700/80">
            Jumla Iliyochujwa
          </div>
          <div className="font-display text-2xl font-extrabold tabular-nums text-emerald-800">
            {formatTZS(total)}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="h-48 animate-pulse rounded-3xl bg-white" />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<IconEmptyWallet />}
          title="Hakuna malipo yaliyopatikana"
          description="Rekodi malipo ya kwanza ili kuona historia na kutoa risiti."
          action={
            <PrimaryButton onClick={openCreate}>
              <IconPlus size={16} /> Rekodi Malipo Sasa
            </PrimaryButton>
          }
        />
      ) : (
        <>
          {/* Desktop table header */}
          <div className="mb-2 hidden grid-cols-12 gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
            <div className="col-span-2">Tarehe</div>
            <div className="col-span-3">Mpangaji & Chumba</div>
            <div className="col-span-2">Kiasi</div>
            <div className="col-span-3">Njia & Kumbukumbu</div>
            <div className="col-span-2">Vitendo</div>
          </div>
          <div className="space-y-2">
            {payments.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400 sm:hidden">Tarehe</div>
                    <div className="text-sm font-medium text-slate-800">
                      {formatDate(p.paymentDate)}
                    </div>
                    {p.periodMonth && (
                      <div className="text-xs text-slate-500">{p.periodMonth}</div>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <div className="text-xs text-slate-400 sm:hidden">Mpangaji</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {p.tenant?.fullName ?? "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {p.room?.name ?? "—"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400 sm:hidden">Kiasi</div>
                    <div className="text-base font-bold text-emerald-700">
                      {formatTZS(p.amount)}
                    </div>
                  </div>
                  <div className="sm:col-span-3">
                    <div className="text-xs text-slate-400 sm:hidden">Njia</div>
                    <div className="text-sm text-slate-700">
                      {paymentMethodLabel(p.method)}
                    </div>
                    {p.reference && (
                      <div className="text-xs text-slate-500">Ref: {p.reference}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                      aria-label="Futa"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Rekodi Malipo Mpya"
      >
        <Field label="Mpangaji" required>
          <Select
            value={form.tenantId}
            onChange={(e) => onTenantChange(e.target.value)}
          >
            <option value="">-- Chagua Mpangaji --</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
                {t.room ? ` (${t.room.name})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kiasi (TZS)" required>
          <TextInput
            type="number"
            min={1}
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="150000"
          />
        </Field>
        <Field label="Tarehe ya Malipo" required>
          <TextInput
            type="date"
            value={form.paymentDate}
            onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
          />
        </Field>
        <Field label="Mwezi wa Kodi (YYYY-MM)">
          <TextInput
            value={form.periodMonth}
            onChange={(e) => setForm({ ...form, periodMonth: e.target.value })}
            placeholder="2026-10"
          />
        </Field>
        <Field label="Njia ya Malipo" required>
          <Select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Namba ya Kumbukumbu / Reference">
          <TextInput
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder="mf. namba ya M-Pesa"
          />
        </Field>
        <Field label="Maelezo">
          <TextArea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <div className="mt-2 flex gap-2">
          <SecondaryButton className="flex-1" onClick={() => setModalOpen(false)}>
            Ghairi
          </SecondaryButton>
          <PrimaryButton className="flex-1" onClick={save} loading={saving}>
            <IconWallet size={16} /> Rekodi
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
