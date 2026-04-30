/** @deprecated Use screens/month-controls/MonthControlsScreen through app composition. */
import { useMonthControls } from './application/useMonthControls'
import { MonthControlsView } from './screens/month-controls/MonthControlsView'

export default function MonthControls() {
  const controls = useMonthControls()

  return (
    <MonthControlsView
      error={controls.error}
      onLoad={controls.onLoad}
      onSave={controls.onSave}
      onPrefill={controls.onPrefill}
    />
  )
}
