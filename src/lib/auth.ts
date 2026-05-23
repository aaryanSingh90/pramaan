import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from './db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'local-dev-secret-replace-in-production-please',
)
const COOKIE_NAME = 'pramaan-session'
const SEVEN_DAYS = 60 * 60 * 24 * 7

export interface Session {
  userId:        string
  email:         string
  name:          string
  role:          'OWNER' | 'STAFF'
  institutionId: string
  institutionName: string
}

// ─── Password helpers ──────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function checkPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── JWT / cookie helpers ──────────────────────────────────────────────────

async function sign(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function startSession(payload: Session): Promise<void> {
  const token = await sign(payload)
  const c = await cookies()
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   SEVEN_DAYS,
  })
}

export async function endSession(): Promise<void> {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}

export async function getSession(): Promise<Session | null> {
  const c = await cookies()
  const token = c.get(COOKIE_NAME)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as Session
  } catch {
    return null
  }
}

/**
 * Re-fetch the user from the DB to make sure the institution still exists
 * and the user isn't deleted. Use this in any route that mutates data.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new AuthError('Not signed in')
  // Light-weight existence check.
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, institutionId: true },
  })
  if (!user) throw new AuthError('Account no longer exists')
  return session
}

export class AuthError extends Error {
  constructor(message: string) { super(message); this.name = 'AuthError' }
}
