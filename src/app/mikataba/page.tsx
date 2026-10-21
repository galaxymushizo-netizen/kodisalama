"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PageHeader, Card } from "@/components/AppShell";
import { IconDoc, IconDownload, IconEdit, IconPrint } from "@/components/Icons";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
  SecondaryButton,
  Modal,
} from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { formatTZS, formatDate, cn } from "@/lib/utils";

type Tenant = {
  id: number;
  fullName: string;
  phone: string;
  nida: string | null;
  monthlyRent: number;
  deposit: number | null;
  moveInDate: string | null;
  room: { id: number; name: string; monthlyRent: number } | null;
};

type Landlord = {
  fullName: string;
  phone: string;
  nida: string | null;
  location: string | null;
};

export default function MikatabaPage() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [landlord, setLandlord] = useState<Landlord | null>(null);
  const [clauses, setClauses] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [form, setForm] = useState({
    landlordName: "",
    landlordPhone: "",
    landlordNida: "",
    location: "",
    deposit: "",
    durationMonths: "12",
    paymentInterval: "1",
    monthlyRent: "",
    tenantName: "",
    tenantPhone: "",
    tenantNida: "",
    roomName: "",
    startDate: new Date().toISOString().slice(0, 10),
  });
  const [showClausesModal, setShowClausesModal] = useState(false);
  const [editClauses, setEditClauses] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const load = useCallback(async () => {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/tenants?status=active"),
      fetch("/api/contracts"),
    ]);
    if (tRes.ok) setTenants(await tRes.json());
    if (cRes.ok) {
      const data = await cRes.json();
      setClauses(data.settings?.clauses || data.defaultClauses || "");
      setEditClauses(data.settings?.clauses || data.defaultClauses || "");
      if (data.landlord) {
        setLandlord(data.landlord);
        setForm((f) => ({
          ...f,
          landlordName: data.landlord.fullName || "",
          landlordPhone: data.landlord.phone || "",
          landlordNida: data.landlord.nida || "",
          location: data.landlord.location || "",
        }));
      }
      if (data.settings?.defaultDurationMonths) {
        setForm((f) => ({
          ...f,
          durationMonths: String(data.settings.defaultDurationMonths),
          paymentInterval: String(data.settings.defaultPaymentIntervalMonths ?? 1),
        }));
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function onTenantSelect(id: string) {
    setTenantId(id);
    const t = tenants.find((x) => String(x.id) === id);
    if (!t) return;
    setForm((f) => ({
      ...f,
      tenantName: t.fullName,
      tenantPhone: t.phone,
      tenantNida: t.nida || "",
      roomName: t.room?.name || "",
      monthlyRent: String(t.monthlyRent || t.room?.monthlyRent || 0),
      deposit: String(t.deposit ?? t.monthlyRent ?? 0),
      startDate: t.moveInDate
        ? String(t.moveInDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    }));
  }

  async function saveContractSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clauses: editClauses,
          defaultDurationMonths: parseInt(form.durationMonths || "12", 10),
          defaultPaymentIntervalMonths: parseInt(form.paymentInterval || "1", 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      setClauses(editClauses);
      toast("Mkataba umehifadhiwa");
      setShowClausesModal(false);
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    if (!form.tenantName) {
      toast("Chagua mpangaji kwanza", "error");
      return;
    }
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 300);
  }

  function handleDownloadPdf() {
    // Print-to-PDF via browser
    handlePrint();
    toast("Tumia 'Save as PDF' kwenye dirisha la kuchapisha", "info");
  }

  const endDate = (() => {
    try {
      const d = new Date(form.startDate);
      d.setMonth(d.getMonth() + parseInt(form.durationMonths || "12", 10));
      return d.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  })();

  return (
    <div>
      <PageHeader
        title="Mikataba ya Upangaji wa Makazi"
        subtitle="Tengeneza na kuhariri mkataba rasmi wa kisheria wa Tanzania, kisha chapisha au pakua kama PDF."
      />

      <div className="no-print mb-4 flex flex-wrap gap-2">
        <SecondaryButton onClick={() => setShowClausesModal(true)}>
          <IconEdit size={16} /> Hariri Vifungu vya Mkataba
        </SecondaryButton>
        <PrimaryButton onClick={saveContractSettings} loading={saving}>
          <IconDoc size={16} /> Hifadhi Mkataba
        </PrimaryButton>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <IconPrint size={16} /> Chapisha / Pakua PDF
        </button>
      </div>

      <Card className="no-print mb-6">
        <Field label="Mkataba kwa Ajili ya Mpangaji">
          <Select value={tenantId} onChange={(e) => onTenantSelect(e.target.value)}>
            <option value="">-- Chagua Mpangaji Kutoa Mkataba --</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
                {t.room ? ` — ${t.room.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jina la Mwenye Nyumba">
          <TextInput
            value={form.landlordName}
            onChange={(e) => setForm({ ...form, landlordName: e.target.value })}
          />
        </Field>
        <Field label="Namba ya Simu ya Mwenye Nyumba">
          <TextInput
            value={form.landlordPhone}
            onChange={(e) => setForm({ ...form, landlordPhone: e.target.value })}
          />
        </Field>
        <Field label="NIDA ya Mwenye Nyumba">
          <TextInput
            value={form.landlordNida}
            onChange={(e) => setForm({ ...form, landlordNida: e.target.value })}
            placeholder="19850101-..."
          />
        </Field>
        <Field label="Mahali Nyumba Ilipo">
          <TextInput
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Eneo, Mtaa, Wilaya..."
          />
        </Field>
        <Field label="Dhamana (Deposit – TZS)">
          <TextInput
            type="number"
            value={form.deposit}
            onChange={(e) => setForm({ ...form, deposit: e.target.value })}
          />
        </Field>
        <Field label="Muda wa Mkataba (Miezi)">
          <TextInput
            type="number"
            min={1}
            value={form.durationMonths}
            onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
          />
        </Field>
        <Field label="Kulipa Kila Baada ya (Miezi)">
          <TextInput
            type="number"
            min={1}
            value={form.paymentInterval}
            onChange={(e) => setForm({ ...form, paymentInterval: e.target.value })}
          />
        </Field>
        <Field label="Kodi ya Mwezi (TZS)">
          <TextInput
            type="number"
            value={form.monthlyRent}
            onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
          />
        </Field>
        <Field label="Tarehe ya Kuanza">
          <TextInput
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </Field>
        <Field label="Jina la Chumba / Nyumba">
          <TextInput
            value={form.roomName}
            onChange={(e) => setForm({ ...form, roomName: e.target.value })}
          />
        </Field>
      </Card>

      {/* Contract preview / print area */}
      <div
        id="contract-print-area"
        ref={printRef}
        className={cn(
          "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10",
          !showPreview && "no-print"
        )}
      >
        {/* Official text header */}
        <div className="mb-6 border-b-2 border-slate-800 pb-6 text-center font-serif">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
            Jamhuri ya Muungano wa Tanzania
          </p>
          <p className="mt-0.5 text-[11px] italic text-slate-500">
            The United Republic of Tanzania
          </p>
          <h2 className="mt-4 font-serif text-xl font-bold uppercase tracking-wide text-slate-900 sm:text-2xl">
            Mkataba wa Upangaji wa Makazi
          </h2>
          <p className="mt-1 text-sm italic text-slate-600">
            (Residential Tenancy Agreement)
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Unaundwa chini ya sheria za Jamhuri ya Muungano wa Tanzania
          </p>
        </div>

        <div className="space-y-1 text-sm leading-relaxed text-slate-800">
          <p>
            <strong>Tarehe ya Mkataba:</strong> {formatDate(new Date())}
          </p>
          <p className="mt-4">
            Mkataba huu unafanywa kati ya:
          </p>

          <div className="mt-3 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mwenye Nyumba (Landlord)
            </p>
            <p className="mt-1 font-semibold">{form.landlordName || "—"}</p>
            <p>Simu: {form.landlordPhone || "—"}</p>
            <p>NIDA: {form.landlordNida || "—"}</p>
            <p>Mahali: {form.location || "—"}</p>
          </div>

          <p className="my-2 text-center font-semibold">NA</p>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Mpangaji (Tenant)
            </p>
            <p className="mt-1 font-semibold">{form.tenantName || "—"}</p>
            <p>Simu: {form.tenantPhone || "—"}</p>
            <p>NIDA: {form.tenantNida || "—"}</p>
          </div>

          <div className="mt-4 space-y-2">
            <p>
              <strong>1. Eneo la Nyumba / Chumba:</strong> {form.roomName || "—"}
            </p>
            <p>
              <strong>Mahali:</strong> {form.location || "—"}
            </p>
            <p>
              <strong>2. Kodi ya Mwezi:</strong>{" "}
              {formatTZS(parseInt(form.monthlyRent || "0", 10))}
            </p>
            <p>
              <strong>3. Dhamana (Deposit):</strong>{" "}
              {formatTZS(parseInt(form.deposit || "0", 10))}
            </p>
            <p>
              <strong>4. Muda wa Mkataba:</strong> {form.durationMonths} miezi
            </p>
            <p>
              <strong>Tarehe ya Kuanza:</strong> {formatDate(form.startDate)}
            </p>
            <p>
              <strong>Tarehe ya Kuisha:</strong> {formatDate(endDate)}
            </p>
            <p>
              <strong>5. Mzunguko wa Malipo:</strong> Kila baada ya miezi{" "}
              {form.paymentInterval}
            </p>
          </div>

          <div className="mt-6 whitespace-pre-wrap border-t border-slate-200 pt-4 text-[13px] leading-relaxed">
            {clauses}
          </div>

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div>
              <p className="mb-12 text-sm font-semibold">Saini ya Mwenye Nyumba</p>
              <div className="border-b border-slate-400" />
              <p className="mt-2 text-sm">{form.landlordName || "________________"}</p>
              <p className="text-xs text-slate-500">Jina kamili</p>
              <p className="mt-4 text-xs text-slate-500">Tarehe: _______________</p>
            </div>
            <div>
              <p className="mb-12 text-sm font-semibold">Saini ya Mpangaji</p>
              <div className="border-b border-slate-400" />
              <p className="mt-2 text-sm">{form.tenantName || "________________"}</p>
              <p className="text-xs text-slate-500">Jina kamili</p>
              <p className="mt-4 text-xs text-slate-500">Tarehe: _______________</p>
            </div>
          </div>

          {/* Witnesses */}
          <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
            <div>
              <p className="mb-12 text-sm font-semibold">Shahidi 1</p>
              <div className="border-b border-slate-400" />
              <p className="mt-2 text-xs text-slate-500">Jina na saini</p>
            </div>
            <div>
              <p className="mb-12 text-sm font-semibold">Shahidi 2</p>
              <div className="border-b border-slate-400" />
              <p className="mt-2 text-xs text-slate-500">Jina na saini</p>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
            <p>Imetolewa kupitia KodiSalama — Mfumo wa Usimamizi wa Wapangaji</p>
            <p className="mt-1">
              Nembo ya Taifa © Jamhuri ya Muungano wa Tanzania · Uhuru na Umoja
            </p>
          </div>
        </div>
      </div>

      {!showPreview && (
        <div className="no-print mt-4 text-center">
          <SecondaryButton onClick={() => setShowPreview(true)}>
            Onyesha Hakiki ya Mkataba
          </SecondaryButton>
        </div>
      )}

      <Modal
        open={showClausesModal}
        onClose={() => setShowClausesModal(false)}
        title="Hariri Vifungu vya Mkataba"
        wide
      >
        <p className="mb-3 text-sm text-slate-600">
          Hariri masharti ya mkataba yatakayotumika kwa mikataba yote. Mabadiliko
          yatahifadhiwa kwenye hifadhidata.
        </p>
        <TextArea
          rows={16}
          value={editClauses}
          onChange={(e) => setEditClauses(e.target.value)}
          className="font-mono text-sm"
        />
        <div className="mt-4 flex gap-2">
          <SecondaryButton className="flex-1" onClick={() => setShowClausesModal(false)}>
            Ghairi
          </SecondaryButton>
          <PrimaryButton className="flex-1" onClick={saveContractSettings} loading={saving}>
            Hifadhi Vifungu
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  );
}
