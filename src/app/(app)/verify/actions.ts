'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { headers } from 'next/headers'
import { requireSession, AuthError } from '@/lib/auth'
import { verifyMany, type BulkVerifyRow } from '@/lib/verify'

export interface BulkState {
  error?:   string
  rows?:    BulkVerifyRow[]
  scanned?: number
}

const schema = z.object({
  raw: z.string().min(1, 'Paste at least one certificate ID'),
})

/** Pull a 6+ char alphanumeric ID out of a line that might be a URL. */
function extractId(line: string): string {
  const trimmed = line.trim()
  if (!trimmed) return ''
  const m = trimmed.match(/[a-z0-9]{6,}/i)
  return m ? m[0] : trimmed
}

const MAX_BATCH = 200

export async function bulkVerifyAction(_prev: BulkState | null, formData: FormData): Promise<BulkState> {
  try {
    await requireSession()
    const parsed = schema.safeParse({ raw: String(formData.get('raw') ?? '') })
    if (!parsed.success) return { error: 'Paste at least one certificate ID.' }

    const ids = parsed.data.raw
      .split(/\r?\n|,/)
      .map(extractId)
      .filter(Boolean)

    if (ids.length === 0) return { error: 'No valid IDs found in your input.' }
    if (ids.length > MAX_BATCH) {
      return { error: `Max ${MAX_BATCH} IDs per batch. Split the list and run it again.` }
    }

    // De-dupe so you can't burn 200-row quota by pasting the same ID twice.
    const unique = Array.from(new Set(ids.map(s => s.toLowerCase())))

    const h = await headers()
    const rows = await verifyMany(unique, {
      verifierIp: null,    // signed-in user — IP throttle doesn't apply
      userAgent:  h.get('user-agent'),
      skipThrottle: true,
    })
    return { rows, scanned: rows.length }
  } catch (err) {
    if (err instanceof AuthError) redirect('/login')
    // eslint-disable-next-line no-console
    console.error('[bulkVerify]', err)
    return { error: 'Could not run verification. Try again.' }
  }
}
