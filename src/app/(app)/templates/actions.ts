'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import type { FieldPlacement } from '@/lib/pdf'

export interface TemplateState {
  error?: string
  ok?:    boolean
}

const fieldSchema = z.object({
  key:       z.string().min(1).max(40),
  label:     z.string().max(60).optional(),
  text:      z.string().max(200).optional(),
  xNorm:     z.number().min(0).max(1),
  yNorm:     z.number().min(0).max(1),
  fontSize:  z.number().min(6).max(120).optional(),
  font:      z.enum(['serif', 'sans', 'mono']).optional(),
  align:     z.enum(['left', 'center', 'right']).optional(),
  color:     z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  bold:      z.boolean().optional(),
})

// ─── Save the editor's full state ──────────────────────────────────────────

const saveSchema = z.object({
  id:           z.string().min(1),
  name:         z.string().min(2).max(80),
  pageWidth:    z.number().int().min(200).max(3000).optional(),
  pageHeight:   z.number().int().min(200).max(3000).optional(),
  fields:       z.array(fieldSchema).max(40),
})

export async function saveTemplateAction(formData: FormData): Promise<TemplateState> {
  try {
    const session = await requireSession()
    const raw = {
      id:         String(formData.get('id') ?? ''),
      name:       String(formData.get('name') ?? '').trim(),
      pageWidth:  Number(formData.get('pageWidth')  ?? 842),
      pageHeight: Number(formData.get('pageHeight') ?? 595),
      fields:     JSON.parse(String(formData.get('fields') ?? '[]')) as FieldPlacement[],
    }
    const parsed = saveSchema.safeParse(raw)
    if (!parsed.success) return { error: 'Some field values are invalid. Try again.' }

    const owned = await db.template.findUnique({
      where: { id: parsed.data.id }, select: { institutionId: true },
    })
    if (!owned || owned.institutionId !== session.institutionId) {
      return { error: 'Template not found.' }
    }

    await db.template.update({
      where: { id: parsed.data.id },
      data: {
        name:       parsed.data.name,
        pageWidth:  parsed.data.pageWidth,
        pageHeight: parsed.data.pageHeight,
        fields:     parsed.data.fields as never,
      },
    })

    revalidatePath('/templates')
    revalidatePath(`/templates/${parsed.data.id}`)
    return { ok: true }
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    console.error('[saveTemplate]', err)
    return { error: 'Could not save template.' }
  }
}

// ─── Upload background image (stored as base64 in the DB for MVP) ──────────

export async function uploadBackgroundAction(formData: FormData): Promise<TemplateState> {
  try {
    const session = await requireSession()
    const id   = String(formData.get('id') ?? '')
    const file = formData.get('file')
    if (!(file instanceof File) || !id) return { error: 'No file or template id supplied.' }

    if (file.size > 4 * 1024 * 1024) {
      return { error: 'Image too large. Keep it under 4 MB (try compressing a PNG or saving as JPEG).' }
    }
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      return { error: 'Only PNG or JPEG images are supported.' }
    }

    const owned = await db.template.findUnique({
      where: { id }, select: { institutionId: true },
    })
    if (!owned || owned.institutionId !== session.institutionId) {
      return { error: 'Template not found.' }
    }

    const buf = Buffer.from(await file.arrayBuffer())
    const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`

    await db.template.update({
      where: { id }, data: { backgroundUrl: dataUrl },
    })
    revalidatePath(`/templates/${id}`)
    return { ok: true }
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    console.error('[uploadBackground]', err)
    return { error: 'Could not upload background image.' }
  }
}

// ─── Archive (soft delete) ─────────────────────────────────────────────────

export async function archiveTemplateAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const owned = await db.template.findUnique({
    where: { id }, select: { institutionId: true },
  })
  if (!owned || owned.institutionId !== session.institutionId) return
  await db.template.update({ where: { id }, data: { archivedAt: new Date() } })
  revalidatePath('/templates')
  redirect('/templates')
}
