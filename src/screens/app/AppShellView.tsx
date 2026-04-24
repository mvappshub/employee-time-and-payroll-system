import type { ReactNode } from 'react'

type NavItem = {
  key: 'employee' | 'timesheet' | 'payslip' | 'holidays'
  label: string
}

export interface AppShellViewProps {
  navigationItems: readonly NavItem[]
  activeSection: NavItem['key']
  onSelectSection: (section: NavItem['key']) => void
  monthControls: ReactNode
  employeeScreen: ReactNode
  timeSheetScreen: ReactNode
  paySlipScreen: ReactNode
  holidaysScreen: ReactNode
}

export function AppShellView({
  navigationItems,
  activeSection,
  onSelectSection,
  monthControls,
  employeeScreen,
  timeSheetScreen,
  paySlipScreen,
  holidaysScreen,
}: AppShellViewProps) {
  return (
    <div className="flex min-h-screen bg-[#fcfcfa] text-xs text-slate-800">
      <nav className="w-36 shrink-0 px-5 pt-10 pb-8">
        {navigationItems.map(item => (
          <div
            key={item.key}
            onClick={() => onSelectSection(item.key)}
            className={`mb-2 cursor-pointer select-none py-1 text-[12px] tracking-[0.08em] transition-colors duration-150 ${activeSection === item.key ? 'font-medium text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
          >
            {item.label}
          </div>
        ))}
      </nav>
      <main className="min-w-0 flex-1 overflow-auto px-8 pt-10 pb-8 lg:px-10">
        {monthControls}
        {activeSection === 'employee' && employeeScreen}
        {activeSection === 'timesheet' && timeSheetScreen}
        {activeSection === 'payslip' && paySlipScreen}
        {activeSection === 'holidays' && holidaysScreen}
      </main>
    </div>
  )
}
