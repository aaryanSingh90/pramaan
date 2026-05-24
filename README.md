# Pramaan

> **Har certificate ka Pramaan.**
> A SaaS platform for issuing and verifying tamper-proof certificates.

Pramaan lets institutions issue cryptographically-signed certificates with embedded QR codes. Anyone — HR teams, candidates, recruiters — can verify a certificate in one scan, with no app to install.

## What's in the box (v0.4)

- 🏫 **Issuer signup** — create an institution + first owner user
- 🔐 **Auth** — JWT cookies, bcrypt password hashing, server actions
- 📊 **Issuer dashboard** — KPIs, recent certificates, empty state CTA
- 📝 **Issue flow** — single recipient form + paste-many bulk (up to 500 rows)
- 📜 **Certificates list & detail** — search, filter Active/Revoked, download PDF, revoke
- 🎨 **Template editor** — upload your own PNG/JPEG background, drag fields onto it, style each (font, size, color, alignment, bold)
- 📄 **PDF generation** — `pdf-lib`-built, QR code embedded, cert ID in monospace under QR
- ✉ **Email delivery** — auto-sends issued certificate (PDF + verify URL) to the recipient via Resend. Falls back to console-logging when no API key is set. Per-cert send log + Resend button.
- 🔍 **Public verification** — `/v/<id>` server-rendered page with 6 verdicts:
  - ✓ Valid · ⓧ Revoked · ⏲ Expired · ⚠ Tampered · ✗ Not found · ⏸ Throttled
- 🛡 **HMAC signatures** — tampered DB rows are detected on every verify
- 🚦 **Rate limit** — 5 free verifications / IP / 24 h for anonymous users
- 🎨 **Polished landing page** with pricing + verify-now bar
- 🛟 **Custom error.tsx + not-found.tsx** — friendly fallbacks, never expose stack traces
- 🔒 **Security headers** — HSTS, X-Frame-Options, no `X-Powered-By`, Permissions-Policy locked down

## What's coming next

- Razorpay subscription gating per plan
- HR-side bulk verification (CSV in → CSV out)
- API keys for HRMS integration
- S3 / R2 storage for template backgrounds (base64-in-DB works up to ~500 templates)
- ZIP download of all issued certificates

## Stack

- **Next.js 15** (App Router, Server Actions) — SSR for verification pages so they share well on LinkedIn / WhatsApp
- **Postgres + Prisma** — multi-tenant via `Institution`
- **Tailwind 3** + Inter / Fraunces / JetBrains Mono
- **HMAC-SHA256** for certificate tamper detection (signature stored alongside row)
- **bcrypt + jose** for auth
- **pdf-lib + qrcode** (wired but flow not yet UI-exposed) for certificate generation

## Local development

You'll need Node 20+ and Postgres 14+ running locally.

```bash
# 1. Install
cd ~/Desktop/pramaan
npm install

# 2. Create the database
createdb pramaan

# 3. Configure
cp .env.example .env
# (defaults work if you're on macOS with Homebrew Postgres + your shell user)
# RESEND_API_KEY can stay blank — emails will be console-logged in that mode.

# 4. Run migrations + seed demo data
npx prisma migrate dev --name init
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

### Demo login

After `npm run db:seed`:
- **Email**: `rahul@dit.edu.in`
- **Password**: `demo1234`

The seed prints 5 verification URLs in your terminal — open any of them to see a real `/v/<id>` page render. One certificate is pre-revoked so you can see the red-verdict state.

## Architecture sketch

```
            ┌──────────────────── Next.js ───────────────────┐
 Browser ──▶│  Landing  ·  /signup  ·  /login                │
            │  /dashboard  (cookie-authed)                   │
            │  /v/<id>     (public, rate-limited)            │
            │  Server Actions for mutations                  │
            └────────────────┬───────────────────────────────┘
                             │ Prisma
                             ▼
                       ┌──────────┐
                       │ Postgres │
                       └──────────┘
```

## Data model

- `Institution` — the tenant. Has many users, templates, certificates.
- `User` — staff member. Roles: OWNER, STAFF.
- `Template` — certificate background + field placements.
- `Certificate` — the issued credential. Carries an HMAC signature; the row is the source of truth.
- `Verification` — every public lookup, for analytics + rate-limiting.
- `ApiKey` — for HR systems to integrate bulk verification (Phase 2).

## Security model

- Passwords hashed with bcrypt cost 10.
- Sessions via signed JWT cookies (HttpOnly, SameSite=Lax, 7-day expiry).
- Every certificate row carries an HMAC-SHA256 signature over its canonical contents. If anyone (including a database admin) edits a row, the signature stops matching and `/v/<id>` returns **TAMPERED**.
- The free public verify endpoint is rate-limited per IP (5 / 24 h) via a `Verification` table scan — cheap and effective for v1, swap to Redis under serious load.
- Constant-time signature comparison to dodge timing attacks.

## Brand

- **Name**: Pramaan (Hindi: *proof, evidence*).
- **Tagline**: *Har certificate ka Pramaan.*
- **Palette**: deep navy (`#0a0e1a`) + saffron accent (`#f59e0b`).
- **Typography**: Inter (UI), Fraunces (display + certificate body), JetBrains Mono (cert IDs).

## License

Proprietary. Aaryan Singh.
