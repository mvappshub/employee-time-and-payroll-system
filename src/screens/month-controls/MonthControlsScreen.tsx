import { useMonthControls } from '../../application/useMonthControls'
import { ConfirmDialog } from '../app/ConfirmDialog'
import { MonthControlsView } from './MonthControlsView'

export function MonthControlsScreen() {
  const controls = useMonthControls()

  return (
    <>
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
        onCloseAndCalculate={controls.onCloseAndCalculate}
        onApproveAndIssue={controls.onApproveAndIssue}
        onRequestArchive={controls.onRequestArchive}
        onPrintPayslip={controls.onPrintPayslip}
      />
      <ConfirmDialog
        open={controls.showArchiveConfirm}
        title="Zrušit uzávěrku?"
        description="Výpočty a vydané dokumenty budou zneplatněny. Měsíc se vrátí do stavu Rozpracováno."
        onConfirm={controls.onConfirmArchive}
        onCancel={controls.onCancelArchive}
      />
    </>
  )
}
