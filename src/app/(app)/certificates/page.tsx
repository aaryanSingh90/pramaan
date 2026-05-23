import Link from 'next/link'
import { Plus, Award, ChevronRight, Search } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function CertificatesPage({ searchParams }: PageProps) {
  const session = (await getSession())!
  const { q, status } = await searchParams

  const where: Prisma.CertificateWhereInput = {
    institutionId: session.institutionId,
    ...(status === 'active'  && { status: 'ACTIVE' as const }),
    ...(status === 'revoked' && { status: 'REVOKED' as const }),
    ...(q && {
      OR: [
        { recipientName:  { contains: q, mode: 'insensitive' as const } },
        { course:         { contains: q, mode: 'insensitive' as const } },
        { recipientEmail: { contains: q, mode: 'insensitive' as const } },
        { id:             { contains: q, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [certs, total] = await Promise.all([
    db.certificate.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      take: 100,
      select: {
        id: true, recipientName: true, recipientEmail: true, course: true,
        issuedAt: true, status: true, duration: true,
      },
    }),
    db.certificate.count({ where: { institutionId: session.institutionId } }),
  ])

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-6">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Certificates</h1>
            <p className="text-sm text-ink-mute mt-1.5">{total} certificate{total !== 1 ? 's' : ''} issued by {session.institutionName}.</p>
          </div>
          <Link
            href="/certificates/issue"
            className="inline-flex items-center gap-2 bg-brand text-bg text-sm font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
          >
            <Plus className="w-4 h-4" />
            Issue new
          </Link>
        </header>

        {/* Filters */}
        <form action="/certificates" method="get" className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search by name, course, email, or ID…"
              className="w-full pl-9 pr-3 py-2 bg-bg-card border border-border rounded-lg text-ink placeholder-ink-dim focus-ring focus:border-brand/60 text-sm"
            />
          </div>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="px-3 py-2 bg-bg-card border border-border rounded-lg text-ink focus-ring focus:border-brand/60 text-sm cursor-pointer"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="revoked">Revoked</option>
          </select>
          <button
            type="submit"
            className="bg-bg-card border border-border-soft hover:border-brand/50 hover:text-brand font-bold px-4 py-2 rounded-lg text-sm transition-colors focus-ring"
          >
            Filter
          </button>
        </form>

        {/* Results */}
        {certs.length === 0 ? (
          <EmptyState searched={!!q || !!status} />
        ) : (
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-soft border-b border-border text-left">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink-mute">Recipient</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink-mute">Course</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink-mute">Issued</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink-mute">ID</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink-mute">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {certs.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-bg-soft/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold">{c.recipientName}</div>
                      {c.recipientEmail && <div className="text-[11px] text-ink-dim">{c.recipientEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-mute">
                      {c.course ?? <span className="text-ink-dim italic">—</span>}
                      {c.duration && <div className="text-[11px] text-ink-dim">{c.duration}</div>}
                    </td>
                    <td className="px-4 py-3 text-ink-mute text-xs">
                      {new Date(c.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink-dim">{c.id}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        c.status === 'ACTIVE'
                          ? 'text-success border-success/30 bg-success/10'
                          : 'text-danger border-danger/30 bg-danger/10'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/certificates/${c.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline focus-ring rounded"
                      >
                        Open
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ searched }: { searched: boolean }) {
  return (
    <div className="bg-bg-card border border-dashed border-border-soft rounded-2xl p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
        <Award className="w-6 h-6 text-brand" />
      </div>
      <h2 className="font-serif text-2xl font-bold">
        {searched ? 'No certificates match' : 'No certificates yet'}
      </h2>
      <p className="text-sm text-ink-mute mt-2 max-w-md mx-auto">
        {searched
          ? 'Try a broader search, or clear the filters.'
          : 'Issue your first certificate to start tracking. Single recipient or bulk paste, your choice.'}
      </p>
      <Link
        href="/certificates/issue"
        className="mt-5 inline-flex items-center gap-2 bg-brand text-bg font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
      >
        <Plus className="w-4 h-4" />
        Issue certificates
      </Link>
    </div>
  )
}
