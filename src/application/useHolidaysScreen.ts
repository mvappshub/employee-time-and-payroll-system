import { useState } from 'react'
import { useStore } from '../infrastructure/state/store'

export function useHolidaysScreen() {
  const holidays = useStore(s => s.holidays)
  const addHoliday = useStore(s => s.addHoliday)
  const removeHoliday = useStore(s => s.removeHoliday)
  const updateHoliday = useStore(s => s.updateHoliday)
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')

  return {
    holidays,
    newDate,
    newName,
    onNewDateChange: setNewDate,
    onNewNameChange: setNewName,
    onHolidayChange: updateHoliday,
    onHolidayRemove: removeHoliday,
    onHolidayAdd: () => {
      if (!newDate || !newName) return
      addHoliday({ date: newDate, name: newName })
      setNewDate('')
      setNewName('')
    },
  }
}
