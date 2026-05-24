'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RotateCw } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Top-level error boundary. Catches anything thrown inside the React tree
 * (server or client) that we didn't handle ourselves. Logs the digest so
 * institutions can quote it to support; never exposes the underlying error
 * message to the user since it may contain implementation detail.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[error.tsx]', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-danger/10 border border-danger/30 flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-danger" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-ink-mute mt-3 leading-relaxed">
          Pramaan hit an unexpected error rendering this page. We've logged it. You can retry, or
          jump back to your dashboard.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-ink-dim mt-4 tracking-widest">
            Error reference · {error.digest}
          </p>
        )}
        <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-brand text-bg font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
          >
            <RotateCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border border-border-soft hover:border-brand/50 hover:text-brand font-bold px-4 py-2.5 rounded-lg transition-colors focus-ring"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
