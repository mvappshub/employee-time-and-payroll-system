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
      monthCloseScreen={<div className="text-sm text-slate-500">Měsíční uzávěrka</div>}
      paySlipScreen={<PaySlip />}
      payrollSheetScreen={<div className="text-sm text-slate-500">Mzdový list</div>}
      legalConstantsScreen={<div className="text-sm text-slate-500">Zákonné konstanty</div>}
      holidaysScreen={<Holidays />}
    />
  )
}
