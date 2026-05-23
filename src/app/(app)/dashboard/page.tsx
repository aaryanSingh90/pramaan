import Link from 'next/link'
import { Award, FileText, ShieldCheck, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function Dashboard() {
  const session = (await getSession())!   // layout guarantees this
  const institutionId = session.institutionId

  const [totalIssued, activeCount, revokedCount, templateCount, recent] = await Promise.all([
    db.certificate.count({ where: { institutionId } }),
    db.certificate.count({ where: { institutionId, status: 'ACTIVE' } }),
    db.certificate.count({ where: { institutionId, status: 'REVOKED' } }),
    db.template.count({ where: { institutionId, archivedAt: null } }),
    db.certificate.findMany({
      where: { institutionId },
      orderBy: { issuedAt: 'desc' },
      take: 8,
      select: {
        id: true, recipientName: true, course: true, issuedAt: true, status: true,
      },
    }),
  ])

  const isEmpty = totalIssued === 0 && templateCount === 0

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-7">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Welcome, {session.name.split(' ')[0]}.
            </h1>
            <p className="text-sm text-ink-mute mt-1.5">
              {session.institutionName} · {session.role.toLowerCase()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/templates/new"
              className="inline-flex items-center gap-2 border border-border-soft hover:border-brand/50 hover:text-brand text-sm font-bold px-4 py-2.5 rounded-lg transition-colors focus-ring"
            >
              <FileText className="w-4 h-4" />
              New template
            </Link>
            <Link
              href="/certificates/issue"
              className="inline-flex items-center gap-2 bg-brand text-bg text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
            >
              <Plus className="w-4 h-4" />
              Issue certificates
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon={Award}        label="Total issued"  value={totalIssued} accent="brand" />
          <Kpi icon={ShieldCheck}  label="Active"        value={activeCount} accent="success" />
          <Kpi icon={TrendingUp}   label="Revoked"       value={revokedCount} accent="danger" />
          <Kpi icon={FileText}     label="Templates"     value={templateCount} accent="ink" />
        </div>

        {/* Empty state OR recent issues */}
        {isEmpty ? (
          <div className="bg-bg-card border border-dashed border-border-soft rounded-2xl p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-brand" />
            </div>
            <h2 className="font-serif text-2xl font-bold">Issue your first certificate</h2>
            <p className="text-sm text-ink-mute mt-2 max-w-md mx-auto">
              Three steps: design a template, upload your student list, download the signed PDFs.
              Every certificate gets its own verification page in seconds.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link
                href="/templates/new"
                className="inline-flex items-center gap-2 bg-brand text-bg font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
              >
                Create template
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">Recent certificates</h2>
              <Link
                href="/certificates"
                className="text-xs font-bold text-brand hover:underline focus-ring rounded"
              >
                See all →
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {recent.map(c => (
                <li key={c.id} className="px-5 py-3 hover:bg-bg-soft/40 transition-colors">
                  <Link href={`/certificates/${c.id}`} className="flex items-center gap-4 focus-ring rounded">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{c.recipientName}</div>
                      <div className="text-xs text-ink-mute truncate">
                        {c.course ?? '—'} · {new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-ink-dim shrink-0">{c.id}</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                      c.status === 'ACTIVE'
                        ? 'text-success border-success/30 bg-success/10'
                        : 'text-danger border-danger/30 bg-danger/10'
                    }`}>
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, accent }: {
  icon: typeof Award; label: string; value: number
  accent: 'brand' | 'success' | 'danger' | 'ink'
}) {
  const accentMap = {
    brand:   { text: 'text-brand',   bg: 'bg-brand/10',   border: 'border-brand/20' },
    success: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    danger:  { text: 'text-danger',  bg: 'bg-danger/10',  border: 'border-danger/20' },
    ink:     { text: 'text-ink-mute', bg: 'bg-bg-soft', border: 'border-border' },
  }[accent]
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentMap.bg} ${accentMap.border} border`}>
        <Icon className={`w-5 h-5 ${accentMap.text}`} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-black tracking-tight">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">{label}</div>
      </div>
    </div>
  )
}
