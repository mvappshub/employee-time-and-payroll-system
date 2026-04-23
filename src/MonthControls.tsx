import { useEffect, useMemo } from 'react'
import { calculateMonthDays, calcMonthlySummary, calcPaySlip } from './calc'
import { loadSavedMonth, saveMonthRecord } from './monthStorage'
import { useStore } from './store'

const btn = 'border border-gray-300 px-1.5 py-0.5 text-xs bg-white hover:bg-gray-50'

export default function MonthControls() {
  const employee = useStore(s => s.employee)
  const records = useStore(s => s.records)
  const holidays = useStore(s => s.holidays)
  const currentMonth = useStore(s => s.currentMonth)
  const paySlipInputs = useStore(s => s.paySlipInputs)
  const initMonth = useStore(s => s.initMonth)
  const prefillMonth = useStore(s => s.prefillMonth)
  const hydrateMonth = useStore(s => s.hydrateMonth)
  const setMonthStatus = useStore(s => s.setMonthStatus)

  const payInputs = paySlipInputs[currentMonth] || { manualReward: 0, unworked: 0, sickCarryoverDays: 0 }
  const monthRecords = records[currentMonth] || []
  const days = useMemo(
    () => calculateMonthDays(monthRecords, employee, holidays, payInputs.sickCarryoverDays),
    [monthRecords, employee, holidays, payInputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(days), [days])
  const payslip = useMemo(
    () => calcPaySlip(employee, summary, payInputs.manualReward, payInputs.unworked),
    [employee, summary, payInputs.manualReward, payInputs.unworked],
  )

  useEffect(() => {
    initMonth(currentMonth)
  }, [currentMonth, initMonth])

  const handleLoad = async () => {
    const loaded = await loadSavedMonth(currentMonth)
    if (!loaded) {
      return
    }
    hydrateMonth(currentMonth, {
      employee: loaded.employee,
      records: loaded.records,
      paySlipInputs: loaded.paySlipInputs,
    })
  }

  const handleSave = async () => {
    await saveMonthRecord({
      month: currentMonth,
      employee,
      records: monthRecords,
      paySlipInputs: payInputs,
      snapshot: {
        grossWage: payslip.hrubaMzda,
        workedHours: summary.workedHours,
        totalSaldo: summary.totalSaldo,
        savedAt: new Date().toISOString(),
      },
    })
    setMonthStatus(currentMonth, 'saved')
  }

  const handlePrefill = () => {
    prefillMonth(currentMonth)
  }

  return (
    <div className="mb-2 border-b border-gray-200 pb-1 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <button className={btn} onClick={handleLoad}>Načíst měsíc</button>
        <button className={btn} onClick={handleSave}>Uložit měsíc</button>
        <button className={btn} onClick={handlePrefill}>Předvyplnit měsíc</button>
      </div>
    </div>
  )
}
