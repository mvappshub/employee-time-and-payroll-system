import { useTimeSheetScreen } from './application/useTimeSheetScreen'
import { TimeSheetView } from './screens/timesheet/TimeSheetView'
import { printDocumentById } from './screens/documents/print'

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
      onPrintDocument={async () => {
        await screen.onPrintDocument()
        printDocumentById('time-sheet-document')
      }}
      onShiftChange={screen.onShiftChange}
      onArrivalChange={screen.onArrivalChange}
      onDepartureChange={screen.onDepartureChange}
    />
  )
}
