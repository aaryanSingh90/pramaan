'use client'

import { useActionState, useState } from 'react'
import { format } from 'date-fns'
import {
  Key, Plus, Trash2, AlertCircle, Loader2, Copy, Check, ShieldAlert, X,
} from 'lucide-react'
import { createApiKeyAction, revokeApiKeyAction, type ApiKeyState } from './actions'

interface ApiKey {
  id:         string
  name:       string
  keyPreview: string
  lastUsedAt: Date | null
  createdAt:  Date
}

export function ApiKeysPanel({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [state, action, pending] = useActionState<ApiKeyState | null, FormData>(createApiKeyAction, null)
  const [showForm, setShowForm]   = useState(false)
  const [showRevoke, setRevoke]   = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)
  const justCreated = state?.plaintext

  function copyToClipboard(s: string) {
    void navigator.clipboard.writeText(s)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <Key className="w-4 h-4 text-brand" />
          <h2 className="font-bold">API keys</h2>
          <span className="text-[11px] text-ink-dim font-mono">· {apiKeys.length}</span>
        </div>
        {!justCreated && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-brand text-bg text-xs font-bold px-3 py-1.5 rounded-md hover:bg-brand-400 transition-colors focus-ring"
          >
            <Plus className="w-3.5 h-3.5" /> New key
          </button>
        )}
      </header>

      {/* Just-created — show plaintext ONCE */}
      {justCreated && (
        <div className="px-5 py-4 border-b border-border bg-success/5">
          <h3 className="text-sm font-bold text-success flex items-center gap-2">
            <Key className="w-4 h-4" /> Key created — copy it now
          </h3>
          <p className="text-xs text-ink-mute mt-1">
            <strong>{state.createdName}</strong> · We don't store the plaintext, so this is the only time you'll see it. If you lose it, mint a new one.
          </p>
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-bg border border-success/40 rounded-lg">
            <code className="flex-1 font-mono text-sm break-all">{state.plaintext}</code>
            <button
              type="button"
              onClick={() => copyToClipboard(state.plaintext!)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold border border-success/40 hover:bg-success/10 text-success px-3 py-1.5 rounded-md transition-colors focus-ring"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showForm && !justCreated && (
        <form action={action} className="px-5 py-4 border-b border-border bg-bg-soft/40 space-y-3">
          <label className="block">
            <span className="text-[10px] font-bold text-ink-mute uppercase tracking-widest">Key label</span>
            <input
              name="name"
              autoFocus
              required
              placeholder="e.g. HR portal · production"
              className="mt-1 w-full px-3 py-2 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring focus:border-brand/60 text-sm"
            />
            <span className="mt-1 block text-[10px] text-ink-dim">
              For your reference only. Pick something you'll remember in 6 months.
            </span>
          </label>
          {state?.error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger">
              <AlertCircle className="w-3.5 h-3.5" />
              {state.error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs font-bold text-ink-mute hover:text-ink px-3 py-1.5 rounded-md transition-colors focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 bg-brand text-bg text-xs font-bold px-3 py-1.5 rounded-md hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {pending ? 'Generating…' : 'Generate key'}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {apiKeys.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Key className="w-6 h-6 text-ink-dim mx-auto mb-2" />
          <p className="text-sm text-ink-mute">No API keys yet.</p>
          <p className="text-[11px] text-ink-dim mt-1 max-w-md mx-auto">
            Generate one to call <code className="font-mono text-ink">POST /api/v1/verify</code> from your HRMS — paste a list of cert IDs, get verdicts back as JSON.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {apiKeys.map(k => (
            <li key={k.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{k.name}</div>
                <div className="text-[11px] font-mono text-ink-dim mt-0.5">{k.keyPreview}</div>
                <div className="text-[10px] text-ink-dim mt-1 uppercase tracking-widest font-bold">
                  Created {format(k.createdAt, 'd MMM yyyy')}
                  {k.lastUsedAt && <> · Last used {format(k.lastUsedAt, 'd MMM yyyy')}</>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevoke(k.id)}
                className="shrink-0 p-1.5 rounded-md text-ink-dim hover:text-danger hover:bg-danger/10 transition-colors focus-ring"
                aria-label={`Revoke ${k.name}`}
                title="Revoke"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <footer className="px-5 py-2.5 border-t border-border bg-bg-soft/30 text-[10px] text-ink-dim uppercase tracking-widest font-bold">
        Up to 20 active keys per institution
      </footer>

      {/* Revoke confirmation modal — single overlay, dismissible by Escape / X / Cancel */}
      {showRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-danger/15 border border-danger/30 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-danger" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Revoke this API key?</h3>
                <p className="text-sm text-ink-mute mt-1.5">
                  Any system using this key will start getting 401 errors immediately. This can't be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevoke(null)}
                aria-label="Close"
                className="text-ink-dim hover:text-ink p-1 focus-ring rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevoke(null)}
                className="text-sm font-bold text-ink-mute hover:text-ink px-4 py-2 rounded-lg transition-colors focus-ring"
              >
                Cancel
              </button>
              <form action={revokeApiKeyAction}>
                <input type="hidden" name="id" value={showRevoke} />
                <button
                  type="submit"
                  onClick={() => setRevoke(null)}
                  className="inline-flex items-center gap-1.5 bg-danger text-bg text-sm font-bold px-4 py-2 rounded-lg hover:bg-danger/90 transition-colors focus-ring"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
