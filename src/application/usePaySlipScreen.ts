import { useEffect, useMemo, useState } from 'react'
import { calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { fetchQuarterlyPhv, type QuarterlyPhvResponse } from '../infrastructure/api/monthStorage'
import { AUTOMATIC_PHV_ERROR_MESSAGE, assertAvailableAverageEarnings } from '../domain/payroll/phv'
import { useStore } from '../infrastructure/state/store'
import { defaultPaySlipInputs } from './defaults'
import { formatCzk, formatDays, formatHours, formatMonthLabel } from './formatters'
import type { IssuedPayslipDocument } from '../domain/shared/types'
import { EmploymentTypeLabels } from '../domain/shared/types'

type PayslipRowViewModel = {
  label: string
  hrs?: string
  days?: string
  czk?: string
  bold?: boolean
  neg?: boolean
}

function buildIssuedEarningRows(
  payslip: NonNullable<ReturnType<typeof calcPaySlip>>,
  documentSummary: IssuedPayslipDocument['snapshot']['documentSummary'],
  manualReward: number,
  personalBonus: number,
  nightSurcharge: number,
  weekendSurcharge: number,
  sickCompensation: number,
  overtimeSurcharge: number,
): PayslipRowViewModel[] {
  const rows = [
    { label: 'Základní mzda', czk: payslip.baseSalaryCalc, bold: true },
    { label: `Osobní ohodnocení ${Math.round(personalBonus * 100)}%`, czk: payslip.personalBonusCalc },
    { label: `Příplatek noční ${Math.round(nightSurcharge * 100)}%`, hrs: documentSummary.totalNight, czk: payslip.nightSurchargeCalc },
    { label: `Příplatek víkend ${Math.round(weekendSurcharge * 100)}%`, hrs: documentSummary.totalWeekend, czk: payslip.weekendSurchargeCalc },
    { label: `Příplatek svátek ${Math.round(payslip.holidaySurchargeRate * 100)}%`, hrs: documentSummary.totalHolidayTotal, czk: payslip.holidaySurchargeCalc },
    { label: 'Náhradní volno za svátek', hrs: payslip.holidayCompLeaveHours },
    { label: `Příplatek přesčas ${Math.round(overtimeSurcharge * 100)}%`, hrs: documentSummary.totalOvertime, czk: payslip.overtimeSurchargeCalc },
    { label: 'Náhradní volno za přesčas', hrs: payslip.overtimeCompLeaveHours },
    { label: 'Ruční odměna', czk: manualReward },
    { label: 'Neplacené volno / absence', hrs: payslip.unworkedDays * payslip.dailyFund, days: payslip.unworkedDays, czk: -payslip.unworkedCalc, neg: true },
    { label: 'Dovolená', hrs: documentSummary.totalVacation, days: payslip.vacationDays, czk: payslip.vacationCalc },
    { label: `Náhrada DPN od zaměstnavatele ${Math.round(sickCompensation * 100)}%`, hrs: documentSummary.totalSick, days: payslip.sickDays, czk: payslip.sickCalc },
  ]

  return rows
    .filter(row => (row.hrs ?? 0) !== 0 || (row.days ?? 0) !== 0 || (row.czk ?? 0) !== 0)
    .map(row => ({
      label: row.label,
      hrs: row.hrs !== undefined ? formatHours(row.hrs) : undefined,
      days: row.days !== undefined ? formatDays(row.days) : undefined,
      czk: row.czk !== undefined ? formatCzk(Math.abs(row.czk)) : undefined,
      bold: row.bold,
      neg: row.neg,
    }))
}

function getAverageLabels(averageEarnings: QuarterlyPhvResponse | null) {
  return {
    averageEarningsLabel: averageEarnings?.sourceType === 'actual'
      ? 'Průměrný hodinový výdělek'
      : averageEarnings?.sourceType === 'probable'
        ? 'Pravděpodobný hodinový výdělek'
        : 'Hodinový výdělek není k dispozici',
    averageEarningsSourceLabel: averageEarnings?.sourceType === 'actual'
      ? 'skutečný PHV'
      : averageEarnings?.sourceType === 'probable'
        ? 'pravděpodobný výdělek'
        : 'není k dispozici',
  }
}

export function usePaySlipScreen() {
  const employees = useStore(s => s.employees)
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const recordsByEmployee = useStore(s => s.recordsByEmployee)
  const holidays = useStore(s => s.holidays)
  const month = useStore(s => s.currentMonth)
  const setMonth = useStore(s => s.setCurrentMonth)
  const paySlipInputsByEmployee = useStore(s => s.paySlipInputsByEmployee)
  const setPaySlipInput = useStore(s => s.setPaySlipInput)
  const monthStatusByEmployee = useStore(s => s.monthStatusByEmployee)
  const payrollByEmployee = useStore(s => s.payrollByEmployee)

  const employee = employees.find(item => item.id === selectedEmployeeId) || null
  const monthRecords = selectedEmployeeId ? recordsByEmployee[selectedEmployeeId]?.[month] || [] : []
  const inputs = selectedEmployeeId ? paySlipInputsByEmployee[selectedEmployeeId]?.[month] || defaultPaySlipInputs : defaultPaySlipInputs
  const currentMonthStatus = selectedEmployeeId ? monthStatusByEmployee[selectedEmployeeId]?.[month] || 'empty' : 'empty'
  const payrollState = selectedEmployeeId ? payrollByEmployee[selectedEmployeeId]?.[month] : undefined
  const monthExists = selectedEmployeeId ? typeof monthStatusByEmployee[selectedEmployeeId]?.[month] !== 'undefined' : false
  const isDataClosed = currentMonthStatus === 'time_closed' || currentMonthStatus === 'payroll_calculated' || currentMonthStatus === 'payroll_approved' || currentMonthStatus === 'payslip_issued'
  const printDisabled = currentMonthStatus !== 'payslip_issued'
  const issuedPayslipDocument = payrollState?.payslipDocument || null

  const [averageHourlyEarnings, setAverageHourlyEarnings] = useState<number | null>(null)
  const [phvError, setPhvError] = useState('')
  const [phvLoading, setPhvLoading] = useState(true)
  const [loadedPhvMonth, setLoadedPhvMonth] = useState('')
  const [averageEarnings, setAverageEarnings] = useState<QuarterlyPhvResponse | null>(null)
  const [info, setInfo] = useState('')

  const calcs = useMemo(() => employee ? calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays) : [], [monthRecords, employee, holidays, inputs.sickCarryoverDays])
  const summary = useMemo(() => calcMonthlySummary(calcs), [calcs])
  const requiresInvalidationConfirmation =
    currentMonthStatus === 'time_closed' ||
    currentMonthStatus === 'payroll_calculated' ||
    currentMonthStatus === 'payroll_approved' ||
    currentMonthStatus === 'payslip_issued'

  const confirmPayrollInputChange = (apply: () => void) => {
    if (!selectedEmployeeId) return
    if (!requiresInvalidationConfirmation) {
      setInfo('')
      apply()
      return
    }
    const confirmed = window.confirm('Změna mzdových vstupů zneplatní schválenou mzdu i vystavenou výplatní pásku. Pokračovat?')
    if (!confirmed) return
    apply()
    setInfo('Změna mzdových vstupů zneplatnila schválení mzdy a vystavenou výplatní pásku. Před dalším tiskem je nutný nový výpočet a schválení.')
  }

  useEffect(() => {
    if (!employee || !selectedEmployeeId || !monthExists || !isDataClosed) {
      setPhvLoading(false)
      setAverageHourlyEarnings(null)
      setAverageEarnings(null)
      setPhvError('')
      return
    }
    let active = true
    setPhvLoading(true)
    fetchQuarterlyPhv(month, selectedEmployeeId, employee)
      .then(response => {
        if (!active) return
        setAverageEarnings(response)
        setAverageHourlyEarnings(assertAvailableAverageEarnings(response))
        setPhvError('')
        setLoadedPhvMonth(month)
      })
      .catch(() => {
        if (!active) return
        setPhvError(AUTOMATIC_PHV_ERROR_MESSAGE)
        setLoadedPhvMonth(month)
      })
      .finally(() => {
        if (active) setPhvLoading(false)
      })
    return () => {
      active = false
    }
  }, [employee, isDataClosed, month, monthExists, selectedEmployeeId])

  const calculation = useMemo(() => {
    if (!employee || !selectedEmployeeId) {
      return { payslip: null, error: '', loading: false }
    }
    if (!isDataClosed) {
      return { payslip: null, error: '', loading: false }
    }
    if (payrollState?.payrollResult) {
      return {
        payslip: payrollState.payrollResult as unknown as ReturnType<typeof calcPaySlip>,
        error: '',
        loading: false,
      }
    }
    if (phvLoading || loadedPhvMonth !== month) {
      return { payslip: null, error: '', loading: true }
    }
    if (averageHourlyEarnings === null) {
      return { payslip: null, error: phvError || AUTOMATIC_PHV_ERROR_MESSAGE, loading: false }
    }
    try {
      return {
        payslip: calcPaySlip(employee, summary, inputs.manualReward, inputs.unworked, averageHourlyEarnings, month),
        error: '',
        loading: false,
      }
    } catch (error) {
      return {
        payslip: null,
        error: error instanceof Error ? error.message : 'Výpočet výplatní pásky nelze provést.',
        loading: false,
      }
    }
  }, [averageHourlyEarnings, employee, inputs.manualReward, inputs.unworked, isDataClosed, loadedPhvMonth, month, payrollState?.payrollResult, phvError, phvLoading, selectedEmployeeId, summary])

  const { averageEarningsLabel, averageEarningsSourceLabel } = getAverageLabels(averageEarnings)
  const issuedAverageEarningsLabel = issuedPayslipDocument?.snapshot.calculationSnapshot?.averageEarningsSource === 'actual'
    ? 'Průměrný hodinový výdělek'
    : issuedPayslipDocument?.snapshot.calculationSnapshot?.averageEarningsSource === 'probable'
      ? 'Pravděpodobný hodinový výdělek'
      : averageEarningsLabel
  const issuedPayslipCalculation = issuedPayslipDocument?.snapshot.payrollResult as unknown as ReturnType<typeof calcPaySlip> | undefined

  return {
    month,
    monthLabel: formatMonthLabel(month),
    employeeHeader: employee
      ? `${employee.name} · ${EmploymentTypeLabels[employee.employmentType]} · úvazek ${employee.workload} · ${formatMonthLabel(month)}`
      : 'Nejprve vyberte zaměstnance',
    loading: calculation.loading,
    error: !calculation.loading && !calculation.payslip ? calculation.error : '',
    info,
    blocked: !employee || !selectedEmployeeId || !monthExists || !isDataClosed,
    blockedMessage: !employee || !selectedEmployeeId
      ? 'Vyberte zaměstnance.'
      : !monthExists
        ? 'Měsíc ještě není založen.'
        : 'Nejprve uzavřete evidenci pracovní doby.',
    isDataClosed,
    printDisabled,
    dataClosedWarning: printDisabled && isDataClosed
      ? 'Tisk je dostupný až po vystavení výplatní pásky.'
      : !monthExists
        ? 'Výplatní pásku lze zpracovat až po založení měsíce.'
        : !isDataClosed
        ? 'Výpočet mzdy je dostupný až po uzavření evidence.'
        : '',
    onMonthChange: setMonth,
    internalInputs: {
      manualReward: inputs.manualReward,
      includeManualRewardInAverage: inputs.includeManualRewardInAverage,
      unworked: inputs.unworked,
      sickCarryoverDays: inputs.sickCarryoverDays,
      onManualRewardChange: (value: number) => selectedEmployeeId && confirmPayrollInputChange(() => setPaySlipInput(selectedEmployeeId, month, { manualReward: value })),
      onIncludeManualRewardInAverageChange: (value: boolean) => selectedEmployeeId && confirmPayrollInputChange(() => setPaySlipInput(selectedEmployeeId, month, { includeManualRewardInAverage: value })),
      onUnworkedChange: (value: number) => selectedEmployeeId && confirmPayrollInputChange(() => setPaySlipInput(selectedEmployeeId, month, { unworked: value })),
      onSickCarryoverDaysChange: (value: number) => selectedEmployeeId && confirmPayrollInputChange(() => setPaySlipInput(selectedEmployeeId, month, { sickCarryoverDays: value })),
    },
    auditRows: calculation.payslip ? [
      { label: 'Typ podkladu pro náhrady', value: averageEarningsSourceLabel },
      { label: 'Použitý hodinový výdělek', value: formatCzk(Number(calculation.payslip.averageHourlyEarnings || 0)) },
      { label: 'Rozhodné období', value: averageEarnings ? `${averageEarnings.periodStart} až ${averageEarnings.periodEnd}` : '—' },
      { label: 'Zdrojové měsíce', value: averageEarnings?.sourceMonths.join(', ') || '—' },
      { label: 'Zdroj zaměstnance', value: averageEarnings?.employeeContextMonth || 'není k dispozici' },
      { label: 'Hrubá mzda pro průměr', value: formatCzk(averageEarnings?.grossForAverage || 0) },
      { label: 'Odpracované hodiny pro průměr', value: formatHours(averageEarnings?.workedHoursForAverage || 0) },
      { label: 'Odpracované dny pro průměr', value: formatDays(averageEarnings?.workedDaysForAverage || 0) },
    ] : [],
    issuedPayslipDocument,
    issuedDocumentRows: issuedPayslipCalculation && issuedPayslipDocument ? {
      earningsRows: buildIssuedEarningRows(
        issuedPayslipCalculation,
        issuedPayslipDocument.snapshot.documentSummary,
        issuedPayslipDocument.snapshot.paySlipInputs.manualReward,
        issuedPayslipDocument.snapshot.employee.personalBonus,
        issuedPayslipDocument.snapshot.employee.nightSurcharge,
        issuedPayslipDocument.snapshot.employee.weekendSurcharge,
        issuedPayslipDocument.snapshot.employee.sickCompensation,
        issuedPayslipDocument.snapshot.employee.overtimeSurcharge,
      ),
      contributionRows: [
        { label: 'Vyměřovací základ ZP/SP', czk: formatCzk(Number(issuedPayslipCalculation.contributionBase || 0)), bold: true },
        { label: 'Vyměřovací základ ZP', czk: formatCzk(Number(issuedPayslipCalculation.healthContributionBase || 0)), bold: Boolean(issuedPayslipCalculation.healthMinimumBaseApplied) },
        { label: 'ZP zaměstnanec (4,5%)', czk: formatCzk(Number(issuedPayslipCalculation.healthEmployee || 0)), neg: true },
        { label: 'SP zaměstnanec (7,1%)', czk: formatCzk(Number(issuedPayslipCalculation.socialEmployee || 0)), neg: true },
        { label: 'ZP zaměstnavatel (9%)', czk: formatCzk(Number(issuedPayslipCalculation.healthEmployer || 0)) },
        { label: 'SP zaměstnavatel (24,8%)', czk: formatCzk(Number(issuedPayslipCalculation.socialEmployer || 0)) },
        { label: 'Základ pro zálohu na daň', czk: formatCzk(Number(issuedPayslipCalculation.taxBase || 0)) },
      ],
      taxRows: [
        { label: 'Záloha na daň před slevou', czk: formatCzk(Number(issuedPayslipCalculation.taxBeforeCredits || 0)), neg: true },
        { label: 'Sleva na poplatníka', czk: formatCzk(Number(issuedPayslipCalculation.slevaPoplatnika || 0)) },
        { label: 'Záloha na daň po slevě', czk: formatCzk(Number(issuedPayslipCalculation.taxAfterCredits || 0)), neg: true },
      ],
      grossWage: formatCzk(Number(issuedPayslipCalculation.hrubaMzda || 0)),
      netWage: formatCzk(Number(issuedPayslipCalculation.cistaMzda || 0)),
      recapRows: [
        { label: issuedAverageEarningsLabel, czk: formatCzk(Number(issuedPayslipCalculation.prumHodinovy || 0)) },
        { label: 'Dovolená - roční nárok', hrs: formatHours(issuedPayslipDocument.snapshot.employee.vacationEntitlementHours) },
        { label: 'Dovolená - vyčerpáno', hrs: formatHours(issuedPayslipDocument.snapshot.employee.vacationUsedHours) },
        { label: 'Dovolená - zůstatek', hrs: formatHours(issuedPayslipDocument.snapshot.employee.vacationRemainingHours), bold: true },
      ],
    } : null,
    issuedDocumentTimeRows: issuedPayslipDocument ? [
      {
        label: 'Fond pracovní doby',
        hrs: formatHours(issuedPayslipDocument.snapshot.documentSummary.workHoursWH),
        days: formatDays(issuedPayslipDocument.snapshot.documentSummary.workDaysWH),
      },
      {
        label: 'Odpracováno',
        hrs: formatHours(issuedPayslipDocument.snapshot.timeSummary?.workedHours || 0),
        days: formatDays(issuedPayslipDocument.snapshot.timeSummary?.workedDays || 0),
      },
    ] : [],
    employmentTypeLabel: employee ? EmploymentTypeLabels[employee.employmentType] : '',
  }
}
