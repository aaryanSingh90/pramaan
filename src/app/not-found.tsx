import Link from 'next/link'
import { FileQuestion, Home, ShieldCheck } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center mb-5">
          <FileQuestion className="w-8 h-8 text-brand" />
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">Not found</h1>
        <p className="text-sm text-ink-mute mt-3 leading-relaxed">
          That URL didn't match a certificate, template, or any other page in Pramaan. Check the
          link for typos. If you're trying to verify a certificate, paste the ID into the home
          page's verify box.
        </p>
        <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-brand text-bg font-bold px-4 py-2.5 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/#verify"
            className="inline-flex items-center gap-2 border border-border-soft hover:border-brand/50 hover:text-brand font-bold px-4 py-2.5 rounded-lg transition-colors focus-ring"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify a certificate
          </Link>
        </div>
      </div>
    </main>
  )
}
