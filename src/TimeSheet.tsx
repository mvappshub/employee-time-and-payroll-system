import { useTimeSheetScreen } from './application/useTimeSheetScreen'
import { TimeSheetView } from './screens/timesheet/TimeSheetView'

export default function TimeSheet() {
  const screen = useTimeSheetScreen()

  return (
    <TimeSheetView
      title={screen.title}
      month={screen.month}
      shiftOptions={screen.shiftOptions}
      summary={screen.summary}
      rows={screen.rows}
      onMonthChange={screen.onMonthChange}
      onResetMonth={screen.onResetMonth}
      onShiftChange={screen.onShiftChange}
      onArrivalChange={screen.onArrivalChange}
      onDepartureChange={screen.onDepartureChange}
    />
  )
}
