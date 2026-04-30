/** @deprecated Use screens/timesheet/TimeTrackingMainScreen through app composition. */
import { useTimeSheetScreen } from './application/useTimeSheetScreen'
import { TimeSheetView } from './screens/timesheet/TimeSheetView'

export default function TimeSheet() {
  const screen = useTimeSheetScreen()

  return (
    <TimeSheetView
      title={screen.title}
      month={screen.month}
      emptyState={screen.emptyState}
      info={screen.info}
      error={screen.error}
      showDocumentPreview={screen.showDocumentPreview}
      timeSheetDocument={screen.timeSheetDocument}
      canPreviewDocument={screen.canPreviewDocument}
      documentBlockedReason={screen.documentBlockedReason}
      shiftOptions={screen.shiftOptions}
      summary={screen.summary}
      rows={screen.rows}
      onMonthChange={screen.onMonthChange}
      onResetMonth={screen.onResetMonth}
      onToggleDocumentPreview={screen.onToggleDocumentPreview}
      onPrintDocument={screen.onPrintDocument}
      onShiftChange={screen.onShiftChange}
      onArrivalChange={screen.onArrivalChange}
      onDepartureChange={screen.onDepartureChange}
    />
  )
}
