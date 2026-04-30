import { useMemo, useState } from 'react'
import { calcAverageSourceSnapshot, calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { buildIssuedPayslipDocument, buildTimeSheetStatementDocument } from '../domain/documents/builders'
import { AUTOMATIC_PHV_ERROR_MESSAGE, assertAvailableAverageEarnings } from '../domain/payroll/phv'
import { getLegalConstantsSnapshot } from '../domain/payroll/legalConstants'
import {
  fetchQuarterlyPhv,
  loadEmployeeMonth,
  saveEmployeeMonth as saveEmployeeMonthApi,
} from '../infrastructure/api/monthStorage'
import { buildEmployeeMonthRecord, type SavedMonthRecord } from '../domain/month/employeeMonth'
import { buildInitialEmployeeMonthRecords, useStore } from '../infrastructure/state/store'
import { defaultPaySlipInputs } from './defaults'
import type { EmployeeMonth, EmployeeSettings, MonthStatus, TimeRecord } from '../domain/shared/types'
import { formatMonthLabel } from './formatters'
import {
  canApproveAndIssue,
  canCalculatePayroll,
  canCloseAndCalculate,
  canIssuePayslip,
  canPrintPayslip,
  canReopenMonth,
  describeMonthStatus,
} from '../domain/monthWorkflow'
import { printWithRetry } from '../adapters/browser/printWithRetry'
import { buildTimeSummary } from './month/buildTimeSummary'

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
  const setPayrollMonthState = useStore(s => s.setPayrollMonthState)
  const setSection = useStore(s => s.setSection)

  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [success, setSuccess] = useState('')
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const employee = employees.find(item => item.id === selectedEmployeeId) || null
  const inputs = selectedEmployeeId ? paySlipInputsByEmployee[selectedEmployeeId]?.[currentMonth] || defaultPaySlipInputs : defaultPaySlipInputs
  const monthRecords = selectedEmployeeId ? recordsByEmployee[selectedEmployeeId]?.[currentMonth] || [] : []
  const currentStatus = selectedEmployeeId ? monthStatusByEmployee[selectedEmployeeId]?.[currentMonth] || 'empty' : 'empty'
  const payrollState = selectedEmployeeId ? payrollByEmployee[selectedEmployeeId]?.[currentMonth] : undefined
  const monthExists = selectedEmployeeId ? typeof monthStatusByEmployee[selectedEmployeeId]?.[currentMonth] !== 'undefined' : false
  const payrollEmployee = employee ? { ...employee, holidayCompensationMode: inputs.holidayCompensationMode } : null
  const statusDescription = describeMonthStatus(currentStatus)

  const days = useMemo(
    () => employee ? calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays) : [],
    [employee, monthRecords, holidays, inputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(days), [days])

  const buildSavedMonth = (status: MonthStatus, extra: Partial<SavedMonthRecord> = {}): SavedMonthRecord | null => {
    if (!employee || !selectedEmployeeId) return null
    return buildEmployeeMonthRecord({
      employeeId: selectedEmployeeId,
      month: currentMonth,
      status,
      employer,
      employee,
      records: monthRecords,
      paySlipInputs: inputs,
      existing: payrollState ? {
        ...payrollState,
        employeeId: selectedEmployeeId,
        month: currentMonth,
        status: currentStatus,
        employee,
        employer,
        records: monthRecords,
        paySlipInputs: inputs,
      } : null,
      timeSummary: buildTimeSummary(summary),
      payrollResult: payrollState?.payrollResult,
      calculationSnapshot: payrollState?.calculationSnapshot,
      timeSheetDocument: payrollState?.timeSheetDocument || null,
      payslipDocument: payrollState?.payslipDocument || null,
      auditTrail: payrollState?.auditTrail || [],
      closedAt: payrollState?.closedAt,
      approvedAt: payrollState?.approvedAt,
      issuedAt: payrollState?.issuedAt,
      invalidatedAt: payrollState?.invalidatedAt,
      invalidationReason: payrollState?.invalidationReason,
      ...extra,
    })
  }

  const buttonState = {
    canLoad: !!selectedEmployeeId && monthExists,
    canInitMonth: !!selectedEmployeeId && !monthExists,
    canSave: !!selectedEmployeeId && monthExists && canCloseAndCalculate(currentStatus),
    canPrefill: !!selectedEmployeeId && monthExists && canCloseAndCalculate(currentStatus),
    canClose: !!selectedEmployeeId && monthExists && canCloseAndCalculate(currentStatus),
    canCloseAndCalculate: !!selectedEmployeeId && monthExists && canCloseAndCalculate(currentStatus),
    canCalculatePayroll: !!selectedEmployeeId && monthExists && canCalculatePayroll(currentStatus),
    canApprove: !!selectedEmployeeId && monthExists && canApproveAndIssue(currentStatus),
    canApproveAndIssue: !!selectedEmployeeId && monthExists && canApproveAndIssue(currentStatus),
    canIssuePayslip: !!selectedEmployeeId && monthExists && canIssuePayslip(currentStatus),
    canRequestArchive: !!selectedEmployeeId && monthExists && canReopenMonth(currentStatus),
    canPrint: !!selectedEmployeeId && monthExists && canPrintPayslip(currentStatus),
  }

  return {
    error,
    info,
    success,
    currentStatus,
    currentStatusLabel: statusDescription.controlsLabel,
    selectedEmployeeName: employee?.name || 'Nevybrán',
    monthLabel: formatMonthLabel(currentMonth),
    nextStepLabel: statusDescription.nextStepLabel,
    lastActionLabel: payrollState?.updatedAt || payrollState?.issuedAt || payrollState?.approvedAt || payrollState?.closedAt || '—',
    monthExists,
    showArchiveConfirm,
    buttonState,
    onRequestArchive: () => {
      setShowArchiveConfirm(true)
    },
    onCancelArchive: () => {
      setShowArchiveConfirm(false)
    },
    onConfirmArchive: async () => {
      if (!selectedEmployeeId || !employee || !monthExists) {
        setInfo('Nejprve vyberte existující měsíc.')
        return
      }
      setShowArchiveConfirm(false)
      const nowIso = new Date().toISOString()
      const archived = buildEmployeeMonthRecord({
        employeeId: selectedEmployeeId,
        month: currentMonth,
        status: 'draft',
        employer,
        employee,
        records: monthRecords,
        paySlipInputs: inputs,
        existing: payrollState ? {
          ...payrollState,
          employeeId: selectedEmployeeId,
          month: currentMonth,
          status: currentStatus,
          employee,
          employer,
          records: monthRecords,
          paySlipInputs: inputs,
        } : null,
        timeSummary: buildTimeSummary(summary),
        payrollResult: undefined,
        calculationSnapshot: undefined,
        timeSheetDocument: null,
        payslipDocument: null,
        auditTrail: [
          ...(payrollState?.auditTrail || []),
          { at: nowIso, action: 'undo-closure' },
        ],
        closedAt: undefined,
        approvedAt: undefined,
        issuedAt: undefined,
        invalidatedAt: nowIso,
        invalidationReason: 'Zrušení uzávěrky a návrat k úpravám.',
      })
      archived.payrollResult = undefined
      archived.calculationSnapshot = undefined
      archived.timeSheetDocument = null
      archived.payslipDocument = null
      delete archived.closedAt
      delete archived.approvedAt
      delete archived.issuedAt
      await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, archived)
      hydrateEmployeeMonth(selectedEmployeeId, currentMonth, archived as EmployeeMonth)
      setSuccess('Měsíc byl vrácen do rozpracovaného stavu.')
      setError('')
      setInfo('')
    },
    onPrintPayslip: (documentId = 'issued-payslip-document') => {
      if (!buttonState.canPrint) return
      setSection('payroll')
      printWithRetry(documentId, () => {
        setError('Tisk výplatní pásky se nepodařilo spustit. Zkuste akci zopakovat.')
      })
    },
    onInitMonth: async () => {
      if (!selectedEmployeeId || !employee) {
        setInfo('Vyberte zaměstnance.')
        return
      }
      if (monthExists) {
        setInfo('Měsíc už existuje.')
        return
      }
      setError('')
      setInfo('')
      setSuccess('')
      const records = buildInitialEmployeeMonthRecords(currentMonth, employee)
      const initialSummary = calcMonthlySummary(calculateMonthDays(records, employee, holidays, defaultPaySlipInputs.sickCarryoverDays))
      const draft = buildEmployeeMonthRecord({
        employeeId: selectedEmployeeId,
        month: currentMonth,
        status: 'draft',
        employer,
        employee,
        records,
        paySlipInputs: defaultPaySlipInputs,
        timeSummary: {
          monthlyFundHours: initialSummary.monthlyFundHours,
          workedHours: initialSummary.workedHours,
          workedDays: initialSummary.workedDays,
          vacationHours: initialSummary.totalVacation,
          sickHours: initialSummary.totalSick,
          totalSaldo: initialSummary.totalSaldo,
        },
        auditTrail: [{ at: new Date().toISOString(), action: 'init-month' }],
      })
      try {
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, draft)
        initEmployeeMonth(selectedEmployeeId, currentMonth)
        hydrateEmployeeMonth(selectedEmployeeId, currentMonth, draft as EmployeeMonth)
        setSection('time-tracking')
        setSuccess('Měsíc byl založen.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Měsíc se nepodařilo založit.')
      }
    },
    onLoad: async () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      try {
        const loaded = await loadEmployeeMonth(selectedEmployeeId, currentMonth)
        if (!loaded) {
          setInfo('Pro tento měsíc zatím není uložený záznam.')
          return
        }
        hydrateEmployeeMonth(selectedEmployeeId, currentMonth, loaded as EmployeeMonth)
        setSuccess('Měsíc byl načten.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Měsíc se nepodařilo načíst.')
      }
    },
    onSave: async () => {
      if (!employee || !selectedEmployeeId) {
        setInfo('Nejprve vyberte zaměstnance.')
        return
      }
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
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
          timeSheetDocument: buildTimeSheetStatementDocument(employee, employer, {
            employeeId: selectedEmployeeId,
            month: currentMonth,
            status: 'time_saved',
            records: monthRecords,
            paySlipInputs: inputs,
            timeSummary: buildTimeSummary(summary),
            createdAt: payrollState?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, holidays, payrollState?.timeSheetDocument || null),
          ...averageSource,
          snapshot: averageHourlyEarnings > 0
            ? {
                grossWage: calcPaySlip(payrollEmployee || employee, summary, inputs.manualReward, 0, averageHourlyEarnings, currentMonth).hrubaMzda,
                workedHours: summary.workedHours,
                totalSaldo: summary.totalSaldo,
                savedAt: new Date().toISOString(),
              }
            : undefined,
        })
        if (!saved) return
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
        saveEmployeeMonth(selectedEmployeeId, currentMonth)
        setPayrollMonthState(selectedEmployeeId, currentMonth, {
          timeSummary: saved.timeSummary,
          timeSheetDocument: saved.timeSheetDocument,
          updatedAt: saved.updatedAt,
        })
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
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
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
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      if (!canCloseAndCalculate(currentStatus)) {
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
      if (saved && employee) {
        saved.timeSheetDocument = buildTimeSheetStatementDocument(employee, employer, saved, holidays, payrollState?.timeSheetDocument || null)
      }
      if (!saved) return
      try {
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
        closeEmployeeTime(selectedEmployeeId, currentMonth)
        setPayrollMonthState(selectedEmployeeId, currentMonth, {
          timeSummary: saved.timeSummary,
          timeSheetDocument: saved.timeSheetDocument,
          updatedAt: saved.updatedAt,
          closedAt: saved.closedAt,
        })
        setSuccess('Evidence byla uzavřena.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Evidenci se nepodařilo uzavřít.')
      }
    },
    onCloseAndCalculate: async () => {
      if (!selectedEmployeeId) return
      setError('')
      setInfo('')
      setSuccess('')
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      if (!canCloseAndCalculate(currentStatus)) {
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

      const closed = buildSavedMonth('time_closed', { closedAt: new Date().toISOString() })
      if (closed) {
        closed.timeSheetDocument = buildTimeSheetStatementDocument(employee, employer, closed, holidays, payrollState?.timeSheetDocument || null)
      }
      if (!closed) return

      try {
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, closed)
        closeEmployeeTime(selectedEmployeeId, currentMonth)
        setPayrollMonthState(selectedEmployeeId, currentMonth, {
          timeSummary: closed.timeSummary,
          timeSheetDocument: closed.timeSheetDocument,
          updatedAt: closed.updatedAt,
          closedAt: closed.closedAt,
        })

        const averageResponse = await fetchQuarterlyPhv(currentMonth, selectedEmployeeId, employee)
        const averageHourlyEarnings = assertAvailableAverageEarnings(averageResponse)
        const payrollResult = calcPaySlip(payrollEmployee || employee, summary, inputs.manualReward, 0, averageHourlyEarnings, currentMonth)
        const calculated = buildSavedMonth('payroll_calculated', {
          closedAt: closed.closedAt,
          timeSheetDocument: closed.timeSheetDocument,
          payrollResult: payrollResult as unknown as EmployeeMonth['payrollResult'],
          calculationSnapshot: {
            averageEarningsSource: averageResponse.sourceType,
            averageHourlyEarnings,
            legalConstants: getLegalConstantsSnapshot(currentMonth),
            calculatedAt: new Date().toISOString(),
          },
        })
        if (!calculated) return
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, calculated)
        calculateEmployeePayroll(selectedEmployeeId, currentMonth, {
          payrollResult: payrollResult as unknown as EmployeeMonth['payrollResult'],
          calculationSnapshot: calculated.calculationSnapshot,
          timeSummary: calculated.timeSummary,
        })
        setMonthStatus(selectedEmployeeId, currentMonth, 'payroll_calculated')
        setSuccess('Docházka byla uzavřena a mzda byla spočítána.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onCalculatePayroll: async () => {
      if (!employee || !selectedEmployeeId) return
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      setError('')
      setInfo('')
      setSuccess('')
      if (!canCalculatePayroll(currentStatus)) {
        setInfo('Mzdu lze spočítat až po uzavření evidence.')
        return
      }
      try {
        const averageResponse = await fetchQuarterlyPhv(currentMonth, selectedEmployeeId, employee)
        const averageHourlyEarnings = assertAvailableAverageEarnings(averageResponse)
        const payrollResult = calcPaySlip(payrollEmployee || employee, summary, inputs.manualReward, 0, averageHourlyEarnings, currentMonth)
        const saved = buildSavedMonth('payroll_calculated', {
          payrollResult: payrollResult as unknown as EmployeeMonth['payrollResult'],
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
          payrollResult: payrollResult as unknown as EmployeeMonth['payrollResult'],
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
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      setError('')
      setInfo('')
      setSuccess('')
      if (!canApproveAndIssue(currentStatus)) {
        setInfo('Mzdu lze schválit až po výpočtu mzdy.')
        return
      }
      const saved = buildSavedMonth('payroll_approved', { approvedAt: new Date().toISOString() })
      if (!saved) return
      try {
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
        approveEmployeePayroll(selectedEmployeeId, currentMonth)
        setPayrollMonthState(selectedEmployeeId, currentMonth, {
          approvedAt: saved.approvedAt,
          updatedAt: saved.updatedAt,
        })
        setSuccess('Mzda byla schválena.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Mzdu se nepodařilo schválit.')
      }
    },
    onApproveAndIssue: async () => {
      if (!selectedEmployeeId) return
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      setError('')
      setInfo('')
      setSuccess('')
      if (!canApproveAndIssue(currentStatus)) {
        setInfo('Mzdu lze schválit až po výpočtu mzdy.')
        return
      }
      const approved = buildSavedMonth('payroll_approved', { approvedAt: new Date().toISOString() })
      if (!approved) return

      try {
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, approved)
        approveEmployeePayroll(selectedEmployeeId, currentMonth)
        setPayrollMonthState(selectedEmployeeId, currentMonth, {
          approvedAt: approved.approvedAt,
          updatedAt: approved.updatedAt,
        })

        const nowIso = new Date().toISOString()
        const issued = buildSavedMonth('payslip_issued', {
          approvedAt: approved.approvedAt,
          issuedAt: nowIso,
        })
        if (issued && employee) {
          issued.payslipDocument = JSON.parse(JSON.stringify(buildIssuedPayslipDocument(
            employee,
            employer,
            issued,
            {
              workHoursWH: summary.workHoursWH,
              workDaysWH: summary.workDaysWH,
              totalNight: summary.totalNight,
              totalWeekend: summary.totalWeekend,
              totalHolidayTotal: summary.totalHolidayTotal,
              totalOvertime: summary.totalOvertime,
              totalVacation: summary.totalVacation,
              totalSick: summary.totalSick,
            },
            payrollState?.payslipDocument || null,
          ))) as NonNullable<typeof issued.payslipDocument>
        }
        if (!issued) return
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, issued)
        issueEmployeePayslip(selectedEmployeeId, currentMonth, {
          payslipDocument: issued.payslipDocument,
          issuedAt: issued.issuedAt,
          updatedAt: issued.updatedAt,
        })
        setSuccess('Mzda byla schválena a výplatní páska byla vystavena.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Mzdu se nepodařilo schválit nebo vystavit výplatní pásku.')
      }
    },
    onIssuePayslip: async () => {
      if (!selectedEmployeeId) return
      if (!monthExists) {
        setInfo('Měsíc ještě není založen.')
        return
      }
      setError('')
      setInfo('')
      setSuccess('')
      if (!canIssuePayslip(currentStatus)) {
        setInfo('Výplatní pásku lze vystavit až po schválení mzdy.')
        return
      }
      const nowIso = new Date().toISOString()
      const saved = buildSavedMonth('payslip_issued', {
        issuedAt: nowIso,
      })
      if (saved && employee) {
        saved.payslipDocument = JSON.parse(JSON.stringify(buildIssuedPayslipDocument(
          employee,
          employer,
          saved,
          {
            workHoursWH: summary.workHoursWH,
            workDaysWH: summary.workDaysWH,
            totalNight: summary.totalNight,
            totalWeekend: summary.totalWeekend,
            totalHolidayTotal: summary.totalHolidayTotal,
            totalOvertime: summary.totalOvertime,
            totalVacation: summary.totalVacation,
            totalSick: summary.totalSick,
          },
          payrollState?.payslipDocument || null,
        ))) as NonNullable<typeof saved.payslipDocument>
      }
      if (!saved) return
      try {
        await saveEmployeeMonthApi(selectedEmployeeId, currentMonth, saved)
        issueEmployeePayslip(selectedEmployeeId, currentMonth, {
          payslipDocument: saved.payslipDocument,
          issuedAt: saved.issuedAt,
          updatedAt: saved.updatedAt,
        })
        setSuccess('Výplatní páska byla vystavena.')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Výplatní pásku se nepodařilo vystavit.')
      }
    },
  }
}
