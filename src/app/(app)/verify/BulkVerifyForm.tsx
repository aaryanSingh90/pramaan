'use client'

import { useActionState, useMemo, useState } from 'react'
import {
  AlertCircle, Loader2, ShieldCheck, ShieldX, AlertTriangle, ScanLine,
  Clock, Download, RotateCcw, Search,
} from 'lucide-react'
import { clsx } from 'clsx'
import { bulkVerifyAction, type BulkState } from './actions'
import type { BulkVerifyRow, VerdictKind } from '@/lib/verify'

const VERDICT_STYLE: Record<VerdictKind, { label: string; cls: string; icon: typeof ShieldCheck }> = {
  VALID:     { label: 'Valid',     cls: 'text-success border-success/30 bg-success/10',   icon: ShieldCheck },
  REVOKED:   { label: 'Revoked',   cls: 'text-danger  border-danger/30  bg-danger/10',    icon: ShieldX },
  EXPIRED:   { label: 'Expired',   cls: 'text-warn    border-warn/30    bg-warn/10',      icon: Clock },
  TAMPERED:  { label: 'Tampered',  cls: 'text-danger  border-danger/30  bg-danger/10',    icon: AlertTriangle },
  NOT_FOUND: { label: 'Not found', cls: 'text-ink-mute border-border-soft bg-bg-soft',    icon: AlertCircle },
  THROTTLED: { label: 'Throttled', cls: 'text-warn    border-warn/30    bg-warn/10',      icon: Clock },
}

export function BulkVerifyForm() {
  const [state, action, pending] = useActionState<BulkState | null, FormData>(bulkVerifyAction, null)
  const [filter, setFilter] = useState<VerdictKind | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [resetKey, setResetKey] = useState(0)

  const rows = state?.rows ?? []
  const counts = useMemo(() => tally(rows), [rows])

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filter !== 'ALL' && r.status !== filter) return false
      if (search) {
        const q = search.toLowerCase()
        if (![r.queriedId, r.recipientName, r.institutionName, r.course]
              .filter(Boolean)
              .some(s => s!.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [rows, filter, search])

  function downloadCsv() {
    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `pramaan-verify-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Result view ─────────────────────────────────────────────────────────
  if (state?.rows) {
    return (
      <div className="space-y-5">
        {/* Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <Counter active={filter === 'ALL'}      onClick={() => setFilter('ALL')}       label="All"       value={rows.length} accent="ink" />
          {(['VALID', 'REVOKED', 'EXPIRED', 'TAMPERED', 'NOT_FOUND', 'THROTTLED'] as const).map(k => (
            counts[k] > 0
              ? <Counter
                  key={k}
                  active={filter === k}
                  onClick={() => setFilter(k)}
                  label={VERDICT_STYLE[k].label}
                  value={counts[k]}
                  accent={
                    k === 'VALID'   ? 'success'
                  : k === 'REVOKED' || k === 'TAMPERED' ? 'danger'
                  : k === 'EXPIRED' || k === 'THROTTLED' ? 'warn'
                                                      : 'ink-mute'
                  }
                />
              : null
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-ink-dim absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter results by name, institution, ID…"
              className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring focus:border-brand/60 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 bg-brand text-bg font-bold px-4 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring text-sm"
          >
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => { setResetKey(k => k + 1); setFilter('ALL'); setSearch(''); }}
            className="inline-flex items-center gap-1.5 border border-border-soft hover:border-brand/50 hover:text-brand font-bold px-4 py-2 rounded-lg transition-colors focus-ring text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            New batch
          </button>
        </div>

        {/* Results table */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-bg-soft border-b border-border text-left">
                  <Th>Verdict</Th>
                  <Th>Certificate ID</Th>
                  <Th>Recipient</Th>
                  <Th>Issued by</Th>
                  <Th>Course</Th>
                  <Th>Issued</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-dim">
                      No rows match your filter.
                    </td>
                  </tr>
                ) : filteredRows.map((r, i) => {
                  const st = VERDICT_STYLE[r.status]
                  return (
                    <tr key={i} className="border-b border-border last:border-b-0 hover:bg-bg-soft/30 transition-colors align-top">
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border', st.cls)}>
                          <st.icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-mute">{r.queriedId}</td>
                      <td className="px-4 py-3">{r.recipientName ?? em()}</td>
                      <td className="px-4 py-3 text-ink-mute">{r.institutionName ?? em()}</td>
                      <td className="px-4 py-3 text-ink-mute">{r.course ?? em()}</td>
                      <td className="px-4 py-3 text-ink-mute text-xs whitespace-nowrap">{r.issuedOn ?? em()}</td>
                      <td className="px-4 py-3 text-[11px] text-ink-mute max-w-[260px]">{r.notes ?? em()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Input form ─────────────────────────────────────────────────────────
  return (
    <form key={resetKey} action={action} className="space-y-4">
      <label className="block">
        <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Certificate IDs</span>
        <textarea
          name="raw"
          rows={10}
          required
          placeholder={`jkjq2vszema6\nbp9zd4sje35x\nhttps://pramaan.in/v/468jugwfjk7e`}
          className="mt-1.5 w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors focus:border-brand/60 font-mono text-sm resize-y"
        />
        <span className="text-[10px] text-ink-dim mt-1.5 block">
          One per line. Paste raw IDs or full <code className="font-mono text-ink">/v/&lt;id&gt;</code> URLs — we'll extract the ID. Max 200 per batch.
        </span>
      </label>

      {state?.error && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 bg-brand text-bg font-bold py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
        {pending ? 'Verifying…' : 'Verify all'}
      </button>
    </form>
  )
}

// ─── Bits & pieces ────────────────────────────────────────────────────────

function tally(rows: BulkVerifyRow[]): Record<VerdictKind, number> {
  const out: Record<VerdictKind, number> = {
    VALID: 0, REVOKED: 0, EXPIRED: 0, TAMPERED: 0, NOT_FOUND: 0, THROTTLED: 0,
  }
  for (const r of rows) out[r.status]++
  return out
}

function toCsv(rows: BulkVerifyRow[]): string {
  const header = ['Certificate ID', 'Status', 'Recipient', 'Issued by', 'Course', 'Issued on', 'Notes']
  const esc = (s: string | null | undefined) => {
    const v = (s ?? '').replace(/"/g, '""')
    return /[",\n]/.test(v) ? `"${v}"` : v
  }
  const body = rows.map(r => [
    r.queriedId, r.status, r.recipientName, r.institutionName, r.course, r.issuedOn, r.notes,
  ].map(esc).join(','))
  return [header.join(','), ...body].join('\n')
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-ink-mute whitespace-nowrap">{children}</th>
}

function em() {
  return <span className="text-ink-dim italic">—</span>
}

function Counter({
  label, value, accent, active, onClick,
}: {
  label: string; value: number
  accent: 'success' | 'danger' | 'warn' | 'ink-mute' | 'ink'
  active: boolean
  onClick: () => void
}) {
  const color =
    accent === 'success'  ? 'text-success border-success/30 bg-success/5' :
    accent === 'danger'   ? 'text-danger  border-danger/30  bg-danger/5'  :
    accent === 'warn'     ? 'text-warn    border-warn/30    bg-warn/5'    :
    accent === 'ink-mute' ? 'text-ink-mute border-border-soft bg-bg-soft' :
                            'text-ink     border-border     bg-bg-card'
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold transition-colors focus-ring',
        color,
        active ? 'ring-2 ring-brand/60' : 'opacity-80 hover:opacity-100',
      )}
    >
      {label} <span className="font-mono font-black">{value}</span>
    </button>
  )
}
