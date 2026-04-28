import type { ReactNode } from 'react'

type NavItem = {
  key: 'employees' | 'timesheet' | 'payroll' | 'holidays' | 'company'
  label: string
}

export interface AppShellViewProps {
  navigationItems: readonly NavItem[]
  activeSection: NavItem['key']
  onSelectSection: (section: NavItem['key']) => void
  monthControls: ReactNode
  employeesScreen: ReactNode
  timeSheetScreen: ReactNode
  payrollScreen: ReactNode
  holidaysScreen: ReactNode
  companyScreen: ReactNode
}

export function AppShellView({
  navigationItems,
  activeSection,
  onSelectSection,
  monthControls,
  employeesScreen,
  timeSheetScreen,
  payrollScreen,
  holidaysScreen,
  companyScreen,
}: AppShellViewProps) {
  return (
    <div className="flex min-h-screen bg-[#fcfcfa] text-xs text-slate-800">
      <nav className="app-chrome w-40 shrink-0 px-5 pt-10 pb-8">
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
        {activeSection === 'employees' && employeesScreen}
        {activeSection === 'timesheet' && timeSheetScreen}
        {activeSection === 'payroll' && payrollScreen}
        {activeSection === 'holidays' && holidaysScreen}
        {activeSection === 'company' && companyScreen}
      </main>
    </div>
  )
}
