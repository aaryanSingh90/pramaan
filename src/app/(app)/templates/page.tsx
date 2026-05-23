import Link from 'next/link'
import { Plus, FileText, ChevronRight, Sparkles } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { format } from 'date-fns'

export default async function TemplatesPage() {
  const session = (await getSession())!
  const templates = await db.template.findMany({
    where: { institutionId: session.institutionId, archivedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { certificates: true } } },
  })

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Templates</h1>
            <p className="text-sm text-ink-mute mt-1.5">
              Reusable certificate designs. Issue without a template too — we'll use the default.
            </p>
          </div>
          <Link
            href="/templates/new"
            className="inline-flex items-center gap-2 bg-brand text-bg text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
          >
            <Plus className="w-4 h-4" />
            New template
          </Link>
        </header>

        {/* Default-template note */}
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h3 className="font-bold">No template? No problem.</h3>
              <p className="text-sm text-ink-mute mt-1 max-w-2xl">
                Every certificate Pramaan issues — with or without a template — gets a cream
                parchment background with saffron rules, your institution name, the recipient
                details, and a scannable QR code. Templates only matter when you want your own
                logo, signature, or background art.
              </p>
            </div>
          </div>
        </div>

        {/* Templates */}
        {templates.length === 0 ? (
          <div className="bg-bg-card border border-dashed border-border-soft rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-brand" />
            </div>
            <h2 className="font-serif text-2xl font-bold">No custom templates yet</h2>
            <p className="text-sm text-ink-mute mt-2 max-w-md mx-auto">
              Upload your existing certificate design (PNG or JPEG) and we'll overlay recipient
              data on it. Full drag-drop editor coming soon.
            </p>
            <Link
              href="/templates/new"
              className="mt-5 inline-flex items-center gap-2 bg-brand text-bg font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
            >
              <Plus className="w-4 h-4" />
              Create template
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Link
                key={t.id}
                href={`/templates/${t.id}`}
                className="block bg-bg-card border border-border rounded-xl p-5 hover:border-brand/40 transition-colors focus-ring"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-brand" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-dim group-hover:text-brand" />
                </div>
                <h3 className="font-bold truncate">{t.name}</h3>
                <p className="text-xs text-ink-mute mt-1">
                  {t._count.certificates} certificate{t._count.certificates !== 1 ? 's' : ''} issued
                </p>
                <p className="text-[10px] text-ink-dim mt-3 uppercase tracking-wider font-bold">
                  Created {format(t.createdAt, 'd MMM yyyy')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
