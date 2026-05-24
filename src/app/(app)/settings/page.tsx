import { Building2, CreditCard, Users as UsersIcon, Key } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { ApiKeysPanel } from './ApiKeysPanel'

export default async function SettingsPage() {
  const session = (await getSession())!
  const [institution, apiKeys] = await Promise.all([
    db.institution.findUnique({
      where: { id: session.institutionId },
      include: { _count: { select: { users: true, certificates: true } } },
    }),
    db.apiKey.findMany({
      where: { institutionId: session.institutionId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  if (!institution) return null

  const planLabel: Record<string, { label: string; tone: 'brand' | 'ink' }> = {
    FREE:             { label: 'Free',              tone: 'ink' },
    ISSUER_STARTER:   { label: 'Issuer · Starter',  tone: 'brand' },
    ISSUER_PRO:       { label: 'Issuer · Pro',      tone: 'brand' },
    VERIFIER_STARTER: { label: 'Verifier · Starter', tone: 'brand' },
    VERIFIER_PRO:     { label: 'Verifier · Pro',    tone: 'brand' },
    ENTERPRISE:       { label: 'Enterprise',        tone: 'brand' },
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        <header className="border-b border-border pb-6">
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-ink-mute mt-2">Account, billing, API keys, team.</p>
        </header>

        {/* Institution */}
        <Card icon={Building2} title="Institution">
          <Row label="Name"        value={institution.name} />
          <Row label="Slug"        value={institution.slug} mono />
          <Row label="Email"       value={institution.email} />
          <Row label="Created"     value={format(institution.createdAt, 'd MMMM yyyy')} />
        </Card>

        {/* Plan */}
        <Card icon={CreditCard} title="Plan & billing">
          <Row label="Current plan" value={planLabel[institution.plan].label}
               tone={planLabel[institution.plan].tone} />
          <Row label="This month's issued" value={`${institution.monthlyIssued}`} />
          <Row label="This month's verifications" value={`${institution.monthlyVerifications}`} />
          <p className="px-5 py-3 text-xs text-ink-dim border-t border-border">
            Razorpay billing integration ships in the next release. For now, contact us at
            <a href="mailto:hi@pramaan.in" className="text-brand hover:underline ml-1">hi@pramaan.in</a> to upgrade.
          </p>
        </Card>

        {/* Team */}
        <Card icon={UsersIcon} title="Team">
          <Row label="Members" value={`${institution._count.users}`} />
          <p className="px-5 py-3 text-xs text-ink-dim border-t border-border">
            Inviting staff members ships with the team-management release.
          </p>
        </Card>

        {/* API */}
        <ApiKeysPanel apiKeys={apiKeys} />
      </div>
    </div>
  )
}

function Card({ icon: Icon, title, children }: { icon: typeof Building2; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
        <Icon className="w-4 h-4 text-brand" />
        <h2 className="font-bold">{title}</h2>
      </header>
      <dl className="divide-y divide-border">{children}</dl>
    </section>
  )
}

function Row({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'brand' | 'ink' }) {
  return (
    <div className="px-5 py-3 grid grid-cols-[180px_1fr] items-center gap-3">
      <dt className="text-xs font-bold uppercase tracking-wider text-ink-mute">{label}</dt>
      <dd className={`font-medium ${mono ? 'font-mono text-sm' : ''} ${tone === 'brand' ? 'text-brand font-bold' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}
