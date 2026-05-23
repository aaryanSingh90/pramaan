'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { loginAction, type ActionState } from '../actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState<ActionState | null, FormData>(loginAction, null)
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-bg grain-bg">
      <div className="w-full max-w-md bg-bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 p-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-7 focus-ring rounded-md">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-bg" />
          </div>
          <div>
            <div className="font-black tracking-tight">Pramaan</div>
            <div className="text-[10px] uppercase tracking-widest text-brand font-bold">Welcome back</div>
          </div>
        </Link>

        <h1 className="font-serif text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-ink-mute mt-2">Continue to your institution dashboard.</p>

        <form action={action} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              className="mt-1.5 w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors focus:border-brand/60"
              placeholder="you@institute.edu"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1.5 w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors focus:border-brand/60"
              placeholder="••••••••"
            />
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
            className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-brand text-bg font-bold py-3 rounded-lg hover:bg-brand-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-ink-mute">
          New to Pramaan?{' '}
          <Link href="/signup" className="text-brand font-semibold hover:underline focus-ring rounded">
            Create an institution
          </Link>
        </p>
      </div>
    </main>
  )
}
