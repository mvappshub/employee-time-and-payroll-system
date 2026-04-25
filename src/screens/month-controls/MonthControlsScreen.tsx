import { useMonthControls } from '../../application/useMonthControls'
import { MonthControlsView } from './MonthControlsView'

export function MonthControlsScreen() {
  const controls = useMonthControls()

  return (
    <MonthControlsView
      error={controls.error}
      info={controls.info}
      success={controls.success}
      currentStatus={controls.currentStatus}
      currentStatusLabel={controls.currentStatusLabel}
      selectedEmployeeName={controls.selectedEmployeeName}
      monthLabel={controls.monthLabel}
      nextStepLabel={controls.nextStepLabel}
      lastActionLabel={controls.lastActionLabel}
      buttonState={controls.buttonState}
      onLoad={controls.onLoad}
      onInitMonth={controls.onInitMonth}
      onSave={controls.onSave}
      onPrefill={controls.onPrefill}
      onCloseMonth={controls.onCloseMonth}
      onCalculatePayroll={controls.onCalculatePayroll}
      onApproveMonth={controls.onApproveMonth}
      onIssuePayslip={controls.onIssuePayslip}
      onPrintPayslip={controls.onPrintPayslip}
    />
  )
}
