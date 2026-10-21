"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/AppShell";
import { IconCopy, IconChat } from "@/components/Icons";
import {
  Field,
  TextArea,
  Select,
  PrimaryButton,
  SecondaryButton,
} from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

type Tenant = {
  id: number;
  fullName: string;
  phone: string;
  room: { id: number; name: string } | null;
};

type Payment = {
  id: number;
  amount: number;
  paymentDate: string;
  method: string;
  periodMonth: string | null;
  reference: string | null;
};

type Tab = "receipt" | "reminder" | "templates";

export default function SmsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("receipt");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [message, setMessage] = useState("Tafadhali chagua mpangaji ili kuandaa ujumbe.");
  const [charCount, setCharCount] = useState(0);
  const [smsCount, setSmsCount] = useState(1);
  const [phone, setPhone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState({ receipt: "", reminder: "" });
  const [savingTpl, setSavingTpl] = useState(false);

  const loadTenants = useCallback(async () => {
    const res = await fetch("/api/tenants?status=active");
    if (res.ok) setTenants(await res.json());
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/sms");
    if (res.ok) setTemplates(await res.json());
  }, []);

  useEffect(() => {
    loadTenants();
    loadTemplates();
  }, [loadTenants, loadTemplates]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) {
        if (!cancelled) {
          setPayments([]);
          setPaymentId("");
        }
        return;
      }
      const res = await fetch(`/api/payments?tenantId=${tenantId}`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setPayments(data.payments ?? []);
        setPaymentId("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function generate(type: "receipt" | "reminder") {
    if (!tenantId) {
      toast("Chagua mpangaji", "error");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          type,
          tenantId,
          paymentId: paymentId || null,
          customTemplate: message.includes("{{") ? message : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      setMessage(data.message);
      setCharCount(data.charCount);
      setSmsCount(data.smsCount);
      setPhone(data.phone);
    } finally {
      setGenerating(false);
    }
  }

  // Auto-generate when tenant/payment/tab changes
  useEffect(() => {
    if (!tenantId || tab === "templates") return;
    generate(tab === "receipt" ? "receipt" : "reminder");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, paymentId, tab]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      toast("Ujumbe umenakiliwa");
    } catch {
      toast("Imeshindwa kunakili", "error");
    }
  }

  function openWhatsApp() {
    if (!phone) {
      toast("Hakuna namba ya simu", "error");
      return;
    }
    let num = phone.replace(/\D/g, "");
    if (num.startsWith("0")) num = "255" + num.slice(1);
    if (!num.startsWith("255")) num = "255" + num;
    const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openSms() {
    if (!phone) {
      toast("Hakuna namba ya simu", "error");
      return;
    }
    window.open(`sms:${phone}?body=${encodeURIComponent(message)}`, "_self");
  }

  async function saveTemplates() {
    setSavingTpl(true);
    try {
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_templates",
          receipt: templates.receipt,
          reminder: templates.reminder,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      toast("Templeti zimehifadhiwa");
    } finally {
      setSavingTpl(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "receipt", label: "Risiti ya Malipo" },
    { id: "reminder", label: "Kikumbusho cha Kodi" },
    { id: "templates", label: "Badili Maneno (Templates)" },
  ];

  return (
    <div>
      <PageHeader
        title="Jenereta ya SMS na Risiti"
        subtitle="Tengeneza risiti ya malipo au kikumbusho cha kodi na mtumie mpangaji moja kwa moja kupitia WhatsApp au SMS."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
              tab === t.id
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <Card>
          <p className="mb-4 text-sm text-slate-600">
            Unaweza kutumia vigezo:{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">
              {"{{tenant_name}} {{room_name}} {{amount}} {{date}} {{method}} {{reference}} {{period}} {{landlord_name}} {{landlord_phone}}"}
            </code>
          </p>
          <Field label="Templeti ya Risiti">
            <TextArea
              rows={10}
              value={templates.receipt}
              onChange={(e) =>
                setTemplates({ ...templates, receipt: e.target.value })
              }
            />
          </Field>
          <Field label="Templeti ya Kikumbusho">
            <TextArea
              rows={10}
              value={templates.reminder}
              onChange={(e) =>
                setTemplates({ ...templates, reminder: e.target.value })
              }
            />
          </Field>
          <PrimaryButton onClick={saveTemplates} loading={savingTpl}>
            Hifadhi Templeti
          </PrimaryButton>
        </Card>
      ) : (
        <Card>
          <p className="mb-4 text-sm text-slate-600">
            {tab === "receipt"
              ? "Tengeneza risiti rasmi ya malipo kwa Kiswahili na mtumie mpangaji kupitia WhatsApp au SMS."
              : "Tengeneza kikumbusho cha kodi na mtumie mpangaji kupitia WhatsApp au SMS."}
          </p>

          <Field label="Chagua Mpangaji" required>
            <Select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
            >
              <option value="">-- Chagua Mpangaji --</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                  {t.room ? ` (${t.room.name})` : ""} — {t.phone}
                </option>
              ))}
            </Select>
          </Field>

          {tab === "receipt" && (
            <Field label="Chagua Rekodi ya Malipo ya Kutoa Risiti">
              <Select
                value={paymentId}
                onChange={(e) => setPaymentId(e.target.value)}
              >
                <option value="">
                  {payments.length === 0
                    ? "Hakuna malipo yaliyorekodiwa kwa mpangaji huyu"
                    : "-- Chagua malipo (si lazima) --"}
                </option>
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.paymentDate} — TZS {p.amount.toLocaleString()}
                    {p.periodMonth ? ` (${p.periodMonth})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <div className="mb-1.5 flex items-end justify-between">
            <span className="text-sm font-medium text-slate-700">
              Muundo wa Ujumbe (Unaweza kuhariri maneno hapa moja kwa moja kabla ya kutuma):
            </span>
            <span className="text-xs text-slate-500">
              {charCount || message.length} herufi
              <br />
              (SMS {smsCount || Math.max(1, Math.ceil(message.length / 160))})
            </span>
          </div>
          <TextArea
            rows={10}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setCharCount(e.target.value.length);
              setSmsCount(Math.max(1, Math.ceil(e.target.value.length / 160)));
            }}
            className="mb-4 font-mono text-sm"
          />

          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={copyMessage}>
              <IconCopy size={16} /> Nakili Ujumbe (Copy)
            </SecondaryButton>
            <PrimaryButton onClick={openWhatsApp} disabled={!tenantId}>
              <IconChat size={16} /> Tuma WhatsApp
            </PrimaryButton>
            <SecondaryButton onClick={openSms} disabled={!tenantId}>
              Tuma SMS
            </SecondaryButton>
            <SecondaryButton
              onClick={() => generate(tab === "receipt" ? "receipt" : "reminder")}
              disabled={!tenantId || generating}
            >
              {generating ? "Inatengeneza..." : "Tengeneza Upya"}
            </SecondaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}
