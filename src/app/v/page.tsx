import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function VerifyRouter({ searchParams }: PageProps) {
  const { id } = await searchParams
  if (!id?.trim()) redirect('/')
  // Whitespace + uppercase guard so a copy-pasted ID still works.
  const clean = id.trim().toLowerCase().replace(/\s+/g, '')
  redirect(`/v/${clean}`)
}
