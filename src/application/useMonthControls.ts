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
  const monthStatus = useStore(s => s.monthStatus)
  const closeMonth = useStore(s => s.closeMonth)
  const approveMonth = useStore(s => s.approveMonth)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

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
    info,
    currentStatus: monthStatus[currentMonth] || 'empty',
    onLoad: async () => {
      setError('')
      setInfo('')
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
      setError('')
      setInfo('')
      const averageSource = calcAverageSourceSnapshot(employee, summary, inputs.manualReward, inputs.includeManualRewardInAverage, 0)

      try {
        await saveMonthRecord({
          month: currentMonth,
          employer,
          employee,
          records: monthRecords,
          paySlipInputs: inputs,
          ...averageSource,
        })
        setMonthStatus(currentMonth, 'saved')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
        return
      }

      try {
        const averageResponse = await fetchQuarterlyPhv(currentMonth)
        const resolvedAverageHourlyEarnings = averageResponse.averageHourlyEarnings
        const resolvedAverageSource = calcAverageSourceSnapshot(
          employee,
          summary,
          inputs.manualReward,
          inputs.includeManualRewardInAverage,
          resolvedAverageHourlyEarnings && resolvedAverageHourlyEarnings > 0 ? resolvedAverageHourlyEarnings : 0,
        )
        const snapshot = averageResponse.sourceType === 'unavailable'
          ? undefined
          : (() => {
              const payslip = calcPaySlip(
                employee,
                summary,
                inputs.manualReward,
                inputs.unworked,
                assertAvailableAverageEarnings(averageResponse),
                currentMonth,
              )
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
          ...resolvedAverageSource,
          snapshot,
        })
        if (averageResponse.sourceType === 'unavailable') {
          setInfo(averageResponse.reason || AUTOMATIC_PHV_ERROR_MESSAGE)
        }
      } catch (caughtError) {
        setInfo(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onPrefill: () => {
      setError('')
      setInfo('')
      prefillMonth(currentMonth)
    },
    onCloseMonth: () => {
      setError('')
      setInfo('')
      closeMonth(currentMonth)
    },
    onApproveMonth: () => {
      setError('')
      setInfo('')
      approveMonth(currentMonth)
    },
  }
}
