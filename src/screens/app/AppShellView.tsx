import type { ReactNode } from 'react'

type NavItem = {
  key: 'employees' | 'holidays' | 'company'
  label: string
}

export interface AppShellViewProps {
  navigationItems: readonly NavItem[]
  activeSection: NavItem['key']
  onSelectSection: (section: NavItem['key']) => void
  employeesScreen: ReactNode
  holidaysScreen: ReactNode
  companyScreen: ReactNode
}

export function AppShellView({
  navigationItems,
  activeSection,
  onSelectSection,
  employeesScreen,
  holidaysScreen,
  companyScreen,
}: AppShellViewProps) {
  return (
    <div className="flex min-h-screen bg-[#f3f4f6] text-sm text-slate-700">
      <nav className="app-chrome w-56 shrink-0 border-r border-slate-200 bg-white px-4 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="mb-4 text-xs font-semibold text-slate-500">
          Mzdový systém
        </div>
        {navigationItems.map(item => (
          <button
            key={item.key}
            onClick={() => onSelectSection(item.key)}
            className={`mb-2 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${activeSection === item.key ? 'border border-blue-200 bg-blue-50 text-blue-700 shadow-none' : 'border border-transparent bg-transparent text-slate-600 shadow-none hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main className="min-w-0 flex-1 overflow-auto p-6">
        {activeSection === 'employees' && employeesScreen}
        {activeSection === 'holidays' && holidaysScreen}
        {activeSection === 'company' && companyScreen}
      </main>
    </div>
  )
}
