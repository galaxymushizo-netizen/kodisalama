"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/AppShell";
import { IconCopy, IconChat } from "@/components/Icons";
import {
  Field,
  TextArea,
  Select,
  TextInput,
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

type GatewayState = {
  configured: boolean;
  username?: string;
  senderId?: string | null;
  sandbox?: boolean;
};

type SmsLogRow = {
  id: number;
  phone: string;
  message: string;
  kind: string;
  status: string;
  cost: string | null;
  errorText: string | null;
  createdAt: string;
};

type Tab = "receipt" | "reminder" | "templates" | "gateway";

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

  // Gateway state
  const [gateway, setGateway] = useState<GatewayState>({ configured: false });
  const [cfgUsername, setCfgUsername] = useState("");
  const [cfgApiKey, setCfgApiKey] = useState("");
  const [cfgSenderId, setCfgSenderId] = useState("");
  const [cfgSandbox, setCfgSandbox] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<SmsLogRow[]>([]);

  const loadTenants = useCallback(async () => {
    const res = await fetch("/api/tenants?status=active");
    if (res.ok) setTenants(await res.json());
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/sms");
    if (res.ok) setTemplates(await res.json());
  }, []);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/sms/config");
    if (res.ok) {
      const data: GatewayState = await res.json();
      setGateway(data);
      if (data.configured) {
        setCfgUsername(data.username ?? "");
        setCfgSenderId(data.senderId ?? "");
        setCfgSandbox(data.sandbox ?? true);
      }
    }
  }, []);

  const loadLogs = useCallback(async () => {
    const res = await fetch("/api/sms/logs");
    if (res.ok) setLogs(await res.json());
  }, []);

  useEffect(() => {
    loadTenants();
    loadTemplates();
    loadConfig();
  }, [loadTenants, loadTemplates, loadConfig]);

  useEffect(() => {
    if (tab === "gateway") loadLogs();
  }, [tab, loadLogs]);

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
    if (!tenantId || tab === "templates" || tab === "gateway") return;
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

  async function sendViaGateway() {
    if (!tenantId) {
      toast("Chagua mpangaji", "error");
      return;
    }
    if (!gateway.configured) {
      toast("Sanidi Gateway ya SMS kwanza (kichupo cha Gateway)", "error");
      setTab("gateway");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          message,
          kind: tab === "reminder" ? "reminder" : "receipt",
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast(
          `SMS imetumwa kwa ${data.to}${data.cost ? ` — gharama: ${data.cost}` : ""}`
        );
      } else {
        toast(data.error || "Imeshindwa kutuma SMS", "error");
      }
      if (tab === "gateway") loadLogs();
    } finally {
      setSending(false);
    }
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

  async function saveConfig() {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/sms/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cfgUsername,
          apiKey: cfgApiKey,
          senderId: cfgSenderId || null,
          sandbox: cfgSandbox,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Imeshindwa", "error");
        return;
      }
      setCfgApiKey("");
      await loadConfig();
      toast("Gateway imehifadhiwa");
    } finally {
      setSavingConfig(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "receipt", label: "Risiti ya Malipo" },
    { id: "reminder", label: "Kikumbusho cha Kodi" },
    { id: "templates", label: "Badili Maneno (Templates)" },
    { id: "gateway", label: "Gateway (Tuma Moja Kwa Moja)" },
  ];

  return (
    <div>
      <PageHeader
        title="Jenereta ya SMS na Risiti"
        subtitle="Tengeneza risiti ya malipo au kikumbusho cha kodi, kisha mtumie mpangaji kwa WhatsApp, SMS ya simu, au moja kwa moja kwa Gateway (Africa's Talking)."
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
      ) : tab === "gateway" ? (
        <>
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-slate-900">
                Gateway ya SMS — Africa&apos;s Talking
              </h3>
              {gateway.configured ? (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-bold",
                    gateway.sandbox
                      ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                      : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  )}
                >
                  {gateway.sandbox ? "SANDBOX (majaribio)" : "LIVE"}
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  HAIJASANIDIWA
                </span>
              )}
            </div>

            <p className="mb-4 text-sm leading-relaxed text-slate-600">
              Fungua akaunti bure kwenye{" "}
              <a
                href="https://account.africastalking.com/auth/register"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-700 underline"
              >
                africastalking.com
              </a>
              , kisha nakili <strong>API key</strong> yako kutoka dashibodi na
              iweke hapa. Ufunguo huhifadhiwa kwenye server — hauoni tena
              ukishaokoa. Kwenye <strong>Sandbox</strong> ni bure: ujumbe
              unatumika kwa namba zilizosajiliwa kwenye dashibodi ya sandbox
              tu. Kwa <strong>Live</strong> unahitaji salio la SMS, na Sender
              ID (mfano KODISALAMA) inapaswa kusajiliwa na TCRA.
            </p>

            <Field label="Username (mfano: sandbox au jina lako la AT)">
              <TextInput
                value={cfgUsername}
                onChange={(e) => setCfgUsername(e.target.value)}
                placeholder="sandbox"
                autoComplete="off"
              />
            </Field>
            <Field label="API Key">
              <TextInput
                type="password"
                value={cfgApiKey}
                onChange={(e) => setCfgApiKey(e.target.value)}
                placeholder={
                  gateway.configured
                    ? "Imehifadhiwa — acha wazi kama hutabadilisha"
                    : "atsk_..."
                }
                autoComplete="new-password"
              />
            </Field>
            <Field label="Sender ID (si lazima; mfano KODISALAMA)">
              <TextInput
                value={cfgSenderId}
                onChange={(e) => setCfgSenderId(e.target.value)}
                placeholder="KODISALAMA"
                maxLength={11}
              />
            </Field>
            <label className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={cfgSandbox}
                onChange={(e) => setCfgSandbox(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />
              Tumia Sandbox (majaribio bila malipo)
            </label>
            <PrimaryButton onClick={saveConfig} loading={savingConfig}>
              Hifadhi Gateway
            </PrimaryButton>
          </Card>

          <Card className="mt-4">
            <h3 className="mb-3 font-display text-base font-bold text-slate-900">
              Historia ya SMS (50 za karibuni)
            </h3>
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500">
                Hakuna SMS zilizotumwa kwa gateway bado.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <li key={l.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          l.status === "sent"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        )}
                      >
                        {l.status === "sent" ? "Imetumwa" : "Imeshindikana"}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">
                        {l.phone}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                        {l.kind}
                      </span>
                      {l.cost && (
                        <span className="text-xs text-slate-500">{l.cost}</span>
                      )}
                      <span className="ml-auto text-[11px] text-slate-400">
                        {new Date(l.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {l.message}
                    </p>
                    {l.errorText && (
                      <p className="mt-1 text-xs font-medium text-red-600">
                        {l.errorText}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <p className="mb-4 text-sm text-slate-600">
            {tab === "receipt"
              ? "Tengeneza risiti rasmi ya malipo kwa Kiswahili na mtumie mpangaji kupitia WhatsApp, SMS ya simu, au Gateway."
              : "Tengeneza kikumbusho cha kodi na mtumie mpangaji kupitia WhatsApp, SMS ya simu, au Gateway."}
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
            <PrimaryButton
              onClick={sendViaGateway}
              loading={sending}
              disabled={!tenantId}
            >
              <IconChat size={16} /> Tuma kwa Gateway
            </PrimaryButton>
            <SecondaryButton onClick={openWhatsApp} disabled={!tenantId}>
              Tuma WhatsApp
            </SecondaryButton>
            <SecondaryButton onClick={openSms} disabled={!tenantId}>
              Tuma SMS ya Simu
            </SecondaryButton>
            <SecondaryButton onClick={copyMessage}>
              <IconCopy size={16} /> Nakili
            </SecondaryButton>
            <SecondaryButton
              onClick={() => generate(tab === "receipt" ? "receipt" : "reminder")}
              disabled={!tenantId || generating}
            >
              {generating ? "Inatengeneza..." : "Tengeneza Upya"}
            </SecondaryButton>
          </div>

          {!gateway.configured && (
            <p className="mt-3 text-xs text-slate-500">
              Kidokezo: Sanidi{" "}
              <button
                type="button"
                onClick={() => setTab("gateway")}
                className="font-semibold text-emerald-700 underline"
              >
                Gateway ya SMS
              </button>{" "}
              ili kutuma moja kwa moja bila kuhamishia app nyingine.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
