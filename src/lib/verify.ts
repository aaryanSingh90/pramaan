/**
 * Single source of truth for certificate verification verdicts.
 *
 * Used by:
 *   • /v/[id]          — public single verification (server-rendered, IP-throttled)
 *   • /verify          — bulk verification inside the issuer / verifier dashboard
 *   • /api/v1/verify   — REST endpoint, Bearer auth, per-key rate-limited
 *
 * Every call writes a row to Verification so we have a full audit trail
 * (and so the public IP throttle has data to count against).
 */
import { db } from './db'
import { verifySignature } from './sign'

export type VerdictKind =
  | 'VALID'
  | 'REVOKED'
  | 'EXPIRED'
  | 'TAMPERED'
  | 'NOT_FOUND'
  | 'THROTTLED'

export interface VerdictCert {
  id:              string
  recipientName:   string
  course:          string | null
  competitionName: string | null
  duration:        string | null
  grade:           string | null
  issuedAt:        Date
  validUntil:      Date | null
  institution:     { name: string; slug: string }
}

export type Verdict =
  | { kind: 'VALID';     cert: VerdictCert }
  | { kind: 'REVOKED';   cert: VerdictCert }
  | { kind: 'EXPIRED';   cert: VerdictCert }
  | { kind: 'TAMPERED';  cert: VerdictCert }
  | { kind: 'NOT_FOUND'; queriedId: string }
  | { kind: 'THROTTLED'; queriedId: string }

export interface VerifyContext {
  /** IP of the verifier (for anonymous public lookups). Null for REST / signed-in calls. */
  verifierIp?:    string | null
  /** Browser user-agent. Optional; helps analytics. */
  userAgent?:     string | null
  /** ApiKey.id if the call came in via REST. Skips the IP throttle. */
  apiKeyId?:      string | null
  /**
   * If true, do not enforce the anonymous IP throttle. Pass for any caller
   * that's signed-in or holding a valid API key — they have their own
   * higher quotas elsewhere.
   */
  skipThrottle?:  boolean
}

const ANON_LIMIT_PER_24H = 5

/**
 * Free-tier rate limit for anonymous callers: 5 verifications per IP per 24h.
 * Counted across the Verification table.
 */
async function isAnonThrottled(ip: string | null | undefined): Promise<boolean> {
  if (!ip) return false
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recent = await db.verification.count({
    where: {
      verifierIp: ip,
      apiKeyId:   null,
      createdAt:  { gte: since },
    },
  })
  return recent >= ANON_LIMIT_PER_24H
}

/**
 * Verify a single certificate ID and return a verdict.
 *
 * Always writes to Verification (the audit table), except when THROTTLED
 * (we never record those — counting them would let an attacker DoS your
 * own audit log).
 */
export async function verifyCertificate(
  rawId: string,
  ctx: VerifyContext = {},
): Promise<Verdict> {
  const id = rawId.trim()
  if (!id) {
    return { kind: 'NOT_FOUND', queriedId: rawId }
  }

  if (!ctx.skipThrottle && !ctx.apiKeyId) {
    if (await isAnonThrottled(ctx.verifierIp)) {
      return { kind: 'THROTTLED', queriedId: id }
    }
  }

  const cert = await db.certificate.findUnique({
    where: { id },
    include: { institution: { select: { name: true, slug: true } } },
  })

  if (!cert) {
    await db.verification.create({
      data: {
        queriedId:  id,
        result:     'NOT_FOUND',
        verifierIp: ctx.verifierIp ?? null,
        userAgent:  ctx.userAgent ?? null,
        apiKeyId:   ctx.apiKeyId ?? null,
      },
    })
    return { kind: 'NOT_FOUND', queriedId: id }
  }

  // Re-verify the HMAC every time. If anyone (even a DB admin) has edited
  // the row directly, this fails and we surface TAMPERED — the loudest
  // possible verdict for an institution to investigate.
  const sigOk = verifySignature(
    {
      id:              cert.id,
      institutionId:   cert.institutionId,
      recipientName:   cert.recipientName,
      course:          cert.course,
      competitionName: cert.competitionName,
      issuedAt:        cert.issuedAt,
    },
    cert.signature,
  )

  const certPayload: VerdictCert = {
    id:              cert.id,
    recipientName:   cert.recipientName,
    course:          cert.course,
    competitionName: cert.competitionName,
    duration:        cert.duration,
    grade:           cert.grade,
    issuedAt:        cert.issuedAt,
    validUntil:      cert.validUntil,
    institution:     cert.institution,
  }

  let result: Exclude<VerdictKind, 'NOT_FOUND' | 'THROTTLED'>
  if (!sigOk)                                            result = 'TAMPERED'
  else if (cert.status === 'REVOKED')                    result = 'REVOKED'
  else if (cert.validUntil && cert.validUntil < new Date()) result = 'EXPIRED'
  else                                                   result = 'VALID'

  await db.verification.create({
    data: {
      queriedId:     id,
      certificateId: cert.id,
      result,
      verifierIp:    ctx.verifierIp ?? null,
      userAgent:     ctx.userAgent ?? null,
      apiKeyId:      ctx.apiKeyId ?? null,
    },
  })

  return { kind: result, cert: certPayload } as Verdict
}

/** Plain-data shape for a row of bulk verification results / CSV export. */
export interface BulkVerifyRow {
  queriedId:       string
  status:          VerdictKind
  recipientName:   string | null
  institutionName: string | null
  course:          string | null
  issuedOn:        string | null    // formatted dd-MM-yyyy
  notes:           string | null    // human-readable explanation for failures
}

/**
 * Verify many IDs in one call. Used by /verify (UI) and /api/v1/verify (REST).
 * Returns a flat array of plain rows so it serializes to JSON / CSV easily.
 */
export async function verifyMany(
  ids: string[],
  ctx: VerifyContext = {},
): Promise<BulkVerifyRow[]> {
  const out: BulkVerifyRow[] = []
  for (const raw of ids) {
    const v = await verifyCertificate(raw, ctx)
    out.push(toBulkRow(raw, v))
  }
  return out
}

function toBulkRow(raw: string, v: Verdict): BulkVerifyRow {
  if (v.kind === 'NOT_FOUND' || v.kind === 'THROTTLED') {
    return {
      queriedId:       raw.trim(),
      status:          v.kind,
      recipientName:   null,
      institutionName: null,
      course:          null,
      issuedOn:        null,
      notes: v.kind === 'NOT_FOUND'
        ? 'No certificate exists with this ID. Check the spelling or scan the QR.'
        : 'Rate-limited — sign in or use an API key for higher quotas.',
    }
  }
  return {
    queriedId:       v.cert.id,
    status:          v.kind,
    recipientName:   v.cert.recipientName,
    institutionName: v.cert.institution.name,
    course:          v.cert.course ?? v.cert.competitionName,
    issuedOn:        formatDate(v.cert.issuedAt),
    notes:
      v.kind === 'VALID'    ? null
    : v.kind === 'REVOKED'  ? 'Revoked by the issuing institution.'
    : v.kind === 'EXPIRED'  ? `Expired on ${v.cert.validUntil ? formatDate(v.cert.validUntil) : 'an earlier date'}.`
                            : 'Signature mismatch — do not trust this certificate.',
  }
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}
