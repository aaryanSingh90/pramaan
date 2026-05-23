'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { signupAction, type ActionState } from '../actions'

export default function SignupPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(signupAction, null)
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg grain-bg">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 p-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-7 focus-ring rounded-md">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-bg" />
          </div>
          <div>
            <div className="font-black tracking-tight">Pramaan</div>
            <div className="text-[10px] uppercase tracking-widest text-brand font-bold">Start issuing</div>
          </div>
        </Link>

        <h1 className="font-serif text-3xl font-bold tracking-tight">Create your institution</h1>
        <p className="text-sm text-ink-mute mt-2">
          Free 14-day trial. No card required.
        </p>

        <form action={action} className="mt-7 space-y-4">
          <Field
            label="Institution name"
            name="institutionName"
            placeholder="e.g. Delhi Institute of Technology"
            error={state?.fieldErrors?.institutionName}
            required
          />
          <Field
            label="Your name"
            name="name"
            placeholder="As it should appear on certificates"
            error={state?.fieldErrors?.name}
            required
          />
          <Field
            label="Work email"
            name="email"
            type="email"
            placeholder="you@institute.edu"
            error={state?.fieldErrors?.email}
            required
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            error={state?.fieldErrors?.password}
            required
            autoComplete="new-password"
          />

          {state?.error && !state.fieldErrors && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/10 border border-danger/30 rounded-lg text-sm text-danger">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-brand text-bg font-bold py-3 rounded-lg hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {pending ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-ink-mute">
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-semibold hover:underline focus-ring rounded">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

function Field({
  label, name, error, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">{label}</span>
      <input
        name={name}
        {...props}
        className={`mt-1.5 w-full px-3.5 py-2.5 bg-bg border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors ${
          error ? 'border-danger/60' : 'border-border focus:border-brand/60'
        }`}
      />
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}
