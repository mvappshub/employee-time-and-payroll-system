import Holidays from '../Holidays'
import PaySlip from '../PaySlip'
import TimeSheet from '../TimeSheet'
import { useAppShell } from '../application/useAppShell'
import { AppShellView } from '../screens/app/AppShellView'
import { CompanyScreen } from '../screens/company/CompanyScreen'
import { EmployeesScreen } from '../screens/employees/EmployeesScreen'
import { MonthControlsScreen } from '../screens/month-controls/MonthControlsScreen'

export default function App() {
  const appShell = useAppShell()

  return (
    <AppShellView
      navigationItems={appShell.navigationItems}
      activeSection={appShell.section}
      onSelectSection={appShell.onSelectSection}
      monthControls={<MonthControlsScreen />}
      employeesScreen={<EmployeesScreen />}
      timeSheetScreen={<TimeSheet />}
      payrollScreen={<PaySlip />}
      holidaysScreen={<Holidays />}
      companyScreen={<CompanyScreen />}
    />
  )
}
