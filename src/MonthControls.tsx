import { useMonthControls } from './application/useMonthControls'
import { MonthControlsView } from './screens/month-controls/MonthControlsView'

export default function MonthControls() {
  const controls = useMonthControls()

  return (
    <MonthControlsView
      error={controls.error}
      info={controls.info}
      currentStatus={controls.currentStatus}
      onLoad={controls.onLoad}
      onSave={controls.onSave}
      onPrefill={controls.onPrefill}
      onCloseMonth={controls.onCloseMonth}
      onApproveMonth={controls.onApproveMonth}
    />
  )
}
