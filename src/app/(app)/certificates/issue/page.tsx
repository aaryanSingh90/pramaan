import Link from 'next/link'
import { ArrowLeft, User, ListChecks } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { IssueForms } from './IssueForms'

export default async function IssuePage() {
  const session = (await getSession())!
  const templates = await db.template.findMany({
    where: { institutionId: session.institutionId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">

        <header>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute uppercase tracking-widest hover:text-brand transition-colors mb-3 focus-ring rounded"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Issue certificates</h1>
          <p className="text-sm text-ink-mute mt-2 max-w-2xl">
            Pick one recipient or paste a whole list. Each certificate gets its own ID,
            QR code, and verification URL the moment it's saved.
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel icon={User} title="Single recipient" subtitle="Fill the fields, hit Issue.">
            <IssueForms.Single templates={templates} />
          </Panel>
          <Panel icon={ListChecks} title="Many at once" subtitle="Paste from Excel: Name TAB Course TAB Duration per row.">
            <IssueForms.Bulk templates={templates} />
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({ icon: Icon, title, subtitle, children }: {
  icon: typeof User; title: string; subtitle: string; children: React.ReactNode
}) {
  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-brand" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold">{title}</h2>
          <p className="text-[11px] text-ink-mute mt-0.5">{subtitle}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}
