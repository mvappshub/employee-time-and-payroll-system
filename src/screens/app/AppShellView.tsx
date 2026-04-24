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
    <div className="flex h-screen bg-white text-xs text-black">
      <nav className="w-32 shrink-0 border-r border-gray-200 pt-1">
        {navigationItems.map(item => (
          <div
            key={item.key}
            onClick={() => onSelectSection(item.key)}
            className={`cursor-pointer select-none px-1 py-0.5 ${activeSection === item.key ? 'font-bold text-blue-600' : 'text-black'}`}
          >
            {item.label}
          </div>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-1">
        {monthControls}
        {activeSection === 'employee' && employeeScreen}
        {activeSection === 'timesheet' && timeSheetScreen}
        {activeSection === 'payslip' && paySlipScreen}
        {activeSection === 'holidays' && holidaysScreen}
      </main>
    </div>
  )
}
