/**
 * API key minting + validation.
 *
 * Format: `pra_<rand24>` — `pra_` prefix so anyone glancing at a leaked
 * key knows what it is, 24 random URL-safe chars after.
 *
 * Stored as SHA-256 of the plaintext. We NEVER persist the plaintext, so
 * if the database leaks the keys are still secret. The plaintext is only
 * returned to the user once at generation time; if they lose it they have
 * to make a new one.
 */
import { createHash, randomBytes } from 'node:crypto'
import { db } from './db'

const PREFIX     = 'pra_'
const RANDOM_LEN = 24

export interface GeneratedKey {
  /** The raw key — show this to the user ONCE, then never again. */
  plaintext: string
  /** Public-safe summary: `pra_abcd…wxyz`. Stored on the row for the UI. */
  preview:   string
  /** SHA-256 of plaintext, stored on the row. */
  hash:      string
}

export function generateKey(): GeneratedKey {
  // URL-safe alphabet — no 0/O/1/l confusion.
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(RANDOM_LEN)
  let body = ''
  for (let i = 0; i < RANDOM_LEN; i++) body += alphabet[bytes[i] % alphabet.length]
  const plaintext = `${PREFIX}${body}`
  const hash      = sha256(plaintext)
  const preview   = `${PREFIX}${body.slice(0, 4)}…${body.slice(-4)}`
  return { plaintext, preview, hash }
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * Validate an incoming `Authorization: Bearer <key>` header.
 * Returns the ApiKey row (with institution) on success, or null on failure.
 *
 * Updates `lastUsedAt` on success — synchronous; fine because the path is
 * already DB-bound.
 */
export async function authenticateApiKey(authHeader: string | null) {
  if (!authHeader) return null
  const match = /^Bearer\s+([A-Za-z0-9_]+)$/i.exec(authHeader.trim())
  if (!match) return null
  const plaintext = match[1]
  if (!plaintext.startsWith(PREFIX)) return null
  const hash = sha256(plaintext)
  const row = await db.apiKey.findUnique({
    where: { keyHash: hash },
    include: { institution: { select: { id: true, name: true, plan: true } } },
  })
  if (!row) return null
  if (row.revokedAt) return null
  // Touch lastUsedAt in the background — don't block the response on it.
  db.apiKey.update({
    where: { id: row.id }, data: { lastUsedAt: new Date() },
    // eslint-disable-next-line no-console
  }).catch(err => console.error('[api-keys] lastUsedAt update failed:', err))
  return row
}
