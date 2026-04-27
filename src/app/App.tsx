import Holidays from '../Holidays'
import { useAppShell } from '../application/useAppShell'
import { AppShellView } from '../screens/app/AppShellView'
import { CompanyScreen } from '../screens/company/CompanyScreen'
import { EmployeesScreen } from '../screens/employees/EmployeesScreen'

export default function App() {
  const appShell = useAppShell()

  return (
    <AppShellView
      navigationItems={appShell.navigationItems}
      activeSection={appShell.section}
      onSelectSection={appShell.onSelectSection}
      employeesScreen={<EmployeesScreen />}
      holidaysScreen={<Holidays />}
      companyScreen={<CompanyScreen />}
    />
  )
}
