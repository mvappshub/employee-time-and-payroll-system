import { useHolidaysScreen } from './application/useHolidaysScreen'
import { HolidaysView } from './screens/holidays/HolidaysView'

export default function Holidays() {
  const screen = useHolidaysScreen()

  return (
    <HolidaysView
      holidays={screen.holidays}
      newDate={screen.newDate}
      newName={screen.newName}
      onNewDateChange={screen.onNewDateChange}
      onNewNameChange={screen.onNewNameChange}
      onHolidayChange={screen.onHolidayChange}
      onHolidayRemove={screen.onHolidayRemove}
      onHolidayAdd={screen.onHolidayAdd}
    />
  )
}
