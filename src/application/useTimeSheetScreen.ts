import { useEffect, useMemo, useState } from 'react'
import { calculateMonthDays, calcMonthlySummary, formatDateCZ, isWeekend } from '../domain/payroll/calc'
import { buildTimeSheetStatementDocument, getTimeSheetStatementBlockingReason } from '../domain/documents/builders'
import { saveEmployeeMonth as saveEmployeeMonthApi } from '../infrastructure/api/monthStorage'
import { autosaveEmployeeMonthDraft } from './autosaveMonth'
import { defaultPaySlipInputs } from './defaults'
import { formatCompactNumber, formatMonthLabel } from './formatters'
import { useStore } from '../infrastructure/state/store'
import type { EmployeeMonth, ShiftType, TimeRecord } from '../domain/shared/types'
import { isTimeClosedOrLater, isTimeSavedOrLater } from '../domain/monthWorkflow'
import { printWithRetry } from '../adapters/browser/printWithRetry'

const SHIFTS: ShiftType[] = ['', 'ranní', 'odpolední', 'noční', 'přesčas', 'volno', 'dovolená', 'nemoc']

export function useTimeSheetScreen() {
  const employer = useStore(s => s.employer)
  const employees = useStore(s => s.employees)
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const recordsByEmployee = useStore(s => s.recordsByEmployee)
  const monthStatusByEmployee = useStore(s => s.monthStatusByEmployee)
  const payrollByEmployee = useStore(s => s.payrollByEmployee)
  const holidays = useStore(s => s.holidays)
  const month = useStore(s => s.currentMonth)
  const setMonth = useStore(s => s.setCurrentMonth)
  const updateRecord = useStore(s => s.updateRecord)
  const resetEmployeeMonth = useStore(s => s.resetEmployeeMonth)
  const prefillEmployeeMonth = useStore(s => s.prefillEmployeeMonth)
  const prefillSpecialEmployeeMonth = useStore(s => s.prefillSpecialEmployeeMonth)
  const paySlipInputsByEmployee = useStore(s => s.paySlipInputsByEmployee)
  const setPayrollMonthState = useStore(s => s.setPayrollMonthState)

  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)

  const employee = employees.find(item => item.id === selectedEmployeeId) || null
  const monthExists = selectedEmployeeId ? typeof monthStatusByEmployee[selectedEmployeeId]?.[month] !== 'undefined' : false
  const monthRecords = selectedEmployeeId && monthExists ? recordsByEmployee[selectedEmployeeId]?.[month] || [] : []
  const hasNoRows = monthExists && monthRecords.length === 0
  const inputs = selectedEmployeeId ? paySlipInputsByEmployee[selectedEmployeeId]?.[month] || defaultPaySlipInputs : defaultPaySlipInputs
  const monthStatus = selectedEmployeeId ? monthStatusByEmployee[selectedEmployeeId]?.[month] || 'empty' : 'empty'
  const payrollState = selectedEmployeeId ? payrollByEmployee[selectedEmployeeId]?.[month] : undefined

  const calcs = useMemo(
    () => employee ? calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays) : [],
    [employee, monthRecords, holidays, inputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(calcs), [calcs])
  const timeSummary = useMemo(() => ({
    monthlyFundHours: summary.monthlyFundHours,
    workedHours: summary.workedHours,
    workedDays: summary.workedDays,
    vacationHours: summary.totalVacation,
    sickHours: summary.totalSick,
    totalSaldo: summary.totalSaldo,
  }), [summary])
  const timeSheetDocument = payrollState?.timeSheetDocument || null
  const documentBlockedReason = hasNoRows
    ? ''
    : !employee || !selectedEmployeeId || !monthExists || !isTimeSavedOrLater(monthStatus)
    ? 'Výpis evidence lze otevřít až z uloženého měsíce ve stavu Evidence uložena nebo vyšším.'
    : getTimeSheetStatementBlockingReason({
        employeeId: selectedEmployeeId,
        month,
        status: monthStatus,
        records: monthRecords,
        paySlipInputs: inputs,
        timeSummary: payrollState?.timeSummary,
        createdAt: payrollState?.createdAt || new Date().toISOString(),
        updatedAt: payrollState?.updatedAt || new Date().toISOString(),
      }, employer)

  useEffect(() => {
    if (!employee || !selectedEmployeeId || !monthExists || !hasNoRows) return
    if (monthStatus !== 'draft' && monthStatus !== 'time_saved') return

    prefillEmployeeMonth(selectedEmployeeId, month)
  }, [employee, hasNoRows, month, monthExists, monthStatus, prefillEmployeeMonth, selectedEmployeeId])

  useEffect(() => {
    if (!employee || !selectedEmployeeId || !monthExists || hasNoRows) return
    if (monthStatus !== 'draft' && monthStatus !== 'time_saved') return

    const timeout = window.setTimeout(() => {
      autosaveEmployeeMonthDraft({
        employer,
        employee,
        employeeId: selectedEmployeeId,
        month,
        status: monthStatus,
        records: monthRecords,
        paySlipInputs: inputs,
        timeSummary,
        payrollState,
      }).catch((caughtError) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Automatické uložení evidence se nepodařilo.')
      })
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [employee, employer, hasNoRows, inputs, month, monthExists, monthRecords, monthStatus, payrollState, selectedEmployeeId, timeSummary])

  const onShiftChange = (index: number, shift: string) => {
    if (!employee || !selectedEmployeeId) return
    if (isTimeClosedOrLater(monthStatus) && !window.confirm('Změna evidence zneplatní spočítanou mzdu a vystavenou pásku. Pokračovat?')) {
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
    emptyState: !employee
      ? 'Vyberte zaměstnance.'
      : !monthExists
        ? 'Nejprve založte měsíc.'
        : hasNoRows
          ? 'Evidence se automaticky předvyplňuje.'
          : '',
    info,
    error,
    showDocumentPreview,
    timeSheetDocument,
    canPreviewDocument: !documentBlockedReason && Boolean(timeSheetDocument),
    documentBlockedReason: documentBlockedReason || '',
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
      setShowDocumentPreview(false)
    },
    onResetMonth: () => {
      if (!selectedEmployeeId) return
      resetEmployeeMonth(selectedEmployeeId, month)
    },
    canLoadSpecialPreset: Boolean(selectedEmployeeId && monthExists && (monthStatus === 'draft' || monthStatus === 'time_saved')),
    onLoadSpecialPreset: () => {
      if (!selectedEmployeeId) return
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      if (monthStatus !== 'draft' && monthStatus !== 'time_saved') {
        setInfo('Speciální přednastavení lze načíst jen před uzavřením evidence.')
        return
      }
      prefillSpecialEmployeeMonth(selectedEmployeeId, month)
      setInfo('Speciální přednastavení směn bylo načteno.')
      setError('')
    },
    onToggleDocumentPreview: () => {
      setShowDocumentPreview(value => !value)
    },
    onPrintDocument: async () => {
      if (!employee || !selectedEmployeeId || documentBlockedReason) {
        setError(documentBlockedReason || 'Výpis evidence nelze tisknout.')
        return
      }
      if (timeSheetDocument?.lifecycleStatus === 'issued') {
        const confirmed = window.confirm('Výpis evidence už byl vystaven. Chcete vytvořit novou verzi dokumentu?')
        if (!confirmed) {
          setInfo('Výpis evidence už je vystaven. Pro zachování původní verze nebyla vytvořena nová emise.')
          return
        }
      }
      const sourceMonth: EmployeeMonth = {
        employeeId: selectedEmployeeId,
        month,
        status: monthStatus,
        records: monthRecords,
        paySlipInputs: inputs,
        timeSummary: payrollState?.timeSummary || timeSummary,
        createdAt: payrollState?.createdAt || new Date().toISOString(),
        updatedAt: payrollState?.updatedAt || new Date().toISOString(),
        timeSheetDocument,
        auditTrail: [
          ...(payrollState?.auditTrail || []),
          {
            at: new Date().toISOString(),
            action: timeSheetDocument?.lifecycleStatus === 'issued' ? 'reissue-time-sheet-document' : 'issue-time-sheet-document',
            note: timeSheetDocument?.lifecycleStatus === 'issued'
              ? `Nová verze výpisu evidence po předchozí verzi ${timeSheetDocument.version}.`
              : undefined,
          },
        ],
      }
      const document = buildTimeSheetStatementDocument(employee, employer, sourceMonth, holidays, timeSheetDocument)
      const issuedDocument = {
        ...document,
        lifecycleStatus: 'issued' as const,
        issuedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      try {
        await saveEmployeeMonthApi(selectedEmployeeId, month, { ...sourceMonth, timeSheetDocument: issuedDocument, employer, employee })
        setPayrollMonthState(selectedEmployeeId, month, {
          timeSheetDocument: issuedDocument,
          updatedAt: issuedDocument.updatedAt,
          auditTrail: sourceMonth.auditTrail,
        })
        setInfo('Výpis evidence byl vystaven.')
        setError('')
        printWithRetry('time-sheet-document', () => {
          setError('Tisk výpisu evidence se nepodařilo spustit. Zkuste akci zopakovat.')
        })
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Výpis evidence se nepodařilo vystavit.')
      }
    },
    onShiftChange,
    onArrivalChange: (index: number, value: string) => {
      if (!selectedEmployeeId) return
      if (isTimeClosedOrLater(monthStatus) && !window.confirm('Změna evidence zneplatní spočítanou mzdu a vystavenou pásku. Pokračovat?')) {
        return
      }
      updateRecord(selectedEmployeeId, month, index, { arrival: value })
    },
    onDepartureChange: (index: number, value: string) => {
      if (!selectedEmployeeId) return
      if (isTimeClosedOrLater(monthStatus) && !window.confirm('Změna evidence zneplatní spočítanou mzdu a vystavenou pásku. Pokračovat?')) {
        return
      }
      updateRecord(selectedEmployeeId, month, index, { departure: value })
    },
  }
}
