'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession, AuthError } from '@/lib/auth'
import { generateKey } from '@/lib/api-keys'

export interface ApiKeyState {
  error?:      string
  /** Plaintext returned only on creation; never persisted in this shape. */
  plaintext?:  string
  preview?:    string
  createdName?: string
}

const createSchema = z.object({
  name: z.string().min(2, 'Give the key a label').max(60),
})

export async function createApiKeyAction(
  _prev: ApiKeyState | null,
  formData: FormData,
): Promise<ApiKeyState> {
  try {
    const session = await requireSession()
    const parsed = createSchema.safeParse({
      name: String(formData.get('name') ?? '').trim(),
    })
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

    // Soft cap so a runaway script doesn't mint 1000 keys.
    const count = await db.apiKey.count({
      where: { institutionId: session.institutionId, revokedAt: null },
    })
    if (count >= 20) {
      return { error: 'Reached the cap of 20 active keys. Revoke an unused key first.' }
    }

    const k = generateKey()
    await db.apiKey.create({
      data: {
        institutionId: session.institutionId,
        name:       parsed.data.name,
        keyHash:    k.hash,
        keyPreview: k.preview,
      },
    })

    revalidatePath('/settings')
    return { plaintext: k.plaintext, preview: k.preview, createdName: parsed.data.name }
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    // eslint-disable-next-line no-console
    console.error('[createApiKey]', err)
    return { error: 'Could not create API key. Try again.' }
  }
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const session = await requireSession()
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const owned = await db.apiKey.findUnique({
    where: { id }, select: { institutionId: true },
  })
  if (!owned || owned.institutionId !== session.institutionId) return
  await db.apiKey.update({
    where: { id }, data: { revokedAt: new Date() },
  })
  revalidatePath('/settings')
}
