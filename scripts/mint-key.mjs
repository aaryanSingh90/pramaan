import { PrismaClient } from '@prisma/client'
import { generateKey } from '../src/lib/api-keys.ts'

const db  = new PrismaClient()
const inst = await db.institution.findFirst()
if (!inst) { console.log('seed first'); process.exit(1) }
const k = generateKey()
await db.apiKey.create({
  data: {
    institutionId: inst.id,
    name: 'smoke-test',
    keyHash: k.hash,
    keyPreview: k.preview,
  },
})
console.log(k.plaintext)
await db.$disconnect()
