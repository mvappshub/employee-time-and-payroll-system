import { useEffect, useMemo, useState } from 'react'
import { calcAverageSourceSnapshot, calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { fetchQuarterlyPhv, loadSavedMonth, saveMonthRecord } from '../infrastructure/api/monthStorage'
import { AUTOMATIC_PHV_ERROR_MESSAGE, assertAvailableAverageEarnings } from '../domain/payroll/phv'
import { useStore } from '../infrastructure/state/store'
import { defaultPaySlipInputs } from './defaults'

export function useMonthControls() {
  const employer = useStore(s => s.employer)
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

  const inputs = paySlipInputs[currentMonth] || defaultPaySlipInputs
  const monthRecords = records[currentMonth] || []
  const days = useMemo(
    () => calculateMonthDays(monthRecords, employee, holidays, inputs.sickCarryoverDays),
    [monthRecords, employee, holidays, inputs.sickCarryoverDays],
  )
  const summary = useMemo(() => calcMonthlySummary(days), [days])

  useEffect(() => {
    initMonth(currentMonth)
  }, [currentMonth, initMonth])

  return {
    error,
    onLoad: async () => {
      setError('')
      const loaded = await loadSavedMonth(currentMonth)
      if (!loaded) return
      hydrateMonth(currentMonth, {
        employer: loaded.employer,
        employee: loaded.employee,
        records: loaded.records,
        paySlipInputs: loaded.paySlipInputs,
      })
    },
    onSave: async () => {
      try {
        setError('')
        const averageResponse = await fetchQuarterlyPhv(currentMonth)
        const averageHourlyEarnings = averageResponse.averageHourlyEarnings
        const safeAverageHourlyEarnings = averageHourlyEarnings && averageHourlyEarnings > 0 ? averageHourlyEarnings : 0
        const averageSource = calcAverageSourceSnapshot(
          employee,
          summary,
          inputs.manualReward,
          inputs.includeManualRewardInAverage,
          safeAverageHourlyEarnings,
        )
        const snapshot = averageResponse.sourceType === 'unavailable'
          ? undefined
          : (() => {
              const payslip = calcPaySlip(employee, summary, inputs.manualReward, inputs.unworked, assertAvailableAverageEarnings(averageResponse))
              return {
                grossWage: payslip.hrubaMzda,
                workedHours: summary.workedHours,
                totalSaldo: summary.totalSaldo,
                savedAt: new Date().toISOString(),
              }
            })()

        await saveMonthRecord({
          month: currentMonth,
          employer,
          employee,
          records: monthRecords,
          paySlipInputs: inputs,
          ...averageSource,
          snapshot,
        })
        setMonthStatus(currentMonth, 'saved')
        if (averageResponse.sourceType === 'unavailable') {
          setError(averageResponse.reason || AUTOMATIC_PHV_ERROR_MESSAGE)
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onPrefill: () => {
      setError('')
      prefillMonth(currentMonth)
    },
  }
}
