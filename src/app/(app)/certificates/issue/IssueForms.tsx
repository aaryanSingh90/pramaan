'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Loader2, CheckCircle, Download, Eye, RotateCcw } from 'lucide-react'
import { issueSingleAction, issueBulkAction, type IssueState } from '../actions'

interface Template { id: string; name: string }

// ─── Single ─────────────────────────────────────────────────────────────────

function SingleForm({ templates }: { templates: Template[] }) {
  const [state, action, pending] = useActionState<IssueState | null, FormData>(issueSingleAction, null)

  // Reset key forces the form to remount + clear after a successful issue.
  const [resetKey, setResetKey] = useState(0)

  if (state?.createdId) {
    return <Success id={state.createdId} onAnother={() => { setResetKey(k => k + 1); window.history.replaceState(null, '', window.location.pathname) }} />
  }

  return (
    <form key={resetKey} action={action} className="space-y-3">
      {templates.length > 0 && (
        <Select label="Template (optional)" name="templateId" defaultValue="">
          <option value="">— No template, use default design —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}
      <Field
        label="Recipient name"
        name="recipientName"
        placeholder="e.g. Priya Sharma"
        required
        error={state?.fieldErrors?.recipientName}
      />
      <Field
        label="Recipient email"
        name="recipientEmail"
        type="email"
        placeholder="optional — we'll mail them their certificate"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Course" name="course" placeholder="e.g. Advanced Mathematics" />
        <Field label="Competition" name="competitionName" placeholder="or competition name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration" name="duration" placeholder="e.g. 12 weeks" />
        <Field label="Grade / Result" name="grade" placeholder="A+ / Winner / etc." />
      </div>
      <Field
        label="Valid until"
        name="validUntil"
        type="date"
        placeholder="optional expiry"
      />

      {state?.error && (
        <Alert>{state.error}</Alert>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-brand text-bg font-bold py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? 'Issuing…' : 'Issue certificate'}
      </button>
    </form>
  )
}

// ─── Bulk ───────────────────────────────────────────────────────────────────

function BulkForm({ templates }: { templates: Template[] }) {
  const [state, action, pending] = useActionState<IssueState | null, FormData>(issueBulkAction, null)
  const [resetKey, setResetKey] = useState(0)

  if (state?.createdCount) {
    return (
      <BulkSuccess
        count={state.createdCount}
        emailsSent={state.emailsSent ?? 0}
        onAnother={() => { setResetKey(k => k + 1); window.history.replaceState(null, '', window.location.pathname) }}
      />
    )
  }

  return (
    <form key={resetKey} action={action} className="space-y-3">
      {templates.length > 0 && (
        <Select label="Template (optional)" name="templateId" defaultValue="">
          <option value="">— No template, use default design —</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      )}

      <label className="block">
        <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Recipients</span>
        <textarea
          name="rows"
          rows={10}
          required
          placeholder={`Priya Sharma\tAdvanced Mathematics\t12 weeks\tpriya@dit.edu.in\nArjun Singh\tData Structures\t8 weeks\narjun@dit.edu.in\nAnjali Patel\tMachine Learning\t16 weeks`}
          className="mt-1.5 w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors focus:border-brand/60 font-mono text-sm resize-y"
        />
        <span className="text-[10px] text-ink-dim mt-1.5 block">
          One per line. Tab or comma separates columns: <strong>Name · Course · Duration · Email</strong>.
          Name is required. Email is optional — if present, the certificate is mailed automatically.
        </span>
      </label>

      {state?.error && <Alert>{state.error}</Alert>}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-1 inline-flex items-center justify-center gap-2 bg-brand text-bg font-bold py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending && <Loader2 className="w-4 h-4 animate-spin" />}
        {pending ? 'Issuing…' : 'Issue all'}
      </button>
    </form>
  )
}

// ─── Success states ─────────────────────────────────────────────────────────

function Success({ id, onAnother }: { id: string; onAnother: () => void }) {
  return (
    <div className="rounded-xl bg-success/5 border border-success/40 p-5 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-3">
        <CheckCircle className="w-6 h-6 text-success" />
      </div>
      <h3 className="font-bold text-lg">Certificate issued</h3>
      <p className="text-xs text-ink-mute mt-1">
        ID <span className="font-mono text-ink">{id}</span>
      </p>
      <div className="mt-5 flex justify-center gap-2 flex-wrap">
        <Link
          href={`/v/${id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 border border-border-soft hover:border-brand/50 hover:text-brand text-sm font-bold px-3.5 py-2 rounded-lg transition-colors focus-ring"
        >
          <Eye className="w-3.5 h-3.5" />
          View verify page
        </Link>
        <a
          href={`/api/certificates/${id}/pdf`}
          className="inline-flex items-center gap-1.5 bg-brand text-bg text-sm font-bold px-3.5 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
        >
          <Download className="w-3.5 h-3.5" />
          Download PDF
        </a>
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-mute hover:text-ink px-3.5 py-2 rounded-lg transition-colors focus-ring"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Issue another
        </button>
      </div>
    </div>
  )
}

function BulkSuccess({ count, emailsSent, onAnother }: { count: number; emailsSent: number; onAnother: () => void }) {
  return (
    <div className="rounded-xl bg-success/5 border border-success/40 p-5 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-success/15 flex items-center justify-center mb-3">
        <CheckCircle className="w-6 h-6 text-success" />
      </div>
      <h3 className="font-bold text-lg">{count} certificate{count !== 1 ? 's' : ''} issued</h3>
      <p className="text-xs text-ink-mute mt-1">
        {emailsSent > 0
          ? <>Emails sent to <strong className="text-ink">{emailsSent}</strong> recipient{emailsSent !== 1 ? 's' : ''}. Rest are in the Certificates list to download manually.</>
          : 'Find them in the Certificates list to download.'}
      </p>
      <div className="mt-5 flex justify-center gap-2 flex-wrap">
        <Link
          href="/certificates"
          className="inline-flex items-center gap-1.5 bg-brand text-bg text-sm font-bold px-3.5 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
        >
          See certificates
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-mute hover:text-ink px-3.5 py-2 rounded-lg transition-colors focus-ring"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Issue another batch
        </button>
      </div>
    </div>
  )
}

// ─── Field primitives ─────────────────────────────────────────────────────

function Field({
  label, name, error, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">{label}</span>
      <input
        name={name}
        {...props}
        className={`mt-1.5 w-full px-3.5 py-2.5 bg-bg border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors text-sm ${
          error ? 'border-danger/60' : 'border-border focus:border-brand/60'
        }`}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

function Select({
  label, name, defaultValue, children,
}: { label: string; name: string; defaultValue?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1.5 w-full px-3 py-2.5 bg-bg border border-border rounded-lg text-ink focus-ring transition-colors focus:border-brand/60 text-sm cursor-pointer"
      >
        {children}
      </select>
    </label>
  )
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {children}
    </div>
  )
}

export const IssueForms = { Single: SingleForm, Bulk: BulkForm }
