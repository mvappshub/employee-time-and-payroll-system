import { useEffect, useMemo, useState } from 'react'
import { calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { fetchQuarterlyPhv, type QuarterlyPhvResponse } from '../infrastructure/api/monthStorage'
import { AUTOMATIC_PHV_ERROR_MESSAGE, assertAvailableAverageEarnings } from '../domain/payroll/phv'
import { useStore } from '../infrastructure/state/store'
import { defaultPaySlipInputs } from './defaults'
import { formatCzk, formatDays, formatHours, formatMonthLabel } from './formatters'
import { EmploymentTypeLabels } from '../domain/shared/types'

type PayslipRowViewModel = {
  label: string
  hrs?: string
  days?: string
  czk?: string
  bold?: boolean
  neg?: boolean
}

function buildEarningRows(ps: NonNullable<ReturnType<typeof calcPaySlip>>, sum: ReturnType<typeof calcMonthlySummary>, manualReward: number, employee: ReturnType<typeof useStore.getState>['employee']): PayslipRowViewModel[] {
  const rows = [
    { label: 'Základní mzda', czk: ps.baseSalaryCalc, bold: true },
    { label: `Osobní ohodnocení ${Math.round(employee.personalBonus * 100)}%`, czk: ps.personalBonusCalc },
    { label: `Příplatek noční ${Math.round(employee.nightSurcharge * 100)}%`, hrs: sum.totalNight, czk: ps.nightSurchargeCalc },
    { label: `Příplatek víkend ${Math.round(employee.weekendSurcharge * 100)}%`, hrs: sum.totalWeekend, czk: ps.weekendSurchargeCalc },
    { label: `Příplatek svátek ${Math.round(ps.holidaySurchargeRate * 100)}%`, hrs: sum.totalHolidayTotal, czk: ps.holidaySurchargeCalc },
    { label: 'Náhradní volno za svátek', hrs: ps.holidayCompLeaveHours },
    { label: `Příplatek přesčas ${Math.round(employee.overtimeSurcharge * 100)}%`, hrs: sum.totalOvertime, czk: ps.overtimeSurchargeCalc },
    { label: 'Náhradní volno za přesčas', hrs: ps.overtimeCompLeaveHours },
    { label: 'Ruční odměna', czk: manualReward },
    { label: 'Neplacené volno / absence', hrs: ps.unworkedDays * ps.dailyFund, days: ps.unworkedDays, czk: -ps.unworkedCalc, neg: true },
    { label: 'Dovolená', hrs: sum.totalVacation, days: ps.vacationDays, czk: ps.vacationCalc },
    { label: `Náhrada DPN od zaměstnavatele ${Math.round(employee.sickCompensation * 100)}%`, hrs: sum.totalSick, days: ps.sickDays, czk: ps.sickCalc },
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
  const employer = useStore(s => s.employer)
  const employee = useStore(s => s.employee)
  const records = useStore(s => s.records)
  const holidays = useStore(s => s.holidays)
  const month = useStore(s => s.currentMonth)
  const setMonth = useStore(s => s.setCurrentMonth)
  const paySlipInputs = useStore(s => s.paySlipInputs)
  const setPaySlipInput = useStore(s => s.setPaySlipInput)
  const monthStatus = useStore(s => s.monthStatus)
  const [averageHourlyEarnings, setAverageHourlyEarnings] = useState<number | null>(null)
  const [phvError, setPhvError] = useState('')
  const [phvLoading, setPhvLoading] = useState(true)
  const [loadedPhvMonth, setLoadedPhvMonth] = useState('')
  const [averageEarnings, setAverageEarnings] = useState<QuarterlyPhvResponse | null>(null)

  const monthRecords = records[month] || []
  const inputs = paySlipInputs[month] || defaultPaySlipInputs
  const currentMonthStatus = monthStatus[month] || 'empty'
  const isDataClosed = currentMonthStatus === 'closed' || currentMonthStatus === 'approved'
  const calcs = useMemo(() => calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays), [monthRecords, employee, holidays, inputs.sickCarryoverDays])
  const summary = useMemo(() => calcMonthlySummary(calcs), [calcs])

  useEffect(() => {
    let active = true
    setPhvLoading(true)
    setPhvError('')
    setAverageHourlyEarnings(null)
    setLoadedPhvMonth('')
    setAverageEarnings(null)

    fetchQuarterlyPhv(month)
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
        if (!active) return
        setPhvLoading(false)
      })

    return () => {
      active = false
    }
  }, [month])

  const calculation = useMemo(() => {
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
  }, [averageHourlyEarnings, employee, loadedPhvMonth, month, phvError, phvLoading, inputs.manualReward, inputs.unworked, summary])

  const { averageEarningsLabel, averageEarningsSourceLabel } = getAverageLabels(averageEarnings)

  return {
    month,
    monthLabel: formatMonthLabel(month),
    employeeHeader: employee.name ? `${employee.name} · ${EmploymentTypeLabels[employee.employmentType] ?? employee.employmentType} · úvazek ${employee.workload} · ${formatMonthLabel(month)}` : `${EmploymentTypeLabels[employee.employmentType] ?? employee.employmentType} · úvazek ${employee.workload} · ${formatMonthLabel(month)}`,
    loading: calculation.loading,
    error: !calculation.loading && !calculation.payslip ? calculation.error : '',
    isDataClosed,
    printDisabled: !isDataClosed,
    dataClosedWarning: isDataClosed ? '' : 'Výplatní páska je generována z neuzavřených dat. Nejprve uzavřete evidenci nebo schvalte mzdu.',
    onMonthChange: setMonth,
    internalInputs: {
      manualReward: inputs.manualReward,
      includeManualRewardInAverage: inputs.includeManualRewardInAverage,
      unworked: inputs.unworked,
      sickCarryoverDays: inputs.sickCarryoverDays,
      onManualRewardChange: (value: number) => setPaySlipInput(month, { manualReward: value }),
      onIncludeManualRewardInAverageChange: (value: boolean) => setPaySlipInput(month, { includeManualRewardInAverage: value }),
      onUnworkedChange: (value: number) => setPaySlipInput(month, { unworked: value }),
      onSickCarryoverDaysChange: (value: number) => setPaySlipInput(month, { sickCarryoverDays: value }),
    },
    auditRows: calculation.payslip ? [
      { label: 'Typ podkladu pro náhrady', value: averageEarningsSourceLabel },
      { label: 'Použitý hodinový výdělek', value: formatCzk(calculation.payslip.averageHourlyEarnings) },
      { label: 'Rozhodné období', value: averageEarnings ? `${averageEarnings.periodStart} až ${averageEarnings.periodEnd}` : '—' },
      { label: 'Zdrojové měsíce', value: averageEarnings?.sourceMonths.join(', ') || '—' },
      { label: 'Zdroj zaměstnance', value: averageEarnings?.employeeContextMonth || 'není k dispozici' },
      { label: 'Hrubá mzda pro průměr', value: formatCzk(averageEarnings?.grossForAverage || 0) },
      { label: 'Odpracované hodiny pro průměr', value: formatHours(averageEarnings?.workedHoursForAverage || 0) },
      { label: 'Odpracované dny pro průměr', value: formatDays(averageEarnings?.workedDaysForAverage || 0) },
    ] : [],
    employeeDocument: calculation.payslip && isDataClosed ? {
      employerName: employer.name,
      employerIco: employer.ico,
      employerSeat: employer.seat,
      employeeName: employee.name,
      employeeNumber: employee.employeeNumber,
      employmentTypeLabel: EmploymentTypeLabels[employee.employmentType] ?? employee.employmentType,
      periodLabel: formatMonthLabel(month),
      timeRows: [
        { label: 'Fond pracovní doby', hrs: formatHours(summary.workHoursWH), days: formatDays(summary.workDaysWH) },
        { label: 'Odpracováno', hrs: formatHours(summary.workedHours), days: formatDays(summary.workedDays) },
      ],
      earningsRows: buildEarningRows(calculation.payslip, summary, inputs.manualReward, employee),
      contributionRows: [
        { label: 'Vyměřovací základ ZP/SP', czk: formatCzk(calculation.payslip.contributionBase), bold: true },
        { label: 'Vyměřovací základ ZP', czk: formatCzk(calculation.payslip.healthContributionBase), bold: calculation.payslip.healthMinimumBaseApplied },
        { label: 'ZP zaměstnanec (4,5%)', czk: formatCzk(calculation.payslip.healthEmployee), neg: true },
        { label: 'SP zaměstnanec (7,1%)', czk: formatCzk(calculation.payslip.socialEmployee), neg: true },
        { label: 'ZP zaměstnavatel (9%)', czk: formatCzk(calculation.payslip.healthEmployer) },
        { label: 'SP zaměstnavatel (24,8%)', czk: formatCzk(calculation.payslip.socialEmployer) },
        { label: 'Základ pro zálohu na daň', czk: formatCzk(calculation.payslip.taxBase) },
      ],
      taxRows: [
        { label: 'Záloha na daň před slevou', czk: formatCzk(calculation.payslip.taxBeforeCredits), neg: true },
        { label: 'Sleva na poplatníka', czk: formatCzk(calculation.payslip.slevaPoplatnika) },
        { label: 'Záloha na daň po slevě', czk: formatCzk(calculation.payslip.taxAfterCredits), neg: true },
      ],
      grossWage: formatCzk(calculation.payslip.hrubaMzda),
      netWage: formatCzk(calculation.payslip.cistaMzda),
      recapRows: [
        { label: averageEarningsLabel, czk: formatCzk(calculation.payslip.prumHodinovy) },
        { label: 'Dovolená - roční nárok', hrs: formatHours(employee.vacationEntitlementHours) },
        { label: 'Dovolená - vyčerpáno', hrs: formatHours(employee.vacationUsedHours) },
        { label: 'Dovolená - zůstatek', hrs: formatHours(employee.vacationRemainingHours), bold: true },
      ],
    } : null,
  }
}
