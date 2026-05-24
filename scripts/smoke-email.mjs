// Smoke test for the email pipeline.
// Run with: node --env-file=.env --import=tsx scripts/smoke-email.mjs
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const cert = await db.certificate.findFirst({ where: { status: 'ACTIVE' } })
if (!cert) {
  console.log('No active cert found — seed the db first')
  process.exit(1)
}

const target = cert.recipientEmail ?? 'priya@dit.edu.in'
if (!cert.recipientEmail) {
  await db.certificate.update({ where: { id: cert.id }, data: { recipientEmail: target } })
  console.log('  added recipientEmail:', target)
}

console.log('Sending email for cert', cert.id, 'to', target)
const { sendCertificateEmail } = await import('../src/lib/email.ts')
const result = await sendCertificateEmail({ certificateId: cert.id, trigger: 'MANUAL_RESEND' })
console.log('Result:', result)

const log = await db.emailLog.findFirst({
  where: { certificateId: cert.id }, orderBy: { createdAt: 'desc' },
})
console.log('Latest EmailLog row:', {
  status: log?.status,
  toEmail: log?.toEmail,
  trigger: log?.trigger,
  providerId: log?.providerId,
  errorMessage: log?.errorMessage,
})

await db.$disconnect()
