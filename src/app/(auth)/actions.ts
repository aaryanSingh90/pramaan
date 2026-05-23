'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, checkPassword, startSession, endSession } from '@/lib/auth'

// ─── Signup — creates an institution + its first OWNER user ─────────────────

const signupSchema = z.object({
  institutionName: z.string().min(2, 'Institution name is required'),
  name:            z.string().min(2, 'Your name is required'),
  email:           z.string().email('Enter a valid email'),
  password:        z.string().min(8, 'Use at least 8 characters'),
})

export interface ActionState {
  error?: string
  fieldErrors?: Record<string, string>
}

export async function signupAction(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    institutionName: String(formData.get('institutionName') ?? '').trim(),
    name:            String(formData.get('name') ?? '').trim(),
    email:           String(formData.get('email') ?? '').trim().toLowerCase(),
    password:        String(formData.get('password') ?? ''),
  })
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message
    }
    return { error: 'Please fix the highlighted fields.', fieldErrors }
  }

  const { institutionName, name, email, password } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { error: 'An account with that email already exists.' }

  const slug = slugify(institutionName)
  const slugTaken = await db.institution.findUnique({ where: { slug } })
  const finalSlug = slugTaken ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug

  const passwordHash = await hashPassword(password)
  const institution = await db.institution.create({
    data: {
      name:  institutionName,
      slug:  finalSlug,
      email,
      users: {
        create: { name, email, passwordHash, role: 'OWNER' },
      },
    },
    include: { users: true },
  })

  const owner = institution.users[0]
  await startSession({
    userId:          owner.id,
    email:           owner.email,
    name:            owner.name,
    role:            'OWNER',
    institutionId:   institution.id,
    institutionName: institution.name,
  })
  redirect('/dashboard')
}

// ─── Login ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export async function loginAction(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email:    String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  })
  if (!parsed.success) {
    return { error: 'Enter your email and password.' }
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    include: { institution: true },
  })
  if (!user) return { error: 'Invalid email or password.' }

  const ok = await checkPassword(parsed.data.password, user.passwordHash)
  if (!ok) return { error: 'Invalid email or password.' }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

  await startSession({
    userId:          user.id,
    email:           user.email,
    name:            user.name,
    role:            user.role,
    institutionId:   user.institutionId,
    institutionName: user.institution.name,
  })
  redirect('/dashboard')
}

// ─── Logout ────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect('/')
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    || 'institution'
}
