<div align="center">

# 🏠 KodiSalama

**Secure rental & tenant management for Tanzanian landlords — vyumba, wapangaji, malipo, mikataba na SMS.**

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org)

*Karibu! KodiSalama inawapa wenye nyumba nchini Tanzania mfumo salama wa kusimamia vyumba vyao, wapangaji, malipo ya kodi, mikataba, na risiti za SMS — kwa Kiswahili.*

**🌐 Live app: [kodisalama.vercel.app](https://kodisalama.vercel.app)** — imetumwa kwenye Vercel (Next.js 16) na PostgreSQL ya cloud (Neon). Kila mmiliki anajenga akaunti yake mwenyewe kwa barua pepe na huchukuliwa data zake pekee.

</div>

---

## ✨ Features

- **👤 Multi-landlord accounts** — anyone can register a free account with email + password; every landlord sees **only their own** data (rooms, tenants, payments, debts, contracts) with owner-scoped queries enforced on every API route.
- **📊 Dashibodi** — occupancy rate, monthly & all-time revenue, collection rate, top debtors and recent payments at a glance.
- **🏢 Vyumba (Rooms)** — track rooms with rent, status and automatic occupancy when a tenant moves in.
- **👥 Wapangaji (Tenants)** — full tenant records with NIDA, deposit, move-in date and room assignment; one active tenant per room is enforced server-side.
- **💰 Malipo (Payments)** — record payments via cash, M-Pesa, Tigo Pesa, Airtel Money or bank with period tracking and references.
- **⚠️ Madeni (Debts)** — automatic rent-debt computation from move-in date vs. payments, with partial/overdue status per tenant.
- **💬 SMS / Risiti** — generate Swahili SMS receipts and payment reminders from customizable templates. Send instantly through the **Africa's Talking gateway** (per-landlord API key, sandbox mode for free testing, delivery history) or hand off to WhatsApp / the phone's SMS app.
- **📜 Privacy Policy & Terms** — public [Sera ya Faragha](https://kodisalama.vercel.app/privacy) and [Masharti ya Matumizi](https://kodisalama.vercel.app/terms) pages; new users must read and accept them (timestamped) before an account is created.
- **📄 Mikataba (Contracts)** — editable Swahili tenancy contract clauses with default duration and payment interval; generates a complete contract data pack per tenant.
- **🛟 Backup & Restore** — one-click JSON export/import of all data, plus a guarded "wipe all" action. Your data stays yours.

## 🔐 Security (built in)

KodiSalama is designed to hold sensitive tenant data (names, phones, NIDA), so security is not an afterthought:

| Layer | What you get |
|---|---|
| **Accounts** | Open self-registration (`/register`) with email + password; passwords hashed with **scrypt** (N=16384) — plaintext is never stored or logged |
| **Authentication** | HMAC-signed, HttpOnly, SameSite session cookies bound to your user ID (12h, or 30 days with "remember me") |
| **Data isolation** | Every table carries an `ownerId`; every query, update and delete is filtered by it server-side — cross-account reads and writes return `404` |
| **Route protection** | Next.js middleware guards every page and API route; unauthenticated requests get redirected (pages) or `401` (API). Health checks stay open for uptime monitors |
| **Brute-force defense** | Rate limiting on login (5 fails / 15 min / IP) and registration (5 / hour / IP), constant-time password verification and timing-equalized responses for unknown emails |
| **Input validation** | Strict server-side validation: phone/date/enum whitelists, email format checks and length caps on every field — including backup import |
| **Security headers** | Content-Security-Policy, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS (production) |
| **Parameterized queries** | All database access goes through Drizzle ORM — no string-built SQL |
| **No secrets in git** | `.env` is git-ignored; `.env.example` documents every variable |

## 🚀 Quickstart

**Prerequisites:** Node.js ≥ 20.9, PostgreSQL ≥ 14, npm.

```bash
# 1. Clone and install
git clone https://github.com/galaxymushizo-netizen/kodisalama.git
cd kodisalama
npm install

# 2. Configure environment
cp .env.example .env
#    Edit .env: set DATABASE_URL
#    and APP_SESSION_SECRET (generate with: openssl rand -hex 32)

# 3. Create the database tables
npm run db:push

# 4. Run
npm run dev        # development → http://localhost:3000
# or
npm run build && npm run start   # production
```

Open **http://localhost:3000**, create your account on the **Jisajili** (register) screen, and set up your landlord profile under **Mipangilio**.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `APP_SESSION_SECRET` | ✅ | Random secret for signing sessions (`openssl rand -hex 32`) — rotating it logs everyone out |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (strict) |
| `npm run db:push` | Push schema to the database |
| `npm run db:studio` | Drizzle Studio (browse data) |

## 🧱 Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript (strict)**
- **Tailwind CSS 4** — mobile-first Swahili UI
- **PostgreSQL** + **Drizzle ORM** — typed schema, parameterized queries
- **Zero external auth dependencies** — session auth built on Node crypto & Web Crypto

## 📁 Project Structure

```
src/
├── app/
│   ├── api/            # REST API: auth (register/login/me), rooms, tenants, payments,
│   │                   # debts, dashboard, reports, contracts, sms, backup, health
│   ├── login/ register/  # Standalone auth screens
│   ├── vyumba/ wapangaji/ malipo/ sms/ mikataba/ mipangilio/
│   ├── layout.tsx      # Fonts, metadata, providers
│   └── page.tsx        # Dashboard
├── components/         # AppShell, AppFrame, Modal, Toast, Icons
├── db/                 # Drizzle schema & pool
├── lib/                # auth, password (scrypt), rate-limit, validation, debts engine, utils
└── middleware.ts       # Route protection
```

## 🗺️ Roadmap

- [ ] WhatsApp share for receipts & reminders
- [ ] Real SMS gateway integration (e.g. Africa's Talking / Beem Africa)
- [ ] Multi-property support
- [ ] PDF contract export
- [ ] Swahili/English UI toggle

## 🤝 Contributing

Issues and pull requests are welcome. Run `npm run lint && npm run typecheck` before submitting.

## 📄 License

[MIT](./LICENSE) — free to use, modify and build upon.

---

<div align="center">
<sub>Built for Tanzanian landlords 🇹🇿 — <em>Kodi salama, biashara laini.</em></sub>
</div>
