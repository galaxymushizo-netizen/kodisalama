"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader, Card, EmptyState, FilterChip, SearchInput } from "@/components/AppShell";
import {
  IconBuilding,
  IconEmptyBuilding,
  IconPlus,
  IconTrash,
  IconEdit,
} from "@/components/Icons";
import {
  Modal,
  Field,
  TextInput,
  TextArea,
  PrimaryButton,
  SecondaryButton,
} from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { formatTZS } from "@/lib/utils";

type Room = {
  id: number;
  name: string;
  monthlyRent: number;
  description: string | null;
  status: string;
  effectiveStatus: string;
  tenant: { id: number; fullName: string; phone: string } | null;
};

export default function VyumbaPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "empty" | "occupied">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", monthlyRent: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/rooms?${params}`);
      if (res.ok) setRooms(await res.json());
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
      router.replace("/vyumba");
    }
  }, [searchParams, router]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", monthlyRent: "", description: "" });
    setModalOpen(true);
  }

  function openEdit(room: Room) {
    setEditing(room);
    setForm({
      name: room.name,
      monthlyRent: String(room.monthlyRent),
      description: room.description ?? "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) {
      toast("Jina la chumba linahitajika", "error");
      return;
    }
    const rent = parseInt(form.monthlyRent || "0", 10);
    if (isNaN(rent) || rent < 0) {
      toast("Kodi ya mwezi si sahihi", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/rooms", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          name: form.name.trim(),
          monthlyRent: rent,
          description: form.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      toast(editing ? "Chumba kimesasishwa" : "Chumba kimesajiliwa");
      setModalOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(room: Room) {
    if (!confirm(`Futa chumba "${room.name}"?`)) return;
    const res = await fetch(`/api/rooms?id=${room.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Imeshindwa kufuta", "error");
      return;
    }
    toast("Chumba kimefutwa");
    load();
  }

  const counts = {
    all: rooms.length,
    empty: rooms.filter((r) => r.effectiveStatus === "empty").length,
    occupied: rooms.filter((r) => r.effectiveStatus === "occupied").length,
  };

  // For filter chips we need unfiltered counts — fetch separately simplified:
  // Use current list when no search; otherwise show list length
  const displayRooms =
    filter === "all"
      ? rooms
      : rooms.filter((r) =>
          filter === "empty" ? r.effectiveStatus === "empty" : r.effectiveStatus === "occupied"
        );

  return (
    <div>
      <PageHeader
        title="Usimamizi wa Vyumba"
        subtitle="Orodha ya vyumba, kodi zake za mwezi na hali ya upatikanaji."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 sm:w-auto"
          >
            <IconPlus size={16} /> Sajili Chumba Kipya
          </button>
        }
      />

      <Card className="mb-4">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tafuta chumba au mpangaji..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Vyote ({counts.all})
          </FilterChip>
          <FilterChip active={filter === "empty"} onClick={() => setFilter("empty")}>
            Vilivyo Wazi
          </FilterChip>
          <FilterChip active={filter === "occupied"} onClick={() => setFilter("occupied")}>
            Vilivyochukuliwa
          </FilterChip>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-white" />
          ))}
        </div>
      ) : displayRooms.length === 0 ? (
        <EmptyState
          icon={<IconEmptyBuilding />}
          title="Hakuna vyumba vilivyopatikana"
          description="Bonyeza kitufe hapa chini ili kusajili chumba chako cha kwanza."
          action={
            <PrimaryButton onClick={openCreate}>
              <IconPlus size={16} /> Sajili Chumba Sasa
            </PrimaryButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {displayRooms.map((room) => (
            <Card key={room.id} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <IconBuilding size={22} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {room.name}
                    </h3>
                    <span
                      className={
                        room.effectiveStatus === "occupied"
                          ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                      }
                    >
                      {room.effectiveStatus === "occupied" ? "Imechukuliwa" : "Wazi"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-emerald-700">
                    {formatTZS(room.monthlyRent)}
                    <span className="font-normal text-slate-500"> / mwezi</span>
                  </p>
                  {room.tenant ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Mpangaji: <strong>{room.tenant.fullName}</strong> · {room.tenant.phone}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">Hakuna mpangaji</p>
                  )}
                  {room.description && (
                    <p className="mt-1 text-xs text-slate-500">{room.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(room)}
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                    aria-label="Hariri"
                  >
                    <IconEdit size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(room)}
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
        title={editing ? "Hariri Chumba" : "Sajili Chumba Kipya"}
      >
        <Field label="Jina / Namba ya Chumba" required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="mf. Chumba A1, Ghorofa 2..."
            autoFocus
          />
        </Field>
        <Field label="Kodi ya Mwezi (TZS)" required>
          <TextInput
            type="number"
            min={0}
            value={form.monthlyRent}
            onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
            placeholder="mf. 150000"
          />
        </Field>
        <Field label="Maelezo (si lazima)">
          <TextArea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Vipengele, eneo, n.k."
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
