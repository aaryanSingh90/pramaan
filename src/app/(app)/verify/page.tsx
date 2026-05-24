import Link from 'next/link'
import { ArrowLeft, ScanLine } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { BulkVerifyForm } from './BulkVerifyForm'

/**
 * Bulk verification dashboard for the signed-in user (issuer staff or
 * HR-side verifier). Paste a list of certificate IDs, get a verdict per row,
 * download as CSV.
 *
 * Signed-in users skip the 5-per-day anonymous IP throttle and can run up
 * to 200 IDs in one batch.
 */
export default async function VerifyDashboard() {
  // Layout already enforces auth; this is just to keep the type narrow.
  await getSession()

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-7">

        <header>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute uppercase tracking-widest hover:text-brand transition-colors focus-ring rounded mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Bulk verify</h1>
          <p className="text-sm text-ink-mute mt-2 max-w-2xl">
            Paste up to 200 certificate IDs (one per line) to check them all in one go.
            Hand the resulting CSV back to your HR team or recruitment lead.
          </p>
        </header>

        <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
          <header className="px-5 py-4 border-b border-border flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/30 flex items-center justify-center shrink-0">
              <ScanLine className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="font-bold">Verify a list</h2>
              <p className="text-[11px] text-ink-mute mt-0.5">
                IDs can be just the code (<code className="font-mono text-ink">abc123def456</code>) or full URLs (<code className="font-mono text-ink">https://pramaan.in/v/abc123def456</code>) — we'll extract the ID.
              </p>
            </div>
          </header>
          <div className="p-5">
            <BulkVerifyForm />
          </div>
        </section>
      </div>
    </div>
  )
}
