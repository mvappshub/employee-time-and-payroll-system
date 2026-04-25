import { useEffect, useMemo, useState } from 'react'
import { calcAverageSourceSnapshot, calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { AUTOMATIC_PHV_ERROR_MESSAGE, assertAvailableAverageEarnings } from '../domain/payroll/phv'
import { getLegalConstantsSnapshot } from '../domain/payroll/legalConstants'
import {
  fetchQuarterlyPhv,
  loadEmployeeMonth,
  saveEmployeeMonth as saveEmployeeMonthApi,
  type SavedMonthRecord,
} from '../infrastructure/api/monthStorage'
import { useStore } from '../infrastructure/state/store'
import { defaultPaySlipInputs } from './defaults'
import type { EmployeeMonth, EmployeeSettings, MonthStatus, TimeRecord, TimeSummary } from '../domain/shared/types'
import { formatMonthLabel } from './formatters'

function statusLabel(status: MonthStatus): string {
  switch (status) {
    case 'draft': return 'Rozpracováno'
    case 'time_saved': return 'Evidence uložena'
    case 'time_closed': return 'Evidence uzavřena'
    case 'payroll_calculated': return 'Mzda spočítána'
    case 'payroll_approved': return 'Mzda schválena'
    case 'payslip_issued': return 'Výplatní páska vystavena'
    default: return 'Bez měsíce'
  }
}

function nextStepLabel(status: MonthStatus): string {
  switch (status) {
    case 'empty':
    case 'draft':
      return 'Uložit evidenci'
    case 'time_saved':
      return 'Uzavřít evidenci'
    case 'time_closed':
      return 'Spočítat mzdu'
    case 'payroll_calculated':
      return 'Schválit mzdu'
    case 'payroll_approved':
      return 'Vystavit výplatní pásku'
    case 'payslip_issued':
      return 'Tisk PDF'
    default:
      return 'Založit měsíc'
  }
}

function buildTimeSummary(summary: ReturnType<typeof calcMonthlySummary>): TimeSummary {
  return {
    monthlyFundHours: summary.monthlyFundHours,
    workedHours: summary.workedHours,
    workedDays: summary.workedDays,
    vacationHours: summary.totalVacation,
    sickHours: summary.totalSick,
    totalSaldo: summary.totalSaldo,
  }
}

function validateBeforeClose(
  monthRecords: TimeRecord[],
  employee: EmployeeSettings,
  monthlyFundHours: number,
): string[] {
  const errors: string[] = []

  if (monthlyFundHours <= 0) {
    errors.push('Měsíc nelze uzavřít bez kladného měsíčního fondu hodin.')
  }

  monthRecords.forEach((record) => {
    const hasArrival = !!record.arrival
    const hasDeparture = !!record.departure
    const isWorkShift = ['ranní', 'odpolední', 'noční', 'přesčas'].includes(record.shift)
    const isAbsenceShift = ['volno', 'dovolená', 'nemoc', ''].includes(record.shift)

    if (hasArrival !== hasDeparture) {
      errors.push(`Den ${record.date} má neúplně zadaný příchod nebo odchod.`)
    }

    if (isAbsenceShift && (hasArrival || hasDeparture)) {
      errors.push(`Den ${record.date} kombinuje absenci nebo volno s odpracovaným časem.`)
    }

    if (isWorkShift && (!hasArrival || !hasDeparture)) {
      errors.push(`Den ${record.date} má směnu bez kompletního času příchodu a odchodu.`)
    }

    if (record.shift === 'přesčas' && !employee.overtimeAllowed) {
      errors.push(`Den ${record.date} eviduje přesčas, ale zaměstnanec nemá povolený přesčasový režim.`)
    }
  })

  return Array.from(new Set(errors))
}

export function useMonthControls() {
  const employer = useStore(s => s.employer)
  const employees = useStore(s => s.employees)
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const recordsByEmployee = useStore(s => s.recordsByEmployee)
  const holidays = useStore(s => s.holidays)
  const currentMonth = useStore(s => s.currentMonth)
  const paySlipInputsByEmployee = useStore(s => s.paySlipInputsByEmployee)
  const monthStatusByEmployee = useStore(s => s.monthStatusByEmployee)
  const payrollByEmployee = useStore(s => s.payrollByEmployee)
  const initEmployeeMonth = useStore(s => s.initEmployeeMonth)
  const prefillEmployeeMonth = useStore(s => s.prefillEmployeeMonth)
  const hydrateEmployeeMonth = useStore(s => s.hydrateEmployeeMonth)
  const saveEmployeeMonth = useStore(s => s.saveEmployeeMonth)
  const closeEmployeeTime = useStore(s => s.closeEmployeeTime)
  const calculateEmployeePayroll = useStore(s => s.calculateEmployeePayroll)
  const approveEmployeePayroll = useStore(s => s.approveEmployeePayroll)
  const issueEmployeePayslip = useStore(s => s.issueEmployeePayslip)
  const setMonthStatus = useStore(s => s.setMonthStatus)

  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [success, setSuccess] = useState('')

  const employee = employees.find(item => item.id === selectedEmployeeId) || null
  const inputs = selectedEmployeeId ? paySlipInputsByEmployee[selectedEmployeeId]?.[currentMonth] || defaultPaySlipInputs : defaultPaySlipInputs
  const monthRecords = selectedEmployeeId ? recordsByEmployee[selectedEmployeeId]?.[currentMonth] || [] : []
  const currentStatus = selectedEmployeeId ? monthStatusByEmployee[selectedEmployeeId]?.[currentMonth] || 'empty' : 'empty'
  const payrollState = selectedEmployeeId ? payrollByEmployee[selectedEmployeeId]?.[currentMonth] : undefined

  const days = useMemo(
    () => employee ? calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays) : [],
    [employee, monthRecords, holidays, inputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(days), [days])

  useEffect(() => {
    if (selectedEmployeeId) {
      initEmployeeMonth(selectedEmployeeId, currentMonth)
    }
  }, [currentMonth, initEmployeeMonth, selectedEmployeeId])

  const buildSavedMonth = (status: MonthStatus, extra: Partial<SavedMonthRecord> = {}): SavedMonthRecord | null => {
    if (!employee || !selectedEmployeeId) return null
    const nowIso = new Date().toISOString()
    return {
      employeeId: selectedEmployeeId,
      month: currentMonth,
      status,
      employer,
      employee,
      records: monthRecords,
      paySlipInputs: inputs,
      timeSummary: buildTimeSummary(summary),
      payrollResult: payrollState?.payrollResult,
      calculationSnapshot: payrollState?.calculationSnapshot,
      payslipDocument: payrollState?.payslipDocument || null,
      auditTrail: payrollState?.auditTrail || [],
      createdAt: payrollState?.createdAt || nowIso,
      updatedAt: nowIso,
      closedAt: payrollState?.closedAt,
      approvedAt: payrollState?.approvedAt,
      issuedAt: payrollState?.issuedAt,
      invalidatedAt: payrollState?.invalidatedAt,
      invalidationReason: payrollState?.invalidationReason,
      ...extra,
    }
  }

  const buttonState = {
    canLoad: !!selectedEmployeeId,
    canSave: !!selectedEmployeeId,
    canPrefill: !!selectedEmployeeId,
    canClose: currentStatus === 'draft' || currentStatus === 'time_saved',
    canCalculatePayroll: currentStatus === 'time_closed' || currentStatus === 'payroll_calculated',
    canApprove: currentStatus === 'payroll_calculated',
    canIssuePayslip: currentStatus === 'payroll_approved',
    canPrint: currentStatus === 'payslip_issued',
  }

  return {
    error,
    info,
    success,
    currentStatus,
    currentStatusLabel: statusLabel(currentStatus),
    selectedEmployeeName: employee?.name || 'Nevybrán',
    monthLabel: formatMonthLabel(currentMonth),
    nextStepLabel: nextStepLabel(currentStatus),
    lastActionLabel: payrollState?.updatedAt || payrollState?.issuedAt || payrollState?.approvedAt || payrollState?.closedAt || '—',
    buttonState,
    onLoad: async () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      const loaded = await loadEmployeeMonth(selectedEmployeeId, currentMonth)
      if (!loaded) {
        setInfo('Pro tento měsíc zatím není uložený záznam.')
        return
      }
      hydrateEmployeeMonth(selectedEmployeeId, currentMonth, loaded as EmployeeMonth)
      setSuccess('Měsíc byl načten.')
    },
    onSave: async () => {
      if (!employee || !selectedEmployeeId) {
        setInfo('Nejprve vyberte zaměstnance.')
        return
      }
      setError('')
      setInfo('')
      setSuccess('')

      try {
        const averageResponse = await fetchQuarterlyPhv(currentMonth, selectedEmployeeId, employee)
        const averageHourlyEarnings = averageResponse.averageHourlyEarnings || 0
        const averageSource = averageHourlyEarnings > 0
          ? calcAverageSourceSnapshot(
              employee,
              summary,
              inputs.manualReward,
              inputs.includeManualRewardInAverage,
              averageHourlyEarnings,
            )
          : undefined
        const saved = buildSavedMonth('time_saved', {
          ...averageSource,
          snapshot: averageHourlyEarnings > 0
            ? {
                grossWage: calcPaySlip(employee, summary, inputs.manualReward, inputs.unworked, averageHourlyEarnings, currentMonth).hrubaMzda,
                workedHours: summary.workedHours,
                totalSaldo: summary.totalSaldo,
                savedAt: new Date().toISOString(),
              }
            : undefined,
        })
        if (!saved) return
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
        saveEmployeeMonth(selectedEmployeeId, currentMonth)
        setSuccess('Evidence byla uložena.')
        if (!averageResponse.averageHourlyEarnings) {
          setInfo(averageResponse.reason || AUTOMATIC_PHV_ERROR_MESSAGE)
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onPrefill: () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      prefillEmployeeMonth(selectedEmployeeId, currentMonth)
      setSuccess('Měsíc byl předvyplněn podle směnového plánu.')
    },
    onCloseMonth: async () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      if (!(currentStatus === 'draft' || currentStatus === 'time_saved')) {
        setInfo('Evidenci lze uzavřít až po založení nebo uložení měsíce.')
        return
      }
      if (!employee) {
        setError('Nejprve vyberte zaměstnance.')
        return
      }
      const validationErrors = validateBeforeClose(monthRecords, employee, summary.monthlyFundHours)
      if (validationErrors.length > 0) {
        setError(validationErrors.join(' '))
        return
      }
      const saved = buildSavedMonth('time_closed', { closedAt: new Date().toISOString() })
      if (!saved) return
      await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
      closeEmployeeTime(selectedEmployeeId, currentMonth)
      setSuccess('Evidence byla uzavřena.')
    },
    onCalculatePayroll: async () => {
      if (!employee || !selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      if (currentStatus !== 'time_closed' && currentStatus !== 'payroll_calculated') {
        setInfo('Mzdu lze spočítat až po uzavření evidence.')
        return
      }
      try {
        const averageResponse = await fetchQuarterlyPhv(currentMonth, selectedEmployeeId, employee)
        const averageHourlyEarnings = assertAvailableAverageEarnings(averageResponse)
        const payrollResult = calcPaySlip(employee, summary, inputs.manualReward, inputs.unworked, averageHourlyEarnings, currentMonth)
        const saved = buildSavedMonth('payroll_calculated', {
          payrollResult,
          calculationSnapshot: {
            averageEarningsSource: averageResponse.sourceType,
            averageHourlyEarnings,
            legalConstants: getLegalConstantsSnapshot(currentMonth),
            calculatedAt: new Date().toISOString(),
          },
        })
        if (!saved) return
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
        calculateEmployeePayroll(selectedEmployeeId, currentMonth, {
          payrollResult,
          calculationSnapshot: saved.calculationSnapshot,
          timeSummary: saved.timeSummary,
        })
        setMonthStatus(selectedEmployeeId, currentMonth, 'payroll_calculated')
        setSuccess('Mzda byla spočítána.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onApproveMonth: async () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      if (currentStatus !== 'payroll_calculated') {
        setInfo('Mzdu lze schválit až po výpočtu mzdy.')
        return
      }
      const saved = buildSavedMonth('payroll_approved', { approvedAt: new Date().toISOString() })
      if (!saved) return
      await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
      approveEmployeePayroll(selectedEmployeeId, currentMonth)
      setSuccess('Mzda byla schválena.')
    },
    onIssuePayslip: async () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      if (currentStatus !== 'payroll_approved') {
        setInfo('Výplatní pásku lze vystavit až po schválení mzdy.')
        return
      }
      const nowIso = new Date().toISOString()
      const saved = buildSavedMonth('payslip_issued', {
        payslipDocument: { issuedAt: nowIso, month: currentMonth },
        issuedAt: nowIso,
      })
      if (!saved) return
      await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
      issueEmployeePayslip(selectedEmployeeId, currentMonth)
      setSuccess('Výplatní páska byla vystavena.')
    },
  }
}
