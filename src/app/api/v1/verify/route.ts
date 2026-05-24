import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiKey } from '@/lib/api-keys'
import { verifyMany } from '@/lib/verify'

/**
 * POST /api/v1/verify
 *
 * Authentication: `Authorization: Bearer pra_xxxxxxxx`
 * Body (JSON):    { ids: string[] }           — up to 200
 *            OR   { id: string }              — single
 *
 * Response:
 *   200 { count, rows: BulkVerifyRow[] }
 *   400 { error } — bad input
 *   401 { error } — missing or revoked key
 *   413 { error } — too many ids
 *
 * Rate limiting: per-key, 600 verifications per hour (10 / sec averaged).
 * Hard 429 if exceeded.
 */

const PER_HOUR = 600
const MAX_IDS  = 200

const singleSchema = z.object({ id: z.string().min(1) })
const bulkSchema   = z.object({ ids: z.array(z.string().min(1)).min(1).max(MAX_IDS) })
const bodySchema   = z.union([singleSchema, bulkSchema])

export async function POST(req: NextRequest) {
  const key = await authenticateApiKey(req.headers.get('authorization'))
  if (!key) {
    return jsonError(401, 'Invalid or missing API key. Send Authorization: Bearer <key>.')
  }

  // Per-key rate limit — count this hour's verifications.
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const recent = await countRecentVerifications(key.id, since)
  if (recent >= PER_HOUR) {
    return jsonError(429, `Rate limit hit (${PER_HOUR}/hour). Try again later or upgrade.`, {
      'Retry-After': '3600',
    })
  }

  let json: unknown
  try { json = await req.json() }
  catch { return jsonError(400, 'Body must be valid JSON.') }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return jsonError(400, 'Body must be { "id": "..." } or { "ids": ["...", ...] }.')
  }

  const ids = 'ids' in parsed.data ? parsed.data.ids : [parsed.data.id]
  const unique = Array.from(new Set(ids.map(s => s.trim().toLowerCase()))).filter(Boolean)
  if (unique.length === 0) return jsonError(400, 'No valid IDs in payload.')
  if (unique.length > MAX_IDS) return jsonError(413, `Max ${MAX_IDS} ids per call.`)

  const rows = await verifyMany(unique, {
    apiKeyId:    key.id,
    skipThrottle: true,
    userAgent:   req.headers.get('user-agent'),
  })

  return NextResponse.json({
    count: rows.length,
    rows,
  })
}

async function countRecentVerifications(apiKeyId: string, since: Date): Promise<number> {
  const { db } = await import('@/lib/db')
  return db.verification.count({
    where: { apiKeyId, createdAt: { gte: since } },
  })
}

function jsonError(status: number, message: string, extraHeaders: Record<string, string> = {}): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: extraHeaders })
}

// CORS — institutions calling from a server-side script don't need CORS;
// but if anyone wants to call from a JS app we allow the relevant methods.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age':       '86400',
    },
  })
}
