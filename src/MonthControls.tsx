import { useEffect, useMemo, useState } from 'react'
import { calculateMonthDays, calcMonthlySummary, calcPaySlip } from './calc'
import { fetchQuarterlyPhv, loadSavedMonth, saveMonthRecord } from './monthStorage'
import { AUTOMATIC_PHV_ERROR_MESSAGE, resolveAutomaticPhv } from './phv'
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
  const [error, setError] = useState('')

  const payInputs = paySlipInputs[currentMonth] || { manualReward: 0, unworked: 0, sickCarryoverDays: 0 }
  const monthRecords = records[currentMonth] || []
  const days = useMemo(
    () => calculateMonthDays(monthRecords, employee, holidays, payInputs.sickCarryoverDays),
    [monthRecords, employee, holidays, payInputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(days), [days])

  useEffect(() => {
    initMonth(currentMonth)
  }, [currentMonth, initMonth])

  const handleLoad = async () => {
    setError('')
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
    try {
      setError('')
      const phvResponse = await fetchQuarterlyPhv(currentMonth)
      const averageHourlyEarnings = resolveAutomaticPhv(phvResponse)
      const payslip = calcPaySlip(employee, summary, payInputs.manualReward, payInputs.unworked, averageHourlyEarnings)

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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
    }
  }

  const handlePrefill = () => {
    setError('')
    prefillMonth(currentMonth)
  }

  return (
    <div className="mb-2 border-b border-gray-200 pb-1 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        <button className={btn} onClick={handleLoad}>Načíst měsíc</button>
        <button className={btn} onClick={handleSave}>Uložit měsíc</button>
        <button className={btn} onClick={handlePrefill}>Předvyplnit měsíc</button>
      </div>
      {error && <div className="mt-1 border border-red-300 bg-red-50 px-2 py-1 text-red-700">{error}</div>}
    </div>
  )
}
