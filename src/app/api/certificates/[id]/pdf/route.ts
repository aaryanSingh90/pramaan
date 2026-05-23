import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { renderCertificatePdf } from '@/lib/pdf'

/**
 * GET /api/certificates/<id>/pdf
 *
 * Public — anyone holding the certificate ID can download the PDF. Same
 * trust assumption as the /v/<id> page: the ID is the secret.
 *
 * Always re-renders from the database row. We don't cache the PDF bytes
 * because (a) the QR target is the verify page so the PDF stays accurate
 * even if anything changes, and (b) revocation must invalidate any
 * downloaded copies' usefulness — they still scan to a REVOKED verdict.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const cert = await db.certificate.findUnique({
    where: { id },
    include: { institution: { select: { name: true } }, template: true },
  })
  if (!cert) return new Response('Certificate not found', { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Decode base64 data URL → raw bytes (templates store the bg image inline).
  let backgroundBytes: Uint8Array | undefined
  if (cert.template?.backgroundUrl) {
    const m = /^data:image\/(?:png|jpeg|jpg);base64,(.+)$/i.exec(cert.template.backgroundUrl)
    if (m) backgroundBytes = Uint8Array.from(Buffer.from(m[1], 'base64'))
  }

  const pdfBytes = await renderCertificatePdf({
    id:              cert.id,
    recipientName:   cert.recipientName,
    course:          cert.course,
    duration:        cert.duration,
    competitionName: cert.competitionName,
    grade:           cert.grade,
    issuedAt:        cert.issuedAt,
    validUntil:      cert.validUntil,
    institutionName: cert.institution.name,
    verifyUrl:       `${baseUrl}/v/${cert.id}`,
    pageWidth:       cert.template?.pageWidth,
    pageHeight:      cert.template?.pageHeight,
    backgroundBytes,
    fields:          cert.template?.fields as never,
  })

  // Browsers should view it inline by default; saving still works.
  const filename = `${cert.recipientName.replace(/[^\w]+/g, '_')}_${cert.id}.pdf`
  return new Response(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control':       'private, no-store',
    },
  })
}
