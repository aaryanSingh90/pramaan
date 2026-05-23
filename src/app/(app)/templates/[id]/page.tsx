import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { TemplateEditor } from './TemplateEditor'
import type { FieldPlacement } from '@/lib/pdf'

interface PageProps { params: Promise<{ id: string }> }

export default async function TemplatePage({ params }: PageProps) {
  const { id } = await params
  const session = (await getSession())!
  const tpl = await db.template.findUnique({
    where: { id },
    include: { _count: { select: { certificates: true } } },
  })
  if (!tpl) notFound()
  if (tpl.institutionId !== session.institutionId) redirect('/templates')

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mute uppercase tracking-widest hover:text-brand transition-colors focus-ring rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All templates
        </Link>

        <TemplateEditor
          id={tpl.id}
          initialName={tpl.name}
          initialBackground={tpl.backgroundUrl}
          initialFields={(tpl.fields as unknown as FieldPlacement[]) ?? []}
          initialPageWidth={tpl.pageWidth}
          initialPageHeight={tpl.pageHeight}
          certificatesIssued={tpl._count.certificates}
        />
      </div>
    </div>
  )
}
