import Link from 'next/link'
import { headers } from 'next/headers'
import { format } from 'date-fns'
import {
  ShieldCheck, ShieldAlert, ShieldX, Clock, Building2, User, BookOpen,
  Calendar, ScanLine, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { verifyCertificate, type Verdict } from '@/lib/verify'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getClientIp(): Promise<string | null> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return h.get('x-real-ip')
}

export default async function VerifyPage({ params }: PageProps) {
  const { id } = await params
  const h = await headers()
  const verdict = await verifyCertificate(id, {
    verifierIp: await getClientIp(),
    userAgent:  h.get('user-agent'),
  })
  return <Verdict verdict={verdict} queriedId={id} />
}

// ─── UI ─────────────────────────────────────────────────────────────────────

function Verdict({ verdict, queriedId }: { verdict: Verdict; queriedId: string }) {
  const theme =
    verdict.kind === 'VALID'    ? valid :
    verdict.kind === 'REVOKED'  ? revoked :
    verdict.kind === 'EXPIRED'  ? expired :
    verdict.kind === 'TAMPERED' ? tampered :
    verdict.kind === 'THROTTLED'? throttled :
                                  notFound

  return (
    <main className="min-h-screen bg-bg grain-bg">
      <header className="border-b border-border bg-bg/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 focus-ring rounded">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-bg" />
            </div>
            <span className="font-black">Pramaan</span>
          </Link>
          <Link href="/" className="text-xs text-ink-mute hover:text-ink focus-ring rounded">
            What is this?
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        {/* Headline verdict card */}
        <div className={`rounded-2xl border-2 ${theme.border} ${theme.bg} p-8 md:p-10 text-center`}>
          <div className={`w-16 h-16 mx-auto rounded-full ${theme.iconBg} flex items-center justify-center mb-5`}>
            <theme.icon className={`w-8 h-8 ${theme.iconFg}`} />
          </div>
          <h1 className={`font-serif text-4xl md:text-5xl font-bold tracking-tight ${theme.title}`}>
            {theme.label}
          </h1>
          <p className={`mt-3 text-base ${theme.subtitle} max-w-md mx-auto`}>
            {theme.subline}
          </p>
        </div>

        {/* Certificate details */}
        {'cert' in verdict && verdict.cert && (
          <section className="mt-8 bg-bg-card border border-border rounded-2xl overflow-hidden">
            <header className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold">Certificate details</h2>
              <span className="font-mono text-[10px] text-ink-dim tracking-widest">{verdict.cert.id}</span>
            </header>
            <dl className="divide-y divide-border">
              <Detail icon={Building2} label="Issued by"   value={verdict.cert.institution.name} />
              <Detail icon={User}      label="Recipient"   value={verdict.cert.recipientName} />
              {verdict.cert.course && <Detail icon={BookOpen} label="Course" value={verdict.cert.course} />}
              {verdict.cert.competitionName && <Detail icon={BookOpen} label="Competition" value={verdict.cert.competitionName} />}
              {verdict.cert.duration && <Detail icon={Clock} label="Duration" value={verdict.cert.duration} />}
              <Detail icon={Calendar} label="Issued on" value={format(verdict.cert.issuedAt, 'd MMMM yyyy')} />
              {verdict.cert.validUntil && (
                <Detail icon={Calendar} label="Valid until" value={format(verdict.cert.validUntil, 'd MMMM yyyy')} />
              )}
              {verdict.cert.grade && <Detail icon={ShieldCheck} label="Grade / Result" value={verdict.cert.grade} />}
            </dl>
            <footer className="px-6 py-3 border-t border-border bg-bg-soft/30 text-[10px] font-bold uppercase tracking-widest text-ink-dim flex items-center justify-between">
              <span>Verified by Pramaan</span>
              <span>{format(new Date(), 'd MMM yyyy · h:mm a')}</span>
            </footer>
          </section>
        )}

        {/* Not-found query echo */}
        {!('cert' in verdict) && verdict.kind === 'NOT_FOUND' && (
          <div className="mt-8 bg-bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-ink-mute">You searched for:</p>
            <p className="mt-1 font-mono text-lg tracking-widest break-all">{queriedId}</p>
          </div>
        )}

        {/* Throttle message */}
        {verdict.kind === 'THROTTLED' && (
          <div className="mt-8 bg-bg-card border border-warn/30 rounded-xl p-5">
            <p className="text-sm">
              You've used your <strong>5 free verifications</strong> for the next 24 hours.{' '}
              Sign up for free to track unlimited certificates you actually hold, or upgrade to a
              verifier plan if you're an HR team checking applicants in bulk.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-brand text-bg text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring">
                Sign up free
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/#pricing" className="inline-flex items-center gap-2 border border-border-soft hover:border-brand/50 hover:text-brand text-sm font-bold px-4 py-2 rounded-lg transition-colors focus-ring">
                Verifier plans
              </Link>
            </div>
          </div>
        )}

        {/* What now? */}
        <p className="mt-8 text-center text-xs text-ink-dim">
          <ScanLine className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
          Anyone can verify a Pramaan certificate by scanning its QR code. The result you see is the
          institution's current word — including revocations.
        </p>
      </div>
    </main>
  )
}

function Detail({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="px-6 py-4 grid grid-cols-[140px_1fr] items-center gap-3">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-mute">
        <Icon className="w-3.5 h-3.5 text-brand" />
        {label}
      </dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  )
}

// ─── Theme tokens per verdict ───────────────────────────────────────────────

const valid = {
  icon: ShieldCheck,
  label: 'Verified',
  subline: 'This certificate is valid and was issued by the institution shown below.',
  bg: 'bg-success/5', border: 'border-success/40',
  iconBg: 'bg-success/15', iconFg: 'text-success',
  title: 'text-success', subtitle: 'text-ink-mute',
}
const revoked = {
  icon: ShieldX,
  label: 'Revoked',
  subline: 'The issuing institution has revoked this certificate. Treat any printed copy as invalid.',
  bg: 'bg-danger/5', border: 'border-danger/40',
  iconBg: 'bg-danger/15', iconFg: 'text-danger',
  title: 'text-danger', subtitle: 'text-ink-mute',
}
const expired = {
  icon: Clock,
  label: 'Expired',
  subline: 'This certificate had a validity window which has passed.',
  bg: 'bg-warn/5', border: 'border-warn/40',
  iconBg: 'bg-warn/15', iconFg: 'text-warn',
  title: 'text-warn', subtitle: 'text-ink-mute',
}
const tampered = {
  icon: AlertTriangle,
  label: 'Tampered',
  subline: 'This certificate\'s contents don\'t match its cryptographic signature. Do not trust it.',
  bg: 'bg-danger/5', border: 'border-danger/40',
  iconBg: 'bg-danger/15', iconFg: 'text-danger',
  title: 'text-danger', subtitle: 'text-ink-mute',
}
const notFound = {
  icon: ShieldAlert,
  label: 'Not found',
  subline: 'No Pramaan certificate exists with that ID. Double-check the spelling or scan the QR code directly.',
  bg: 'bg-bg-soft', border: 'border-border-soft',
  iconBg: 'bg-bg-card', iconFg: 'text-ink-mute',
  title: 'text-ink', subtitle: 'text-ink-mute',
}
const throttled = {
  icon: Clock,
  label: 'Daily limit reached',
  subline: 'You\'ve made 5 verifications in the last 24 hours from this network.',
  bg: 'bg-warn/5', border: 'border-warn/40',
  iconBg: 'bg-warn/15', iconFg: 'text-warn',
  title: 'text-warn', subtitle: 'text-ink-mute',
}
