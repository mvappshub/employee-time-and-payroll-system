import { useMemo } from 'react'
import { calculateMonthDays, calcMonthlySummary, formatDateCZ, isWeekend } from '../domain/payroll/calc'
import { defaultPaySlipInputs } from './defaults'
import { formatCompactNumber, formatMonthLabel } from './formatters'
import { useStore } from '../infrastructure/state/store'
import type { ShiftType, TimeRecord } from '../domain/shared/types'

const SHIFTS: ShiftType[] = ['', 'ranní', 'odpolední', 'noční', 'přesčas', 'volno', 'dovolená', 'nemoc']

export function useTimeSheetScreen() {
  const employees = useStore(s => s.employees)
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const recordsByEmployee = useStore(s => s.recordsByEmployee)
  const monthStatusByEmployee = useStore(s => s.monthStatusByEmployee)
  const holidays = useStore(s => s.holidays)
  const month = useStore(s => s.currentMonth)
  const setMonth = useStore(s => s.setCurrentMonth)
  const updateRecord = useStore(s => s.updateRecord)
  const resetEmployeeMonth = useStore(s => s.resetEmployeeMonth)
  const paySlipInputsByEmployee = useStore(s => s.paySlipInputsByEmployee)
  const initEmployeeMonth = useStore(s => s.initEmployeeMonth)

  const employee = employees.find(item => item.id === selectedEmployeeId) || null
  const monthRecords = selectedEmployeeId ? recordsByEmployee[selectedEmployeeId]?.[month] || [] : []
  const inputs = selectedEmployeeId ? paySlipInputsByEmployee[selectedEmployeeId]?.[month] || defaultPaySlipInputs : defaultPaySlipInputs
  const monthStatus = selectedEmployeeId ? monthStatusByEmployee[selectedEmployeeId]?.[month] || 'empty' : 'empty'

  const calcs = useMemo(
    () => employee ? calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays) : [],
    [employee, monthRecords, holidays, inputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(calcs), [calcs])

  const onShiftChange = (index: number, shift: string) => {
    if (!employee || !selectedEmployeeId) return
    if ((monthStatus === 'time_closed' || monthStatus === 'payroll_calculated' || monthStatus === 'payroll_approved' || monthStatus === 'payslip_issued') && !window.confirm('Změna evidence zneplatní spočítanou mzdu a vystavenou pásku. Pokračovat?')) {
      return
    }
    const update: Partial<TimeRecord> = { shift: shift as ShiftType }
    if (['volno', 'dovolená', 'nemoc', ''].includes(shift)) {
      update.arrival = ''
      update.departure = ''
    } else if (shift === 'ranní') {
      update.arrival = employee.shiftStart
      update.departure = employee.shiftEnd
    }
    updateRecord(selectedEmployeeId, month, index, update)
  }

  return {
    title: employee ? `Evidence docházky · ${employee.name}` : 'Evidence docházky',
    month,
    monthLabel: formatMonthLabel(month),
    emptyState: employee ? '' : 'Nejprve vyberte zaměstnance v kartotéce.',
    shiftOptions: SHIFTS.map(value => ({ value, label: value || '—' })),
    summary: {
      calendarWorkDays: summary.calendarWorkDays,
      freeDaysInMonth: summary.freeDaysInMonth,
      holidayDaysInMonth: summary.holidayDaysInMonth,
      monthlyFundHours: summary.monthlyFundHours.toFixed(1),
      workedHours: summary.workedHours.toFixed(1),
      workHoursWH: summary.workHoursWH.toFixed(1),
      totalHolidayCredit: formatCompactNumber(summary.totalHolidayCredit),
      totalVacation: formatCompactNumber(summary.totalVacation),
      totalSick: formatCompactNumber(summary.totalSick),
      totalNight: formatCompactNumber(summary.totalNight),
      totalWeekend: formatCompactNumber(summary.totalWeekend),
      totalHolidayTotal: formatCompactNumber(summary.totalHolidayTotal),
      totalOvertime: formatCompactNumber(summary.totalOvertime),
      totalSaldo: summary.totalSaldo,
    },
    rows: calcs.map((calc, index) => {
      const record = monthRecords[index]
      const weekend = isWeekend(calc.date)
      const rowClass = calc.isHoliday ? 'bg-amber-50' : weekend ? 'bg-gray-100' : (index % 2 ? 'bg-gray-50' : '')
      return {
        key: calc.date,
        dayName: calc.dayName,
        dateLabel: formatDateCZ(calc.date),
        shift: record?.shift || '',
        arrival: record?.arrival || '',
        departure: record?.departure || '',
        breakHours: formatCompactNumber(calc.breakHours),
        worked: formatCompactNumber(calc.worked),
        planHours: calc.planHours > 0 ? calc.planHours.toFixed(1) : '',
        holidayCredit: formatCompactNumber(calc.holidayCredit),
        vacation: formatCompactNumber(calc.vacation),
        sick: formatCompactNumber(calc.sick),
        nightHours: formatCompactNumber(calc.nightHours),
        weekendHours: formatCompactNumber(calc.weekendHours),
        holidayTotal: formatCompactNumber(calc.holidayTotal),
        overtime: formatCompactNumber(calc.overtime),
        saldo: calc.saldo,
        holidayName: calc.holidayName,
        isWeekend: weekend,
        rowClass,
        isTimeEditable: !['volno', 'dovolená', 'nemoc', ''].includes(record?.shift || ''),
      }
    }),
    onMonthChange: (nextMonth: string) => {
      setMonth(nextMonth)
      if (selectedEmployeeId) initEmployeeMonth(selectedEmployeeId, nextMonth)
    },
    onResetMonth: () => {
      if (!selectedEmployeeId) return
      resetEmployeeMonth(selectedEmployeeId, month)
    },
    onShiftChange,
    onArrivalChange: (index: number, value: string) => {
      if (!selectedEmployeeId) return
      if ((monthStatus === 'time_closed' || monthStatus === 'payroll_calculated' || monthStatus === 'payroll_approved' || monthStatus === 'payslip_issued') && !window.confirm('Změna evidence zneplatní spočítanou mzdu a vystavenou pásku. Pokračovat?')) {
        return
      }
      updateRecord(selectedEmployeeId, month, index, { arrival: value })
    },
    onDepartureChange: (index: number, value: string) => {
      if (!selectedEmployeeId) return
      if ((monthStatus === 'time_closed' || monthStatus === 'payroll_calculated' || monthStatus === 'payroll_approved' || monthStatus === 'payslip_issued') && !window.confirm('Změna evidence zneplatní spočítanou mzdu a vystavenou pásku. Pokračovat?')) {
        return
      }
      updateRecord(selectedEmployeeId, month, index, { departure: value })
    },
  }
}
