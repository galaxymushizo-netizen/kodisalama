/**
 * Server-side SMS gateway integration (Africa's Talking).
 *
 * The gateway credentials live in the sms_config table and are used ONLY
 * here on the server — the API key is never sent to the browser.
 *
 * Africa's Talking REST API (v1 messaging):
 *   POST {base}/version1/messaging
 *   Headers: apiKey, Content-Type: application/x-www-form-urlencoded
 *   Body: username, to (+2557...), message, [from]
 *   Sandbox base: https://sandbox.sandbox.africastalking.com
 *   Live base:    https://api.africastalking.com
 */

const AT_SANDBOX_BASE = "https://api.sandbox.africastalking.com";
const AT_LIVE_BASE = "https://api.africastalking.com";

export type SmsGatewayConfig = {
  username: string;
  apiKey: string;
  senderId: string | null;
  sandbox: boolean;
};

export type SmsSendOutcome =
  | { ok: true; providerRef: string | null; status: string; cost: string | null }
  | { ok: false; error: string };

/**
 * Normalize a Tanzanian phone number to E.164 (+255XXXXXXXXX).
 * Accepts 0712345678, +255712345678, 255712345678, 712345678.
 */
export function normalizeTzPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return "+255" + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith("255")) {
    return "+" + digits;
  }
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("6"))) {
    return "+255" + digits;
  }
  return null;
}

type AtRecipient = {
  statusCode?: number;
  status?: string;
  cost?: string;
  messageId?: string;
};

type AtResponse = {
  errorMessage?: string;
  SMSMessageData?: { Recipients?: AtRecipient[] };
};

export async function sendSms(
  cfg: SmsGatewayConfig,
  to: string,
  message: string
): Promise<SmsSendOutcome> {
  const base = cfg.sandbox ? AT_SANDBOX_BASE : AT_LIVE_BASE;

  const form = new URLSearchParams();
  form.set("username", cfg.username);
  form.set("to", to);
  form.set("message", message);
  if (!cfg.sandbox && cfg.senderId) {
    form.set("from", cfg.senderId);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/version1/messaging`, {
      method: "POST",
      headers: {
        apiKey: cfg.apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form.toString(),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? "Provider hafiki (timeout) — jaribu tena."
        : "Imeshindwa kufikia provider ya SMS.",
    };
  }

  const text = await res.text();
  let data: AtResponse | null = null;
  try {
    data = JSON.parse(text) as AtResponse;
  } catch {
    // provider returned non-JSON (e.g. HTML error page)
  }

  if (!res.ok) {
    const msg = data?.errorMessage ?? text.slice(0, 200);
    if (res.status === 401) {
      return { ok: false, error: msg || "Ufunguo wa API hausahihi (unauthorized)." };
    }
    return { ok: false, error: msg || `Provider imekataa ombi (HTTP ${res.status}).` };
  }

  const recipients = data?.SMSMessageData?.Recipients ?? [];
  if (recipients.length === 0) {
    return { ok: false, error: "Provider hakurudisha hali ya ujumbe." };
  }

  const r = recipients[0];
  // 101 = Success, 102 = Enqueued/sent to multiple
  if (r.statusCode === 101 || r.statusCode === 102) {
    return {
      ok: true,
      providerRef: r.messageId ?? null,
      status: r.status ?? "Sent",
      cost: r.cost ?? null,
    };
  }
  return {
    ok: false,
    error: r.status
      ? `Provider: ${r.status}`
      : "Imeshindikana kutuma ujumbe kwa namba hii.",
  };
}
