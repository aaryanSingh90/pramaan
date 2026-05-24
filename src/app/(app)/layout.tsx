import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck, LayoutDashboard, FileText, Award, Settings as SettingsIcon, LogOut,
  ScanLine,
} from 'lucide-react'
import { getSession } from '@/lib/auth'
import { logoutAction } from '../(auth)/actions'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const initials = session.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex bg-bg text-ink">
      {/* ── Sidebar (lg+) ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-bg-soft">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5 border-b border-border focus-ring">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <ShieldCheck className="w-4.5 h-4.5 text-bg" />
          </div>
          <div className="min-w-0">
            <div className="font-black tracking-tight truncate">Pramaan</div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand truncate">
              {session.institutionName}
            </div>
          </div>
        </Link>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem href="/dashboard"     icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/templates"     icon={FileText}        label="Templates" />
          <NavItem href="/certificates"  icon={Award}           label="Certificates" />
          <NavItem href="/verify"        icon={ScanLine}        label="Bulk verify" />
          <NavItem href="/settings"      icon={SettingsIcon}    label="Settings" />
        </nav>

        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center text-xs font-black text-brand shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{session.name}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-dim truncate">
                {session.role}
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out"
                className="p-1.5 rounded-md text-ink-dim hover:text-ink hover:bg-bg-card transition-colors focus-ring"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: typeof ShieldCheck; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-mute hover:bg-bg-card hover:text-ink transition-colors focus-ring"
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
