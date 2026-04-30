import type { ReactNode } from 'react'
import type { Store } from '../../infrastructure/state/store'

type NavItem = {
  key: Store['section']
  label: string
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

function NavButton({
  item,
  activeSection,
  onSelectSection,
}: {
  item: NavItem
  activeSection: Store['section']
  onSelectSection: (section: Store['section']) => void
}) {
  return (
    <button
      key={item.key}
      onClick={() => onSelectSection(item.key)}
      className={`mb-2 block w-full rounded-md px-3 py-2 text-left text-sm font-medium shadow-none ${
        activeSection === item.key
          ? 'bg-indigo-900 text-white'
          : 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {item.label}
    </button>
  )
}

export function AppShellView({
  mainItems,
  bottomItems,
  activeSection,
  onSelectSection,
  children,
  topbarTabs,
  topbarFilters,
}: AppShellViewProps) {
  return (
    <div className="flex min-h-screen bg-[#f3f4f6] text-sm text-slate-700">
      <nav className="app-chrome flex w-56 shrink-0 flex-col bg-slate-900 px-4 py-5 text-slate-300">
        <div className="mb-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Mzdový systém
        </div>
        <div className="space-y-1">
          {mainItems.map(item => (
            <NavButton
              key={item.key}
              item={item}
              activeSection={activeSection}
              onSelectSection={onSelectSection}
            />
          ))}
        </div>
        <div className="mt-auto border-t border-slate-700 pt-4">
          {bottomItems.map(item => (
            <NavButton
              key={item.key}
              item={item}
              activeSection={activeSection}
              onSelectSection={onSelectSection}
            />
          ))}
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-chrome flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2">
          <div className="min-w-0 flex-1">{topbarTabs}</div>
          <div className="shrink-0">{topbarFilters}</div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
