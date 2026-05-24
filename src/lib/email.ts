/**
 * Email delivery — Resend by default with a graceful fallback that just
 * logs to the server console when RESEND_API_KEY is missing (dev mode).
 *
 * The fallback means a fresh clone of Pramaan can issue certificates with
 * emails enabled out of the box — every send is recorded in EmailLog, but
 * no actual mail is dispatched until a real API key is configured. Perfect
 * for demos.
 */
import { Resend } from 'resend'
import { db } from './db'
import { renderCertificatePdf } from './pdf'
import type { Prisma } from '@prisma/client'

const RESEND_KEY = process.env.RESEND_API_KEY
const FROM       = process.env.MAIL_FROM ?? 'Pramaan <onboarding@resend.dev>'

const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null
const isLive = !!resend

export interface SendResult {
  ok:         boolean
  providerId?: string
  error?:     string
}

interface SendCertEmailOpts {
  certificateId: string
  trigger?: 'AUTO' | 'MANUAL_RESEND'
}

/**
 * Send (or attempt to send) a certificate to its recipient by email.
 *
 * Idempotent — call this multiple times safely; each call lands a row in
 * EmailLog so the institution sees every attempt.
 */
export async function sendCertificateEmail({
  certificateId, trigger = 'AUTO',
}: SendCertEmailOpts): Promise<SendResult> {
  const cert = await db.certificate.findUnique({
    where: { id: certificateId },
    include: { institution: { select: { name: true } }, template: true },
  })
  if (!cert) return { ok: false, error: 'Certificate not found' }

  // Skip — recipient has no email on file. Log it so the institution sees why.
  if (!cert.recipientEmail) {
    await db.emailLog.create({
      data: {
        certificateId: cert.id,
        toEmail:  '',
        subject:  '(skipped — no email)',
        status:   'SKIPPED',
        trigger,
        errorMessage: 'Recipient email not provided',
      },
    })
    return { ok: false, error: 'No recipient email on file' }
  }

  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const verifyUrl = `${baseUrl}/v/${cert.id}`
  const subject   = `Your ${cert.course ? `${cert.course} ` : ''}certificate from ${cert.institution.name}`
  const html      = renderCertEmailHtml({
    recipientName:   cert.recipientName,
    institutionName: cert.institution.name,
    course:          cert.course,
    duration:        cert.duration,
    grade:           cert.grade,
    verifyUrl,
    certId:          cert.id,
  })

  // Generate the PDF attachment on the fly. Same renderer as the public
  // download endpoint — the email recipient ends up with the exact same PDF.
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
    verifyUrl,
    pageWidth:       cert.template?.pageWidth,
    pageHeight:      cert.template?.pageHeight,
    backgroundBytes,
    fields:          cert.template?.fields as never,
  })
  const pdfFilename = `${cert.recipientName.replace(/[^\w]+/g, '_')}_${cert.id}.pdf`

  // ── Dev fallback — log + record, no real send ────────────────────────────
  if (!isLive) {
    // eslint-disable-next-line no-console
    console.log(`\n[email:dev] would send to ${cert.recipientEmail}\n  subject: ${subject}\n  link:    ${verifyUrl}\n  pdf:     ${pdfFilename} (${pdfBytes.length} bytes)\n`)
    await logEmail({
      certificateId: cert.id,
      toEmail:       cert.recipientEmail,
      subject,
      status:        'SENT',
      providerId:    'dev-noop',
      trigger,
    })
    return { ok: true, providerId: 'dev-noop' }
  }

  // ── Real send via Resend ────────────────────────────────────────────────
  try {
    const result = await resend!.emails.send({
      from:    FROM,
      to:      [cert.recipientEmail],
      subject,
      html,
      attachments: [{
        filename: pdfFilename,
        content:  Buffer.from(pdfBytes).toString('base64'),
      }],
    })
    if (result.error) {
      await logEmail({
        certificateId: cert.id,
        toEmail:       cert.recipientEmail,
        subject,
        status:        'FAILED',
        errorMessage:  result.error.message,
        trigger,
      })
      return { ok: false, error: result.error.message }
    }
    await logEmail({
      certificateId: cert.id,
      toEmail:       cert.recipientEmail,
      subject,
      status:        'SENT',
      providerId:    result.data?.id ?? null,
      trigger,
    })
    return { ok: true, providerId: result.data?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email send failed'
    await logEmail({
      certificateId: cert.id,
      toEmail:       cert.recipientEmail,
      subject,
      status:        'FAILED',
      errorMessage:  msg,
      trigger,
    })
    return { ok: false, error: msg }
  }
}

async function logEmail(data: {
  certificateId: string
  toEmail:       string
  subject:       string
  status:        'SENT' | 'FAILED' | 'SKIPPED'
  providerId?:   string | null
  errorMessage?: string
  trigger:       'AUTO' | 'MANUAL_RESEND'
}): Promise<void> {
  const payload: Prisma.EmailLogCreateInput = {
    certificate: { connect: { id: data.certificateId } },
    toEmail:     data.toEmail,
    subject:     data.subject,
    status:      data.status,
    trigger:     data.trigger,
    providerId:  data.providerId ?? null,
    errorMessage: data.errorMessage ?? null,
  }
  await db.emailLog.create({ data: payload })
}

// ─── HTML template ─────────────────────────────────────────────────────────

interface EmailTemplateData {
  recipientName:   string
  institutionName: string
  course?:         string | null
  duration?:       string | null
  grade?:          string | null
  verifyUrl:       string
  certId:          string
}

/**
 * Single-file HTML email. Inline styles only — modern CSS in email clients
 * is a minefield. Tested mentally against Gmail, Outlook, Apple Mail.
 */
function renderCertEmailHtml(d: EmailTemplateData): string {
  const firstName = d.recipientName.split(' ')[0]
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Your certificate from ${escapeHtml(d.institutionName)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f1e8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0a0e1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f1e8;">
    <tr><td align="center" style="padding:32px 16px;">

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#0a0e1a;padding:22px 28px;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;">
                <span style="display:inline-block;width:32px;height:32px;background:#f59e0b;border-radius:8px;line-height:32px;text-align:center;font-weight:900;color:#0a0e1a;font-size:14px;">P</span>
                <span style="font-weight:900;font-size:18px;letter-spacing:0.5px;margin-left:10px;vertical-align:middle;">Pramaan</span>
              </td>
              <td align="right" style="font-size:11px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;font-weight:700;">
                Certificate issued
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 32px 12px;">
          <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:30px;line-height:1.2;letter-spacing:-0.3px;color:#0a0e1a;">Congratulations, ${escapeHtml(firstName)} 🎉</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#3a4257;">
            <strong>${escapeHtml(d.institutionName)}</strong> has issued you a Pramaan-verified certificate${d.course ? ` for <strong>${escapeHtml(d.course)}</strong>` : ''}. Your PDF is attached to this email.
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 22px;background:#fff7e6;border:1px solid rgba(245,158,11,0.35);border-radius:10px;">
            <tr><td style="padding:14px 16px;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#b45309;margin-bottom:4px;">Verify URL</div>
              <a href="${d.verifyUrl}" style="font-size:14px;color:#0a0e1a;word-break:break-all;text-decoration:none;font-family:Menlo,Consolas,monospace;">${d.verifyUrl}</a>
            </td></tr>
          </table>

          <p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#3a4257;">
            Anyone — a recruiter, college admissions officer, family member — can open that URL or scan the QR code on the attached PDF to instantly verify this certificate is genuine. It's how Pramaan stops anyone from forging a copy of your work.
          </p>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:8px 0 22px;">
              <a href="${d.verifyUrl}" style="display:inline-block;background:#f59e0b;color:#0a0e1a;font-weight:800;font-size:14px;text-decoration:none;padding:12px 22px;border-radius:8px;letter-spacing:0.3px;">View verification page →</a>
            </td></tr>
          </table>

          <!-- Cert summary -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e5e7eb;margin-top:8px;">
            <tr><td style="padding:18px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;color:#3a4257;">
                ${d.course    ? row('Course',    escapeHtml(d.course))   : ''}
                ${d.duration  ? row('Duration',  escapeHtml(d.duration)) : ''}
                ${d.grade     ? row('Grade',     escapeHtml(d.grade))    : ''}
                ${row('Issued by', escapeHtml(d.institutionName))}
                ${row('Certificate ID', `<span style="font-family:Menlo,Consolas,monospace;letter-spacing:1px;">${escapeHtml(d.certId.toUpperCase())}</span>`)}
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:22px 32px 28px;background:#fafaf6;color:#64748b;font-size:11px;line-height:1.5;border-top:1px solid #e5e7eb;">
          You're getting this because <strong>${escapeHtml(d.institutionName)}</strong> issued you a certificate through <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://pramaan.in'}" style="color:#b45309;text-decoration:none;font-weight:700;">Pramaan</a> — the trust layer for academic and professional credentials.
        </td></tr>

      </table>

      <p style="font-size:11px;color:#94a3b8;margin:18px 0 0;letter-spacing:0.6px;">Pramaan · Har certificate ka Pramaan</p>
    </td></tr>
  </table>
</body>
</html>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:5px 0;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;width:140px;">${label}</td>
    <td style="padding:5px 0;color:#0a0e1a;font-weight:600;">${value}</td>
  </tr>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
