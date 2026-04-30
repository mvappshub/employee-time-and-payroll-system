import type { ReactNode } from 'react'
import { Briefcase, Building2, CalendarDays, Clock, Users, Wallet } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { Store } from '../../infrastructure/state/store'

type NavItem = { key: Store['section']; label: string }

const ICONS: Record<Store['section'], ReactNode> = {
  employees: <Users className="h-4 w-4" />,
  'time-tracking': <Clock className="h-4 w-4" />,
  payroll: <Wallet className="h-4 w-4" />,
  company: <Building2 className="h-4 w-4" />,
  holidays: <CalendarDays className="h-4 w-4" />,
}

export interface AppShellViewProps {
  mainItems: readonly NavItem[]
  bottomItems: readonly NavItem[]
  activeSection: Store['section']
  onSelectSection: (section: Store['section']) => void
  children: ReactNode
  topbarTabs: ReactNode
  topbarFilters: ReactNode | null
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-blue-600/15 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-blue-300' : 'text-slate-400')}>{ICONS[item.key]}</span>
      <span className="truncate">{item.label}</span>
    </button>
  )
}

export function AppShellView({ mainItems, bottomItems, activeSection, onSelectSection, children, topbarTabs, topbarFilters }: AppShellViewProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <nav className="app-chrome flex w-52 shrink-0 flex-col bg-[#0b1220] text-slate-300">
        <div className="flex items-center gap-2 border-b border-slate-800 px-3.5 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <Briefcase className="h-3.5 w-3.5" />
          </div>
          <div className="text-sm font-semibold leading-none text-white">Mzdový systém</div>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {mainItems.map(item => (
            <NavButton key={item.key} item={item} active={activeSection === item.key} onClick={() => onSelectSection(item.key)} />
          ))}
        </div>
        <div className="space-y-0.5 border-t border-slate-800 px-2 py-3">
          {bottomItems.map(item => (
            <NavButton key={item.key} item={item} active={activeSection === item.key} onClick={() => onSelectSection(item.key)} />
          ))}
        </div>
        <div className="border-t border-slate-800 px-3.5 py-2 text-[10px] text-slate-500">v2026.1</div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-chrome flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
          <div className="min-w-0 flex-1">{topbarTabs}</div>
          <div className="shrink-0">{topbarFilters}</div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto px-4 py-4">{children}</main>
      </div>
    </div>
  )
}
