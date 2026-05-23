import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Save, Wand2 } from 'lucide-react'
import { requireSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

async function createTemplate(formData: FormData): Promise<void> {
  'use server'
  const session = await requireSession()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return
  await db.template.create({
    data: {
      institutionId: session.institutionId,
      name,
      fields: [],
    },
  })
  revalidatePath('/templates')
  redirect('/templates')
}

export default function NewTemplatePage() {
  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute uppercase tracking-widest hover:text-brand transition-colors focus-ring rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Templates
        </Link>

        <header>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">New template</h1>
          <p className="text-sm text-ink-mute mt-2">
            For now, give the template a name. The full drag-drop background-and-field editor
            ships in the next release — until then, certificates issued under this template
            use the default Pramaan layout.
          </p>
        </header>

        <form action={createTemplate} className="bg-bg-card border border-border rounded-2xl p-6 space-y-4">
          <label className="block">
            <span className="text-xs font-bold text-ink-mute uppercase tracking-wider">Template name</span>
            <input
              name="name"
              autoFocus
              required
              placeholder="e.g. Course Completion 2026 — Spring Term"
              className="mt-1.5 w-full px-3.5 py-2.5 bg-bg border border-border rounded-lg text-ink placeholder-ink-dim focus-ring transition-colors focus:border-brand/60"
            />
          </label>

          <div className="flex items-start gap-2 px-3.5 py-3 rounded-lg bg-brand/5 border border-brand/30 text-xs text-ink-mute">
            <Wand2 className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
            <span>
              Coming next: upload your existing PNG/JPEG certificate design and drag fields
              into place. For now, every certificate uses the parchment-with-saffron-rules
              default — it looks professional even without a custom upload.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/templates"
              className="text-sm font-bold text-ink-mute hover:text-ink px-4 py-2 rounded-lg transition-colors focus-ring"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-brand text-bg text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-400 transition-colors focus-ring"
            >
              <Save className="w-4 h-4" /> Save template
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
