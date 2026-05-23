import Link from 'next/link'
import {
  ShieldCheck, FileCheck2, ScanLine, Building2, Briefcase, Users,
  Sparkles, ArrowRight, Lock, Zap, Globe2,
} from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-md">
            <Mark />
            <span className="font-black tracking-tight text-lg">Pramaan</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-mute">
            <a href="#how" className="hover:text-ink transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
            <a href="#verify" className="hover:text-ink transition-colors">Verify</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm font-semibold text-ink-mute hover:text-ink px-3 py-1.5 rounded-md transition-colors focus-ring"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-bold bg-brand text-bg px-3.5 py-1.5 rounded-md hover:bg-brand-400 transition-colors focus-ring"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="grain-bg absolute inset-0 opacity-50" />
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-brand text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Built for Indian institutions
            </div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Har certificate <br />
              ka <span className="text-brand">Pramaan</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-ink-mute leading-relaxed max-w-2xl">
              Issue tamper-proof certificates in minutes. Anyone can verify them in seconds with a QR scan.
              Built for colleges, coaching centers, competition organizers, and HR teams who need to <em>actually trust</em> the document in front of them.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-brand text-bg font-bold px-5 py-3 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
              >
                Start issuing certificates
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#verify"
                className="inline-flex items-center gap-2 border border-border-soft text-ink font-semibold px-5 py-3 rounded-lg hover:bg-bg-soft transition-colors focus-ring"
              >
                <ScanLine className="w-4 h-4" />
                Verify a certificate
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-ink-dim">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-brand" /> Tamper-proof
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-brand" /> Bulk-issue 1000 at once
              </div>
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-brand" /> Public verify URL
              </div>
            </div>
          </div>

          {/* Decorative cert preview */}
          <CertificatePreview />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="border-t border-border bg-bg-soft/40">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-ink-mute max-w-2xl">Three roles. One source of truth.</p>

          <div className="mt-12 grid md:grid-cols-3 gap-5">
            <RoleCard
              icon={Building2}
              title="Institutions"
              tag="Issue"
              points={[
                'Design your certificate template once.',
                'Upload a CSV of students — name, course, dates.',
                'Get a ZIP of PDFs, each with a unique QR code.',
                'Revoke or reissue anytime.',
              ]}
            />
            <RoleCard
              icon={Briefcase}
              title="Companies & HR"
              tag="Verify"
              points={[
                'Scan a candidate\'s QR or paste the certificate ID.',
                'See the issuer, recipient, course, and date instantly.',
                'Bulk-verify dozens of certificates from a CSV.',
                'API access for HRMS integration.',
              ]}
            />
            <RoleCard
              icon={Users}
              title="Public / Candidates"
              tag="Prove"
              points={[
                'Anyone can verify a certificate — no signup needed.',
                'Free tier: 5 verifications per day.',
                'Share a verified link on LinkedIn, WhatsApp, email.',
                'Sign up free to track all your credentials.',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Trust pillars ────────────────────────────────────────────────── */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-3 gap-6">
            <Pillar
              icon={ShieldCheck}
              title="Cryptographically signed"
              body="Every certificate carries an HMAC signature derived from its contents and a server-side secret. Edit the row in any database and the verify endpoint flags it instantly."
            />
            <Pillar
              icon={FileCheck2}
              title="The QR is the source of truth"
              body="No more checking a paper certificate against a website manually. The QR points to a live verification page that always reflects the issuer's latest decision — including revocations."
            />
            <Pillar
              icon={ScanLine}
              title="Verifiable from any phone"
              body="No app to install. The QR opens a public webpage that loads in under a second on a 3G connection. Works on every modern Android and iOS browser."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-border bg-bg-soft/40">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-ink-mute max-w-2xl">
            Pay only for what you issue or verify. Free for individuals — forever.
          </p>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            <PricingCard
              title="Free"
              priceLabel="₹0"
              perLabel="forever"
              for="Job applicants & curious users"
              features={[
                '5 verifications per day',
                'Public verify-by-QR',
                'Save your own credentials',
              ]}
              cta="Sign up free"
              ctaHref="/signup?plan=free"
              accent="ink"
            />
            <PricingCard
              title="Issuer Starter"
              priceLabel="₹1,499"
              perLabel="/ month"
              for="Coaching centers, small institutes"
              features={[
                '100 certificates / month',
                'Unlimited templates',
                'Bulk CSV upload',
                'Email + WhatsApp delivery',
              ]}
              cta="Start 14-day trial"
              ctaHref="/signup?plan=issuer-starter"
              accent="brand"
              highlight
            />
            <PricingCard
              title="Issuer Pro"
              priceLabel="₹4,999"
              perLabel="/ month"
              for="Colleges, universities, large competitions"
              features={[
                '1,000 certificates / month',
                'Custom logo + branding on /v/<id>',
                'Public analytics page',
                'Priority support',
              ]}
              cta="Start 14-day trial"
              ctaHref="/signup?plan=issuer-pro"
              accent="ink"
            />
          </div>

          <p className="mt-8 text-sm text-ink-dim">
            HR teams: <a href="#" className="text-brand hover:underline">Verifier plans →</a>{' '}
            · Need more? <a href="#" className="text-brand hover:underline">Enterprise →</a>
          </p>
        </div>
      </section>

      {/* ── Verify-now bar ───────────────────────────────────────────────── */}
      <section id="verify" className="border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            Already holding a certificate?
          </h2>
          <p className="mt-3 text-ink-mute">
            Paste the certificate ID printed below the QR code. We'll show you whether it's valid.
          </p>
          <form action="/v" method="get" className="mt-8 flex gap-2 max-w-md mx-auto">
            <input
              name="id"
              placeholder="e.g. ab3c4d5e6f7g"
              className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-ink placeholder-ink-dim focus-ring font-mono tracking-wider"
            />
            <button
              type="submit"
              className="bg-brand text-bg font-bold px-5 py-3 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
            >
              Verify
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <Mark />
            <span className="font-bold">Pramaan</span>
            <span className="text-ink-dim">·</span>
            <span className="text-ink-dim">Har certificate ka Pramaan</span>
          </div>
          <div className="flex items-center gap-5 text-ink-dim">
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <a href="#how" className="hover:text-ink">How it works</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Mark() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/40">
      <ShieldCheck className="w-4 h-4 text-bg" />
    </div>
  )
}

function RoleCard({ icon: Icon, title, tag, points }: {
  icon: typeof Building2; title: string; tag: string; points: string[]
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-6 hover:border-brand/40 transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-brand bg-brand/10 border border-brand/30 px-2 py-0.5 rounded">
          {tag}
        </span>
      </div>
      <h3 className="font-serif text-2xl font-bold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm text-ink-mute">
        {points.map(p => (
          <li key={p} className="flex gap-2.5">
            <span className="text-brand mt-1.5 shrink-0 w-1 h-1 rounded-full bg-brand" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Pillar({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-brand" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-ink-mute leading-relaxed">{body}</p>
    </div>
  )
}

function PricingCard({
  title, priceLabel, perLabel, for: forWhom, features, cta, ctaHref, accent, highlight,
}: {
  title: string; priceLabel: string; perLabel: string; for: string
  features: string[]; cta: string; ctaHref: string
  accent: 'brand' | 'ink'; highlight?: boolean
}) {
  return (
    <div className={`relative bg-bg-card border rounded-xl p-6 ${
      highlight ? 'border-brand/60 shadow-2xl shadow-brand-900/20' : 'border-border'
    }`}>
      {highlight && (
        <span className="absolute -top-3 left-6 text-[10px] font-black uppercase tracking-widest bg-brand text-bg px-2.5 py-0.5 rounded-full">
          Most popular
        </span>
      )}
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-xs text-ink-dim mt-1">{forWhom}</p>
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="font-serif text-4xl font-bold">{priceLabel}</span>
        <span className="text-ink-mute text-sm">{perLabel}</span>
      </div>
      <ul className="mt-6 space-y-2.5 text-sm">
        {features.map(f => (
          <li key={f} className="flex gap-2 text-ink-mute">
            <FileCheck2 className="w-4 h-4 text-brand mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={ctaHref}
        className={`mt-7 block text-center font-bold px-4 py-2.5 rounded-lg transition-colors focus-ring ${
          accent === 'brand'
            ? 'bg-brand text-bg hover:bg-brand-400'
            : 'border border-border-soft hover:border-brand/50 hover:text-brand'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}

function CertificatePreview() {
  return (
    <div className="hidden lg:block absolute top-20 right-6 w-[420px] rotate-3 pointer-events-none">
      <div className="bg-gradient-to-br from-bg-card via-bg-card to-bg-soft border border-brand/30 rounded-lg p-7 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between mb-5">
          <div className="w-9 h-9 rounded bg-brand/20 border border-brand/40 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-brand" />
          </div>
          <div className="text-[9px] font-mono text-ink-dim tracking-wider">PRAMAAN.IN/V/AB3C4D5E</div>
        </div>
        <p className="font-serif italic text-ink-mute text-sm">This is to certify that</p>
        <p className="font-serif text-3xl font-bold mt-2 leading-tight">Priya Sharma</p>
        <p className="text-sm text-ink-mute mt-2 leading-relaxed">
          has successfully completed the course on
        </p>
        <p className="font-serif text-xl font-bold mt-1 text-brand">Advanced Mathematics</p>
        <p className="text-xs text-ink-dim mt-4 font-mono">DURATION · 12 WEEKS · MAY 2026</p>
        <div className="mt-5 flex items-end justify-between">
          <div className="text-[10px] font-mono text-ink-dim">
            <div>ISSUED BY</div>
            <div className="text-ink mt-0.5">Delhi Institute of Tech</div>
          </div>
          <div className="w-14 h-14 rounded bg-white/95 grid grid-cols-5 grid-rows-5 p-1 gap-px">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={Math.random() > 0.55 ? 'bg-bg' : ''} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
