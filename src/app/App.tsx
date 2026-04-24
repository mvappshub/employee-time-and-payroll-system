import Employee from '../Employee'
import Holidays from '../Holidays'
import MonthControls from '../MonthControls'
import PaySlip from '../PaySlip'
import TimeSheet from '../TimeSheet'
import { useAppShell } from '../application/useAppShell'
import { AppShellView } from '../screens/app/AppShellView'

export default function App() {
  const appShell = useAppShell()

  return (
    <AppShellView
      navigationItems={appShell.navigationItems}
      activeSection={appShell.section}
      onSelectSection={appShell.onSelectSection}
      monthControls={<MonthControls />}
      employeeScreen={<Employee />}
      timeSheetScreen={<TimeSheet />}
      paySlipScreen={<PaySlip />}
      holidaysScreen={<Holidays />}
    />
  )
}
