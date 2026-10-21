export function formatTZS(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseInt(amount, 10) : amount ?? 0;
  if (isNaN(Number(n))) return "TZS 0";
  return `TZS ${Math.round(Number(n)).toLocaleString("en-TZ")}`;
}

export function formatCompactTZS(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseInt(amount, 10) : amount ?? 0;
  if (isNaN(Number(n))) return "0";
  const v = Math.round(Number(n));
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(v % 1_000 === 0 ? 0 : 1)}K`;
  return String(v);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("sw-TZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function currentMonthLabel(locale = "sw"): string {
  const now = new Date();
  const monthsSw = [
    "Januari",
    "Februari",
    "Machi",
    "Aprili",
    "Mei",
    "Juni",
    "Julai",
    "Agosti",
    "Septemba",
    "Oktoba",
    "Novemba",
    "Desemba",
  ];
  const monthsEn = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const m = locale === "sw" ? monthsSw : monthsEn;
  return `${m[now.getMonth()]} ${now.getFullYear()}`;
}

export function currentPeriodMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "Fedha Taslimu (Cash)" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "tigopesa", label: "Tigo Pesa" },
  { value: "airtel", label: "Airtel Money" },
  { value: "bank", label: "Benki (Bank Transfer)" },
  { value: "other", label: "Nyingine" },
] as const;

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export const DEFAULT_RECEIPT_TEMPLATE = `RIPOTI YA MALIPO YA KODI
------------------------
Mpangaji: {{tenant_name}}
Chumba: {{room_name}}
Kiasi: {{amount}}
Tarehe: {{date}}
Njia: {{method}}
Kumbukumbu: {{reference}}
Mwezi: {{period}}

Asante kwa kulipa kodi yako kwa wakati.
Mwenye Nyumba: {{landlord_name}}
Simu: {{landlord_phone}}
— KodiSalama`;

export const DEFAULT_REMINDER_TEMPLATE = `KIKUMBUSHO CHA KODI
------------------------
Habari {{tenant_name}},
Hii ni kikumbusho cha malipo ya kodi ya chumba {{room_name}}.
Kiasi kinachotarajiwa: {{amount}}
Tafadhali lipa kabla ya tarehe ya mwisho.

Asante,
{{landlord_name}}
{{landlord_phone}}
— KodiSalama`;

export const DEFAULT_CONTRACT_CLAUSES = `MASHARTI YA MKATABA WA UPANGAJI WA MAKAZI

1. MADA YA MKATABA
Mwenye nyumba anakubali kumpangisha mpangaji chumba/nyumba iliyotajwa hapa chini kwa mujibu wa masharti yaliyoainishwa katika mkataba huu.

2. MUDA WA MKATABA
Mkataba huu utaanza tarehe iliyotajwa na utaendelea kwa muda uliokubaliwa isipokuwa ukomeshwe mapema kwa mujibu wa sheria na masharti haya.

3. KODI NA MALIPO
Mpangaji atalipa kodi ya kila mwezi kwa kiasi kilichokubaliwa. Malipo yatafanywa kabla au tarehe iliyokubaliwa kila mwezi. Ucheleweshaji wa malipo unaweza kusababisha faini au hatua za kisheria.

4. DHAMANA (DEPOSIT)
Mpangaji atatoa dhamana inayolingana na kiasi kilichokubaliwa. Dhamana itarejeshwa baada ya kumalizika kwa mkataba ikiwa hakuna uharibifu au deni lolote.

5. MATUMIZI YA NYUMBA
Mpangaji atatumia nyumba kwa makazi pekee na hatafanyi shughuli za biashara bila idhini ya mwenye nyumba. Mpangaji atahifadhi usafi na utulivu.

6. MATENGENEZO
Mwenye nyumba atawajibika kwa matengenezo makubwa. Mpangaji atawajibika kwa uharibifu unaotokana na uzembe wake.

7. UINGIAJI WA MWENYE NYUMBA
Mwenye nyumba anaweza kuingia katika nyumba kwa arifa ya awali ya angalau saa 24 isipokuwa katika dharura.

8. KUKOMESHWA KWA MKATABA
Mkataba unaweza kukomeshwa na upande wowote kwa kuandika taarifa ya siku thelathini (30) mapema, au mara moja endapo kutakuwa na uvunjaji mkubwa wa masharti.

9. SHERIA INAYOTUMIKA
Mkataba huu utatawaliwa na sheria za Jamhuri ya Muungano wa Tanzania, ikiwemo Sheria ya Nyumba ya Kupanga na masharti mengine yanayohusiana.

10. SAINI
Kwa kuweka saini zao hapa chini, wahusika wanathibitisha kuwa wamesoma, wameelewa, na wanakubali masharti yote ya mkataba huu.`;
