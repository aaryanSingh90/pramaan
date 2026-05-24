import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ArrowLeft, Download, ExternalLink, RotateCcw, ShieldCheck, ShieldX,
  User, Mail, BookOpen, Clock, Calendar, Building2, FileText, Send,
  CheckCircle, AlertCircle, MinusCircle,
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { revokeAction, resendEmailAction } from '../actions'

interface PageProps { params: Promise<{ id: string }> }

export default async function CertificateDetail({ params }: PageProps) {
  const { id } = await params
  const session = (await getSession())!
  const cert = await db.certificate.findUnique({
    where: { id },
    include: {
      template: { select: { id: true, name: true } },
      emailLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!cert) notFound()
  // Ownership guard — managers from one institution can't open another's certificates.
  if (cert.institutionId !== session.institutionId) redirect('/certificates')

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/v/${cert.id}`

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        <Link
          href="/certificates"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute uppercase tracking-widest hover:text-brand transition-colors focus-ring rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All certificates
        </Link>

        {/* Header card */}
        <header className="bg-bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-serif text-3xl font-bold tracking-tight truncate">{cert.recipientName}</h1>
              <p className="text-sm text-ink-mute mt-1">{cert.course ?? cert.competitionName ?? 'Certificate'}</p>
              <p className="text-[11px] font-mono text-ink-dim mt-2 tracking-widest">{cert.id}</p>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${
              cert.status === 'ACTIVE'
                ? 'text-success border-success/30 bg-success/10'
                : 'text-danger border-danger/30 bg-danger/10'
            }`}>
              {cert.status === 'ACTIVE' ? (
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Active</span>
              ) : (
                <span className="inline-flex items-center gap-1"><ShieldX className="w-3 h-3" /> Revoked</span>
              )}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <a
              href={`/api/certificates/${cert.id}/pdf`}
              target="_blank"
              className="inline-flex items-center gap-1.5 bg-brand text-bg text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </a>
            <Link
              href={`/v/${cert.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 border border-border-soft hover:border-brand/50 hover:text-brand text-sm font-bold px-4 py-2 rounded-lg transition-colors focus-ring"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open verify page
            </Link>
            {cert.status === 'ACTIVE' && (
              <form action={revokeAction} className="inline-block">
                <input type="hidden" name="id" value={cert.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 border border-danger/40 text-danger hover:bg-danger/10 text-sm font-bold px-4 py-2 rounded-lg transition-colors focus-ring"
                  // No native confirm() — minimum viable; full dialog comes in Phase 3.
                  formAction={revokeAction}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Revoke
                </button>
              </form>
            )}
          </div>

          {cert.status === 'REVOKED' && cert.revokeReason && (
            <div className="mt-5 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-danger mb-1">Revoke reason</div>
              <p className="text-ink">{cert.revokeReason}</p>
              {cert.revokedAt && <p className="text-xs text-ink-dim mt-1">on {format(cert.revokedAt, 'd MMM yyyy, h:mm a')}</p>}
            </div>
          )}
        </header>

        {/* Detail card */}
        <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <header className="px-5 py-3 border-b border-border">
            <h2 className="font-bold">Certificate data</h2>
          </header>
          <dl className="divide-y divide-border">
            <Row icon={User}      label="Recipient name"     value={cert.recipientName} />
            {cert.recipientEmail && <Row icon={Mail} label="Recipient email" value={cert.recipientEmail} />}
            {cert.course          && <Row icon={BookOpen} label="Course"          value={cert.course} />}
            {cert.competitionName && <Row icon={BookOpen} label="Competition"     value={cert.competitionName} />}
            {cert.duration        && <Row icon={Clock}    label="Duration"        value={cert.duration} />}
            {cert.grade           && <Row icon={ShieldCheck} label="Grade / Result" value={cert.grade} />}
            <Row icon={Calendar} label="Issued on" value={format(cert.issuedAt, 'd MMMM yyyy')} />
            {cert.validUntil      && <Row icon={Calendar} label="Valid until" value={format(cert.validUntil, 'd MMMM yyyy')} />}
            {cert.template        && <Row icon={FileText} label="Template" value={cert.template.name} />}
            <Row icon={Building2} label="Institution"        value={session.institutionName} />
          </dl>
          <footer className="px-5 py-3 border-t border-border bg-bg-soft/30 text-[11px] text-ink-mute">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold uppercase tracking-wider text-ink-dim text-[10px]">Verify URL</span>
              <code className="font-mono text-ink break-all">{verifyUrl}</code>
            </div>
          </footer>
        </section>

        {/* Email delivery */}
        <EmailPanel
          certId={cert.id}
          recipientEmail={cert.recipientEmail}
          logs={cert.emailLogs}
        />
      </div>
    </div>
  )
}

function EmailPanel({
  certId, recipientEmail, logs,
}: {
  certId: string
  recipientEmail: string | null
  logs: Array<{
    id: string
    toEmail: string
    subject: string
    status: 'SENT' | 'FAILED' | 'SKIPPED'
    providerId: string | null
    errorMessage: string | null
    trigger: 'AUTO' | 'MANUAL_RESEND'
    createdAt: Date
  }>
}) {
  const lastSent = logs.find(l => l.status === 'SENT')

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <header className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Mail className="w-4 h-4 text-brand shrink-0" />
          <h2 className="font-bold truncate">Email delivery</h2>
        </div>
        {recipientEmail && (
          <form action={resendEmailAction} className="inline-block shrink-0">
            <input type="hidden" name="id" value={certId} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-bold border border-border-soft hover:border-brand/50 hover:text-brand px-3 py-1.5 rounded-md transition-colors focus-ring"
            >
              <Send className="w-3 h-3" />
              {lastSent ? 'Resend' : 'Send'}
            </button>
          </form>
        )}
      </header>

      {!recipientEmail ? (
        <div className="px-5 py-6 text-center">
          <MinusCircle className="w-6 h-6 text-ink-dim mx-auto mb-2" />
          <p className="text-sm text-ink-mute">No recipient email on file — nothing to deliver.</p>
          <p className="text-[11px] text-ink-dim mt-1">Add an email when issuing the certificate to automate delivery.</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <Send className="w-6 h-6 text-ink-dim mx-auto mb-2" />
          <p className="text-sm text-ink-mute">No emails sent yet for this certificate.</p>
          <p className="text-[11px] text-ink-dim mt-1">Click <strong>Send</strong> above to dispatch the PDF + verify URL to <strong className="text-ink">{recipientEmail}</strong>.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map(log => {
            const icon =
              log.status === 'SENT'   ? <CheckCircle className="w-4 h-4 text-success" /> :
              log.status === 'FAILED' ? <AlertCircle className="w-4 h-4 text-danger" /> :
                                        <MinusCircle className="w-4 h-4 text-ink-dim" />
            const statusColor =
              log.status === 'SENT'   ? 'text-success' :
              log.status === 'FAILED' ? 'text-danger'  :
                                        'text-ink-mute'
            return (
              <li key={log.id} className="px-5 py-3 flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${statusColor}`}>{log.status}</span>
                    <span className="text-[10px] text-ink-dim uppercase tracking-wider">
                      · {log.trigger === 'AUTO' ? 'Auto' : 'Manual resend'}
                    </span>
                    <span className="text-[10px] text-ink-dim ml-auto">
                      {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-ink mt-0.5 truncate">{log.subject}</p>
                  <p className="text-[11px] text-ink-mute mt-0.5">
                    to <span className="font-mono">{log.toEmail || '—'}</span>
                  </p>
                  {log.errorMessage && (
                    <p className="text-[11px] text-danger mt-1">{log.errorMessage}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <footer className="px-5 py-2.5 border-t border-border bg-bg-soft/30 text-[10px] text-ink-dim uppercase tracking-wider font-bold">
        Showing last {logs.length === 0 ? 0 : logs.length} attempt{logs.length === 1 ? '' : 's'}
      </footer>
    </section>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="px-5 py-3 grid grid-cols-[180px_1fr] items-center gap-3">
      <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-mute">
        <Icon className="w-3.5 h-3.5 text-brand" />
        {label}
      </dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
