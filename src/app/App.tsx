import { useState, type ReactNode } from 'react'
import { Calendar, User } from 'lucide-react'
import Holidays from '../Holidays'
import { useAppShell } from '../application/useAppShell'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useStore } from '../infrastructure/state/store'
import { AppShellView } from '../screens/app/AppShellView'
import { CompanyScreen } from '../screens/company/CompanyScreen'
import { EmployeesMainScreen, EmployeesTabs } from '../screens/employees/EmployeesMainScreen'
import { PayrollMainScreen, PayrollTabs } from '../screens/payroll/PayrollMainScreen'
import { TimeTrackingMainScreen, TimeTrackingTabs } from '../screens/timesheet/TimeTrackingMainScreen'

type EmployeesTab = 'list' | 'detail'
type MonthTab = 'overview' | 'detail'

function GlobalFilters() {
  const employees = useStore(s => s.employees)
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const selectEmployee = useStore(s => s.selectEmployee)
  const currentMonth = useStore(s => s.currentMonth)
  const setCurrentMonth = useStore(s => s.setCurrentMonth)

  return (
    <div className="flex items-center gap-2">
      <div className="w-[200px]">
        <Select
        density="compact"
        leftIcon={<User />}
        value={selectedEmployeeId || ''}
        onChange={event => selectEmployee(event.target.value || null)}
      >
        <option value="">Vyberte zaměstnance</option>
        {employees.map(employee => (
          <option key={employee.id} value={employee.id}>{employee.name || employee.employeeNumber || employee.id}</option>
        ))}
        </Select>
      </div>
      <div className="w-[150px]">
        <Input
        density="compact"
        leftIcon={<Calendar />}
        type="month"
        value={currentMonth}
        onChange={event => setCurrentMonth(event.target.value)}
      />
      </div>
    </div>
  )
}

export default function App() {
  const appShell = useAppShell()
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const [employeesTab, setEmployeesTab] = useState<EmployeesTab>('list')
  const [timeTrackingTab, setTimeTrackingTab] = useState<MonthTab>('overview')
  const [payrollTab, setPayrollTab] = useState<MonthTab>('overview')

  let topbarTabs: ReactNode = null
  let topbarFilters: ReactNode | null = null
  let content: ReactNode = null

  if (appShell.section === 'employees') {
    topbarTabs = (
      <EmployeesTabs
        activeTab={employeesTab}
        selectedEmployeeId={selectedEmployeeId}
        onTabChange={setEmployeesTab}
      />
    )
    content = <EmployeesMainScreen activeTab={employeesTab} onActiveTabChange={setEmployeesTab} />
  }

  if (appShell.section === 'time-tracking') {
    topbarTabs = <TimeTrackingTabs activeTab={timeTrackingTab} onTabChange={setTimeTrackingTab} />
    topbarFilters = <GlobalFilters />
    content = <TimeTrackingMainScreen activeTab={timeTrackingTab} onActiveTabChange={setTimeTrackingTab} />
  }

  if (appShell.section === 'payroll') {
    topbarTabs = <PayrollTabs activeTab={payrollTab} onTabChange={setPayrollTab} />
    topbarFilters = <GlobalFilters />
    content = <PayrollMainScreen activeTab={payrollTab} onActiveTabChange={setPayrollTab} />
  }

  if (appShell.section === 'company') {
    content = <CompanyScreen />
  }

  if (appShell.section === 'holidays') {
    content = <Holidays />
  }

  return (
    <AppShellView
      mainItems={appShell.mainItems}
      bottomItems={appShell.bottomItems}
      activeSection={appShell.section}
      onSelectSection={appShell.onSelectSection}
      topbarTabs={topbarTabs}
      topbarFilters={topbarFilters}
    >
      {content}
    </AppShellView>
  )
}
