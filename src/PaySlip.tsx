import { usePaySlipScreen } from './application/usePaySlipScreen'
import { PaySlipView } from './screens/payslip/PaySlipView'

export default function PaySlip() {
  const screen = usePaySlipScreen()

  return (
    <PaySlipView
      month={screen.month}
      employeeHeader={screen.employeeHeader}
      loading={screen.loading}
      error={screen.error}
      isDataClosed={screen.isDataClosed}
      dataClosedWarning={screen.dataClosedWarning}
      internalInputs={screen.internalInputs}
      auditRows={screen.auditRows}
      employeeDocument={screen.employeeDocument}
      onMonthChange={screen.onMonthChange}
    />
  )
}
