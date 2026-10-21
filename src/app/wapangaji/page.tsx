"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, Card, EmptyState, FilterChip, SearchInput } from "@/components/AppShell";
import {
  IconEmptyUsers,
  IconPlus,
  IconTrash,
  IconEdit,
  IconUser,
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
import { formatTZS, formatDate } from "@/lib/utils";

type Room = {
  id: number;
  name: string;
  monthlyRent: number;
  effectiveStatus: string;
};

type Tenant = {
  id: number;
  fullName: string;
  phone: string;
  nida: string | null;
  roomId: number | null;
  monthlyRent: number;
  deposit: number | null;
  moveInDate: string | null;
  status: string;
  notes: string | null;
  room: { id: number; name: string; monthlyRent: number } | null;
};

type DebtInfo = {
  tenantId: number;
  balance: number;
  status: string;
  paidTotal: number;
  expectedTotal: number;
};

export default function WapangajiPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [debts, setDebts] = useState<Map<number, DebtInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"active" | "moved_out" | "all">("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    nida: "",
    roomId: "",
    monthlyRent: "",
    deposit: "",
    moveInDate: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filter !== "all") params.set("status", filter);
      const [tRes, rRes, dRes] = await Promise.all([
        fetch(`/api/tenants?${params}`),
        fetch("/api/rooms"),
        fetch("/api/debts"),
      ]);
      if (tRes.ok) setTenants(await tRes.json());
      if (rRes.ok) setRooms(await rRes.json());
      if (dRes.ok) {
        const dData = await dRes.json();
        const map = new Map<number, DebtInfo>();
        for (const d of dData.debts ?? []) {
          map.set(d.tenantId, d);
        }
        setDebts(map);
      }
    } finally {
      setLoading(false);
    }
  }, [q, filter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openCreate();
      router.replace("/wapangaji");
    }
  }, [searchParams, router]);

  function openCreate() {
    setEditing(null);
    setForm({
      fullName: "",
      phone: "",
      nida: "",
      roomId: "",
      monthlyRent: "",
      deposit: "",
      moveInDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(t: Tenant) {
    setEditing(t);
    setForm({
      fullName: t.fullName,
      phone: t.phone,
      nida: t.nida ?? "",
      roomId: t.roomId ? String(t.roomId) : "",
      monthlyRent: String(t.monthlyRent),
      deposit: String(t.deposit ?? 0),
      moveInDate: t.moveInDate ? String(t.moveInDate).slice(0, 10) : "",
      notes: t.notes ?? "",
    });
    setModalOpen(true);
  }

  function onRoomChange(roomId: string) {
    const room = rooms.find((r) => String(r.id) === roomId);
    setForm((f) => ({
      ...f,
      roomId,
      monthlyRent: room ? String(room.monthlyRent) : f.monthlyRent,
    }));
  }

  async function save() {
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
      const payload = {
        id: editing?.id,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        nida: form.nida.trim() || null,
        roomId: form.roomId || null,
        monthlyRent: parseInt(form.monthlyRent || "0", 10),
        deposit: parseInt(form.deposit || "0", 10),
        moveInDate: form.moveInDate || null,
        notes: form.notes.trim() || null,
      };
      const res = await fetch("/api/tenants", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      toast(editing ? "Mpangaji amesasishwa" : "Mpangaji amesajiliwa");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function moveOut(t: Tenant) {
    if (!confirm(`Weka "${t.fullName}" kama amehama?`)) return;
    const res = await fetch("/api/tenants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, status: "moved_out" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Imeshindwa", "error");
      return;
    }
    toast("Mpangaji amewekwa kama amehama");
    load();
  }

  async function remove(t: Tenant) {
    if (!confirm(`Futa kabisa "${t.fullName}"?`)) return;
    const res = await fetch(`/api/tenants?id=${t.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Imeshindwa kufuta", "error");
      return;
    }
    toast("Mpangaji amefutwa");
    load();
  }

  const availableRooms = rooms.filter(
    (r) =>
      r.effectiveStatus === "empty" ||
      (editing && editing.roomId === r.id)
  );

  const activeCount = tenants.filter((t) => t.status === "active").length;
  const movedCount = tenants.filter((t) => t.status === "moved_out").length;

  return (
    <div>
      <PageHeader
        title="Usimamizi wa Wapangaji"
        subtitle="Kusajili wapangaji, picha zao, vyumba vyao na hali zao za madeni."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 sm:w-auto"
          >
            <IconUser size={16} /> Sajili Mpangaji Mpya
          </button>
        }
      />

      <Card className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tafuta kwa jina, simu, au NIDA..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip active={filter === "active"} onClick={() => setFilter("active")}>
            Wanaokaa ({filter === "active" ? tenants.length : activeCount})
          </FilterChip>
          <FilterChip
            active={filter === "moved_out"}
            onClick={() => setFilter("moved_out")}
          >
            Waliohama ({filter === "moved_out" ? tenants.length : movedCount})
          </FilterChip>
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Wote
          </FilterChip>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={<IconEmptyUsers />}
          title="Hakuna wapangaji kwa sasa"
          description="Sajili mpangaji mpya na umpangie chumba kilicho wazi."
          action={
            <PrimaryButton onClick={openCreate}>
              <IconPlus size={16} /> Sajili Mpangaji
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <Card key={t.id} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <IconUser size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {t.fullName}
                    </h3>
                    <span
                      className={
                        t.status === "active"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                      }
                    >
                      {t.status === "active" ? "Anaishi" : "Amehama"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{t.phone}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t.room ? (
                      <>
                        Chumba: <strong>{t.room.name}</strong> · {formatTZS(t.monthlyRent)}
                        /mwezi
                      </>
                    ) : (
                      <span className="text-slate-400">Hakuna chumba</span>
                    )}
                  </p>
                  {t.moveInDate && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Aliingia: {formatDate(t.moveInDate)}
                    </p>
                  )}
                  {t.nida && (
                    <p className="mt-0.5 text-xs text-slate-500">NIDA: {t.nida}</p>
                  )}
                  {t.status === "active" && debts.get(t.id) && (
                    <div className="mt-2">
                      {debts.get(t.id)!.balance > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">
                          Deni: {formatTZS(debts.get(t.id)!.balance)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          Amelipa ✓
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Hariri"
                  >
                    <IconEdit size={18} />
                  </button>
                  {t.status === "active" && (
                    <button
                      type="button"
                      onClick={() => moveOut(t)}
                      className="rounded-xl px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Hama
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(t)}
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
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Hariri Mpangaji" : "Sajili Mpangaji Mpya"}
      >
        <Field label="Jina Kamili" required>
          <TextInput
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="mf. Asha Juma Ally"
            autoFocus
          />
        </Field>
        <Field label="Namba ya Simu" required>
          <TextInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="mf. 0712345678"
            inputMode="tel"
          />
        </Field>
        <Field label="Namba ya NIDA">
          <TextInput
            value={form.nida}
            onChange={(e) => setForm({ ...form, nida: e.target.value })}
            placeholder="mf. 19850101-12345-00001-22"
          />
        </Field>
        <Field label="Chumba">
          <Select value={form.roomId} onChange={(e) => onRoomChange(e.target.value)}>
            <option value="">-- Chagua chumba --</option>
            {availableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({formatTZS(r.monthlyRent)})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kodi ya Mwezi (TZS)" required>
          <TextInput
            type="number"
            min={0}
            value={form.monthlyRent}
            onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
            placeholder="150000"
          />
        </Field>
        <Field label="Dhamana / Deposit (TZS)">
          <TextInput
            type="number"
            min={0}
            value={form.deposit}
            onChange={(e) => setForm({ ...form, deposit: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Tarehe ya Kuingia">
          <TextInput
            type="date"
            value={form.moveInDate}
            onChange={(e) => setForm({ ...form, moveInDate: e.target.value })}
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
            {editing ? "Hifadhi" : "Sajili"}
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
