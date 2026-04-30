import { useEffect, useMemo, useState } from 'react'
import { calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { fetchQuarterlyPhv, type QuarterlyPhvResponse } from '../infrastructure/api/monthStorage'
import { AUTOMATIC_PHV_ERROR_MESSAGE, assertAvailableAverageEarnings } from '../domain/payroll/phv'
import { useStore } from '../infrastructure/state/store'
import { autosaveEmployeeMonthDraft } from './autosaveMonth'
import { defaultPaySlipInputs } from './defaults'
import { formatCzk, formatDays, formatHours, formatMonthLabel } from './formatters'
import type { HolidayCompensationMode, IssuedPayslipDocument } from '../domain/shared/types'
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
  const employer = useStore(s => s.employer)
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
  const effectiveEmployee = useMemo(
    () => employee ? { ...employee, holidayCompensationMode: inputs.holidayCompensationMode } : null,
    [employee, inputs.holidayCompensationMode],
  )
  const showHolidayCompensationMode = summary.totalHolidayWorked > 0
  const timeSummary = useMemo(() => ({
    monthlyFundHours: summary.monthlyFundHours,
    workedHours: summary.workedHours,
    workedDays: summary.workedDays,
    vacationHours: summary.totalVacation,
    sickHours: summary.totalSick,
    totalSaldo: summary.totalSaldo,
  }), [summary])
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
    setInfo('Změna mzdových vstupů zneplatnila výpočet mzdy. Pro pokračování mzdu znovu spočítejte.')
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

  useEffect(() => {
    if (!employee || !selectedEmployeeId || !monthExists || monthRecords.length === 0) return
    if (currentMonthStatus !== 'draft' && currentMonthStatus !== 'time_saved' && currentMonthStatus !== 'time_closed') return

    const timeout = window.setTimeout(() => {
      autosaveEmployeeMonthDraft({
        employer,
        employee,
        employeeId: selectedEmployeeId,
        month,
        status: currentMonthStatus,
        records: monthRecords,
        paySlipInputs: inputs,
        timeSummary,
        payrollState,
      }).catch(() => {
        setInfo('Automatické uložení mzdových vstupů se nepodařilo.')
      })
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [currentMonthStatus, employee, employer, inputs, month, monthExists, monthRecords, payrollState, selectedEmployeeId, timeSummary])

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
        payslip: calcPaySlip(effectiveEmployee || employee, summary, inputs.manualReward, 0, averageHourlyEarnings, month),
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
  }, [averageHourlyEarnings, effectiveEmployee, employee, inputs.manualReward, isDataClosed, loadedPhvMonth, month, payrollState?.payrollResult, phvError, phvLoading, selectedEmployeeId, summary])

  const { averageEarningsLabel, averageEarningsSourceLabel } = getAverageLabels(averageEarnings)
  const issuedAverageEarningsLabel = issuedPayslipDocument?.snapshot.calculationSnapshot?.averageEarningsSource === 'actual'
    ? 'Průměrný hodinový výdělek'
    : issuedPayslipDocument?.snapshot.calculationSnapshot?.averageEarningsSource === 'probable'
      ? 'Pravděpodobný hodinový výdělek'
      : averageEarningsLabel
  const issuedPayslipCalculation = issuedPayslipDocument?.snapshot.payrollResult as unknown as ReturnType<typeof calcPaySlip> | undefined
  const currentCalculationRows = calculation.payslip ? {
    sections: [
      {
        title: 'Smlouva',
        rows: [
          { label: 'Základní mzda ze smlouvy', value: formatCzk(employee?.baseSalary || 0), formula: 'měsíční základ z karty zaměstnance' },
          { label: 'Úvazek', value: `${employee?.workload || 0}`, formula: 'koeficient úvazku zaměstnance' },
          { label: 'Týdenní hodiny', value: formatHours(employee?.weeklyHours || 0), formula: 'nastavení zaměstnance' },
          { label: 'Denní fond', value: formatHours(calculation.payslip.dailyFund), formula: 'týdenní hodiny / pracovní dny týdně' },
          { label: 'Osobní ohodnocení', value: `${((employee?.personalBonus || 0) * 100).toFixed(2)} %`, formula: 'sazba z karty zaměstnance' },
          { label: 'Sazba nemoc', value: `${((employee?.sickCompensation || 0) * 100).toFixed(2)} %`, formula: 'náhrada DPN zaměstnavatelem' },
        ],
      },
      {
        title: 'Docházka',
        rows: [
          { label: 'Měsíční fond', value: formatHours(summary.monthlyFundHours), formula: 'součet plánovaných hodin v měsíci' },
          { label: 'Odpracované hodiny', value: formatHours(summary.workedHours), formula: 'docházka: příchod - odchod - přestávka' },
          { label: 'Uznané hodiny', value: formatHours(summary.totalRecognized), formula: 'odpracováno + svátky + dovolená + nemoc' },
          { label: 'Dovolená', value: formatHours(summary.totalVacation), formula: 'dny dovolené * denní fond' },
          { label: 'Nemoc hrazená zaměstnavatelem', value: formatHours(summary.totalSick), formula: 'kompenzované hodiny DPN do limitu' },
          { label: 'Noční hodiny', value: formatHours(summary.totalNight), formula: 'průnik směn s nočním intervalem' },
          { label: 'Víkendové hodiny', value: formatHours(summary.totalWeekend), formula: 'odpracováno v sobotu/neděli' },
          { label: 'Svátek celkem', value: formatHours(summary.totalHolidayTotal), formula: 'sváteční kredit nebo práce ve svátek' },
          { label: 'Přesčas', value: formatHours(summary.totalOvertime), formula: 'přesčasová směna nebo práce nad plán' },
          { label: 'Saldo měsíce', value: formatHours(calculation.payslip.saldoMesic), formula: 'odpracováno + absence - plán' },
        ],
      },
      {
        title: 'PHV a vstupy',
        rows: [
          { label: 'Ruční odměna', value: formatCzk(inputs.manualReward), formula: 'interní mzdový vstup' },
          { label: 'PHV', value: formatCzk(calculation.payslip.averageHourlyEarnings), formula: `${averageEarningsSourceLabel}; rozhodné období ${averageEarnings ? `${averageEarnings.periodStart} až ${averageEarnings.periodEnd}` : 'není k dispozici'}` },
          { label: 'Hodinová sazba základní mzdy', value: formatCzk((employee?.baseSalary || 0) / Math.max(summary.workHoursWH, 1)), formula: 'základní mzda / měsíční fond' },
          { label: 'Redukovaný PHV DPN', value: formatCzk(calculation.payslip.sickHourlyBasis), formula: 'redukční hranice pro náhradu DPN' },
          { label: 'Práce ve svátek', value: inputs.holidayCompensationMode === 'premium' ? 'proplatit' : 'náhradní volno', formula: 'měsíční volba pro odpracovaný svátek' },
        ],
      },
      {
        title: 'Složky hrubé mzdy',
        rows: [
          { label: 'Poměr pro měsíční mzdu', value: `${summary.workHoursWH > 0 ? ((summary.workedHours + summary.totalHolidayCredit) / summary.workHoursWH * 100).toFixed(2) : '0.00'} %`, formula: '(odpracováno + sváteční kredit) / měsíční fond' },
          { label: 'Základní mzda', value: formatCzk(calculation.payslip.baseSalaryCalc), formula: 'poměr * základní mzda' },
          { label: 'Osobní ohodnocení', value: formatCzk(calculation.payslip.personalBonusCalc), formula: `poměr * základní mzda * ${(employee?.personalBonus || 0) * 100} %` },
          { label: 'Příplatek noční', value: formatCzk(calculation.payslip.nightSurchargeCalc), formula: `PHV * noční hodiny * ${(calculation.payslip.nightSurchargeRate * 100).toFixed(2)} %` },
          { label: 'Příplatek víkend', value: formatCzk(calculation.payslip.weekendSurchargeCalc), formula: `PHV * víkendové hodiny * ${(calculation.payslip.weekendSurchargeRate * 100).toFixed(2)} %` },
          { label: 'Příplatek svátek', value: formatCzk(calculation.payslip.holidaySurchargeCalc), formula: `PHV * hodiny ve svátek * ${(calculation.payslip.holidaySurchargeRate * 100).toFixed(2)} %` },
          { label: 'Náhradní volno za svátek', value: formatHours(calculation.payslip.holidayCompLeaveHours), formula: 'hodiny svátku při režimu náhradního volna' },
          { label: 'Příplatek přesčas', value: formatCzk(calculation.payslip.overtimeSurchargeCalc), formula: `PHV * přesčas * ${((employee?.overtimeSurcharge || 0) * 100).toFixed(2)} %` },
          { label: 'Náhradní volno za přesčas', value: formatHours(calculation.payslip.overtimeCompLeaveHours), formula: 'hodiny přesčasu při režimu náhradního volna' },
          { label: 'Dovolená', value: formatCzk(calculation.payslip.vacationCalc), formula: 'PHV * hodiny dovolené' },
          { label: 'DPN náhrada', value: formatCzk(calculation.payslip.sickCalc), formula: `redukovaný PHV ${formatCzk(calculation.payslip.sickHourlyBasis)} * hodiny DPN * ${((employee?.sickCompensation || 0) * 100).toFixed(2)} %` },
          { label: 'Ruční odměna', value: formatCzk(inputs.manualReward), formula: 'přičteno přímo do hrubé mzdy' },
          { label: 'Hrubá mzda', value: formatCzk(calculation.payslip.hrubaMzda), formula: 'součet složek hrubé mzdy - absence; minimálně 0' },
        ],
      },
      {
        title: 'Odvody a daň',
        rows: [
          { label: 'Vyměřovací základ SP', value: formatCzk(calculation.payslip.contributionBase), formula: 'hrubá mzda' },
          { label: 'Vyměřovací základ ZP', value: formatCzk(calculation.payslip.healthContributionBase), formula: calculation.payslip.healthMinimumBaseApplied ? 'navýšeno na minimální zdravotní základ' : 'hrubá mzda' },
          { label: 'ZP zaměstnanec', value: formatCzk(calculation.payslip.healthEmployee), formula: 'vyměřovací základ ZP * sazba zaměstnance' },
          { label: 'SP zaměstnanec', value: formatCzk(calculation.payslip.socialEmployee), formula: 'vyměřovací základ SP * sazba zaměstnance' },
          { label: 'ZP zaměstnavatel', value: formatCzk(calculation.payslip.healthEmployer), formula: 'vyměřovací základ ZP * sazba zaměstnavatele' },
          { label: 'SP zaměstnavatel', value: formatCzk(calculation.payslip.socialEmployer), formula: 'vyměřovací základ SP * sazba zaměstnavatele' },
          { label: 'Základ daně', value: formatCzk(calculation.payslip.taxBase), formula: 'hrubá mzda zaokrouhlená podle pravidel zálohy' },
          { label: 'Daň před slevou', value: formatCzk(calculation.payslip.taxBeforeCredits), formula: '15 % / 23 % podle měsíční hranice' },
          { label: 'Sleva na poplatníka', value: formatCzk(calculation.payslip.slevaPoplatnika), formula: employee?.taxDeclarationSigned && employee.taxpayerCreditApplied ? 'uplatněno podepsané prohlášení' : 'neuplatněno' },
          { label: 'Daň po slevě', value: formatCzk(calculation.payslip.taxAfterCredits), formula: 'daň před slevou - sleva; minimálně 0' },
        ],
      },
      {
        title: 'Výsledek',
        rows: [
          { label: 'Hrubá mzda', value: formatCzk(calculation.payslip.hrubaMzda), formula: 'základ pro výpočet čisté mzdy' },
          { label: 'Mínus ZP zaměstnanec', value: `-${formatCzk(calculation.payslip.healthEmployee)}`, formula: 'srážka zaměstnance' },
          { label: 'Mínus SP zaměstnanec', value: `-${formatCzk(calculation.payslip.socialEmployee)}`, formula: 'srážka zaměstnance' },
          { label: 'Mínus daň po slevě', value: `-${formatCzk(calculation.payslip.taxAfterCredits)}`, formula: 'záloha na daň po slevách' },
          { label: 'Plus DPN náhrada', value: formatCzk(calculation.payslip.sickCalc), formula: 'náhrada DPN se přičítá k čisté mzdě' },
          { label: 'Čistá mzda', value: formatCzk(calculation.payslip.cistaMzda), formula: 'hrubá mzda - ZP - SP - daň + DPN náhrada' },
          { label: 'Saldo měsíce', value: formatHours(calculation.payslip.saldoMesic), formula: 'odpracováno + absence - plán' },
        ],
      },
    ],
    grossWage: formatCzk(Number(calculation.payslip.hrubaMzda || 0)),
    netWage: formatCzk(Number(calculation.payslip.cistaMzda || 0)),
  } : null

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
      holidayCompensationMode: inputs.holidayCompensationMode,
      showHolidayCompensationMode,
      onManualRewardChange: (value: number) => selectedEmployeeId && confirmPayrollInputChange(() => setPaySlipInput(selectedEmployeeId, month, { manualReward: value })),
      onHolidayCompensationModeChange: (value: HolidayCompensationMode) => selectedEmployeeId && confirmPayrollInputChange(() => setPaySlipInput(selectedEmployeeId, month, { holidayCompensationMode: value })),
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
    currentCalculationRows,
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
