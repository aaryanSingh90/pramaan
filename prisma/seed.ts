/* Seed Pramaan with a demo institution + a few certificates so you can boot
 * the app and immediately see a real /v/<id> page work end-to-end.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { newCertificateId, signCertificate } from '../src/lib/sign'

const db = new PrismaClient()

async function main() {
  // Wipe and reseed — safe in dev only.
  await db.verification.deleteMany()
  await db.certificate.deleteMany()
  await db.template.deleteMany()
  await db.user.deleteMany()
  await db.institution.deleteMany()

  const institution = await db.institution.create({
    data: {
      name:  'Delhi Institute of Technology',
      slug:  'delhi-institute-of-tech',
      email: 'admin@dit.edu.in',
      plan:  'ISSUER_PRO',
      users: {
        create: {
          name:         'Rahul Verma',
          email:        'rahul@dit.edu.in',
          passwordHash: await bcrypt.hash('demo1234', 10),
          role:         'OWNER',
        },
      },
      templates: {
        create: {
          name: 'Course Completion (Default)',
          fields: [
            { key: 'header',           xNorm: 0.50, yNorm: 0.18, fontSize: 14, font: 'sans',  align: 'center' },
            { key: 'recipientName',    xNorm: 0.50, yNorm: 0.33, fontSize: 42, font: 'serif', align: 'center', bold: true },
            { key: 'subheader',        xNorm: 0.50, yNorm: 0.42, fontSize: 14, font: 'sans',  align: 'center' },
            { key: 'course',           xNorm: 0.50, yNorm: 0.52, fontSize: 26, font: 'serif', align: 'center' },
            { key: 'durationAndGrade', xNorm: 0.50, yNorm: 0.61, fontSize: 13, font: 'sans',  align: 'center' },
          ],
        },
      },
    },
    include: { templates: true },
  })

  const tpl = institution.templates[0]

  const recipients = [
    { name: 'Priya Sharma',   course: 'Advanced Mathematics', duration: '12 weeks' },
    { name: 'Arjun Singh',    course: 'Data Structures',       duration: '8 weeks'  },
    { name: 'Anjali Patel',   course: 'Machine Learning',      duration: '16 weeks' },
    { name: 'Vikram Kumar',   course: 'Web Development',       duration: '10 weeks' },
    { name: 'Sneha Iyer',     course: 'Database Systems',      duration: '8 weeks'  },
  ]

  for (const r of recipients) {
    const id = newCertificateId()
    const issuedAt = new Date()
    const signature = signCertificate({
      id,
      institutionId:   institution.id,
      recipientName:   r.name,
      course:          r.course,
      competitionName: null,
      issuedAt,
    })
    await db.certificate.create({
      data: {
        id,
        institutionId: institution.id,
        templateId:    tpl.id,
        recipientName: r.name,
        course:        r.course,
        duration:      r.duration,
        issuedAt,
        signature,
      },
    })
  }

  // Revoke one so you can see the REVOKED verdict page work too.
  const oneToRevoke = await db.certificate.findFirst({ where: { institutionId: institution.id } })
  if (oneToRevoke) {
    await db.certificate.update({
      where: { id: oneToRevoke.id },
      data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: 'Demo revoke' },
    })
  }

  const all = await db.certificate.findMany({ where: { institutionId: institution.id } })
  console.log('\n✓ Seeded Pramaan demo data')
  console.log(`  ▸ Institution: ${institution.name}`)
  console.log(`  ▸ Login:       rahul@dit.edu.in / demo1234`)
  console.log(`  ▸ Certificates:`)
  for (const c of all) {
    console.log(`      http://localhost:3000/v/${c.id}  ${c.status === 'REVOKED' ? '(REVOKED)' : ''}  · ${c.recipientName}`)
  }
  console.log()
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => db.$disconnect())
