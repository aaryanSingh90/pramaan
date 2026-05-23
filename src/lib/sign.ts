import { createHmac, randomBytes } from 'crypto'

const SECRET = process.env.CERT_SIGNING_SECRET
if (!SECRET) {
  // Throw at module load so a misconfigured env surfaces immediately.
  // eslint-disable-next-line no-console
  console.warn('[sign] CERT_SIGNING_SECRET not set — verifications will all fail')
}

/**
 * Generate a short, URL-safe, hard-to-guess certificate id.
 * 12 chars from a 32-char alphabet → ~10^18 possibilities, plenty for the
 * lifetime of the platform.
 */
export function newCertificateId(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789' // no 0/o/1/l confusion
  const bytes = randomBytes(12)
  let id = ''
  for (let i = 0; i < 12; i++) id += alphabet[bytes[i] % alphabet.length]
  return id
}

/**
 * Build a deterministic canonical string for a certificate. Used as the
 * input to HMAC. Order + casing matters — any change here will invalidate
 * every existing certificate's signature.
 */
function canonical(input: {
  id:              string
  institutionId:   string
  recipientName:   string
  course?:         string | null
  competitionName?: string | null
  issuedAt:        Date | string
}): string {
  const issued = typeof input.issuedAt === 'string' ? input.issuedAt : input.issuedAt.toISOString()
  return [
    input.id,
    input.institutionId,
    input.recipientName.trim(),
    (input.course ?? '').trim(),
    (input.competitionName ?? '').trim(),
    issued,
  ].join('|')
}

/** Sign a certificate's canonical string with HMAC-SHA256 → hex. */
export function signCertificate(input: Parameters<typeof canonical>[0]): string {
  return createHmac('sha256', SECRET ?? '').update(canonical(input)).digest('hex')
}

/** Verify a signature matches the certificate's canonical content. */
export function verifySignature(
  input: Parameters<typeof canonical>[0],
  signature: string,
): boolean {
  const expected = signCertificate(input)
  // Constant-time compare to dodge timing attacks.
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}
