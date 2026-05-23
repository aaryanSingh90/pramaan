'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { newCertificateId, signCertificate } from '@/lib/sign'

const singleSchema = z.object({
  templateId:      z.string().optional(),
  recipientName:   z.string().min(2, 'Recipient name is required'),
  recipientEmail:  z.string().email().optional().or(z.literal('')),
  course:          z.string().optional(),
  duration:        z.string().optional(),
  competitionName: z.string().optional(),
  grade:           z.string().optional(),
  validUntil:      z.string().optional(),     // yyyy-mm-dd
})

export interface IssueState {
  error?:        string
  fieldErrors?:  Record<string, string>
  createdId?:    string
  createdCount?: number
}

export async function issueSingleAction(_prev: IssueState | null, formData: FormData): Promise<IssueState> {
  try {
    const session = await requireSession()
    const parsed = singleSchema.safeParse({
      templateId:      String(formData.get('templateId')      ?? '') || undefined,
      recipientName:   String(formData.get('recipientName')   ?? '').trim(),
      recipientEmail:  String(formData.get('recipientEmail')  ?? '').trim().toLowerCase(),
      course:          String(formData.get('course')          ?? '').trim(),
      duration:        String(formData.get('duration')        ?? '').trim(),
      competitionName: String(formData.get('competitionName') ?? '').trim(),
      grade:           String(formData.get('grade')           ?? '').trim(),
      validUntil:      String(formData.get('validUntil')      ?? '').trim(),
    })
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message
      return { error: 'Please fix the highlighted fields.', fieldErrors }
    }

    const d = parsed.data
    const id = newCertificateId()
    const issuedAt = new Date()
    const signature = signCertificate({
      id,
      institutionId:   session.institutionId,
      recipientName:   d.recipientName,
      course:          d.course || null,
      competitionName: d.competitionName || null,
      issuedAt,
    })

    await db.certificate.create({
      data: {
        id,
        institutionId:   session.institutionId,
        templateId:      d.templateId || null,
        recipientName:   d.recipientName,
        recipientEmail:  d.recipientEmail || null,
        course:          d.course || null,
        duration:        d.duration || null,
        competitionName: d.competitionName || null,
        grade:           d.grade || null,
        validUntil:      d.validUntil ? new Date(d.validUntil) : null,
        issuedAt,
        signature,
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/certificates')
    return { createdId: id, createdCount: 1 }
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    // eslint-disable-next-line no-console
    console.error('[issueSingle]', err)
    return { error: 'Could not create certificate. Try again.' }
  }
}

// ─── Bulk issue via paste-many TSV ──────────────────────────────────────────
// Accepts: `recipientName<TAB>course<TAB>duration` per line. Course +
// duration optional. Empty lines skipped. Easier to demo than full CSV
// upload — a manager can copy a column from Excel and paste it.

const bulkSchema = z.object({
  templateId: z.string().optional(),
  rows:       z.string().min(1, 'Paste at least one row'),
})

export async function issueBulkAction(_prev: IssueState | null, formData: FormData): Promise<IssueState> {
  try {
    const session = await requireSession()
    const parsed = bulkSchema.safeParse({
      templateId: String(formData.get('templateId') ?? '') || undefined,
      rows:       String(formData.get('rows') ?? ''),
    })
    if (!parsed.success) return { error: 'Paste a recipient list to continue.' }

    const lines = parsed.data.rows.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { error: 'No rows found.' }
    if (lines.length > 500) return { error: 'Max 500 rows per batch. Split it up.' }

    const issuedAt = new Date()
    const creates = lines.map(line => {
      const [name, course, duration] = line.split(/\t|,/).map(s => s.trim())
      if (!name) return null
      const id = newCertificateId()
      const signature = signCertificate({
        id,
        institutionId:   session.institutionId,
        recipientName:   name,
        course:          course || null,
        competitionName: null,
        issuedAt,
      })
      return {
        id,
        institutionId: session.institutionId,
        templateId:    parsed.data.templateId || null,
        recipientName: name,
        course:        course || null,
        duration:      duration || null,
        issuedAt,
        signature,
      }
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    if (creates.length === 0) return { error: 'No valid rows. Each row needs a recipient name.' }

    await db.certificate.createMany({ data: creates })
    revalidatePath('/dashboard')
    revalidatePath('/certificates')
    return { createdCount: creates.length }
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    console.error('[issueBulk]', err)
    return { error: 'Could not create certificates. Try again.' }
  }
}

// ─── Revoke ─────────────────────────────────────────────────────────────────

export async function revokeAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const id = String(formData.get('id') ?? '')
  const reason = String(formData.get('reason') ?? '').trim() || 'No reason given'
  if (!id) return
  // Ownership check — staff of one institution can't revoke another's certs.
  const cert = await db.certificate.findUnique({ where: { id }, select: { institutionId: true } })
  if (!cert || cert.institutionId !== session.institutionId) return
  await db.certificate.update({
    where: { id },
    data:  { status: 'REVOKED', revokedAt: new Date(), revokeReason: reason },
  })
  revalidatePath('/dashboard')
  revalidatePath('/certificates')
  revalidatePath(`/certificates/${id}`)
  revalidatePath(`/v/${id}`)
}
