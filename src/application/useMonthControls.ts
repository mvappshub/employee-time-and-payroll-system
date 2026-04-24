import { useEffect, useMemo, useState } from 'react'
import { calcAverageSourceSnapshot, calculateMonthDays, calcMonthlySummary, calcPaySlip } from '../domain/payroll/calc'
import { fetchQuarterlyPhv, loadSavedMonth, saveMonthRecord, type MonthWorkflowStatus } from '../infrastructure/api/monthStorage'
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

  const persistWorkflowStatus = async (workflowStatus: MonthWorkflowStatus, preserveExisting = false) => {
    const existingRecord = preserveExisting ? await loadSavedMonth(currentMonth) : null
    await saveMonthRecord({
      ...existingRecord,
      month: currentMonth,
      employer,
      employee,
      records: monthRecords,
      paySlipInputs: inputs,
      workflowStatus,
    })
    setMonthStatus(currentMonth, workflowStatus)
  }

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
        workflowStatus: loaded.workflowStatus,
      })
    },
    onSave: async () => {
      setError('')
      setInfo('')

      try {
        await persistWorkflowStatus('save-incomplete')
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
        return
      }

      try {
        const averageResponse = await fetchQuarterlyPhv(currentMonth)
        if (averageResponse.sourceType === 'unavailable' || averageResponse.averageHourlyEarnings === null || averageResponse.averageHourlyEarnings <= 0) {
          setMonthStatus(currentMonth, 'save-incomplete')
          setInfo(averageResponse.reason || AUTOMATIC_PHV_ERROR_MESSAGE)
          return
        }
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
          workflowStatus: 'saved',
          ...resolvedAverageSource,
          snapshot,
        })
        setMonthStatus(currentMonth, 'saved')
      } catch (caughtError) {
        setMonthStatus(currentMonth, 'save-incomplete')
        setInfo(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onPrefill: () => {
      setError('')
      setInfo('')
      prefillMonth(currentMonth)
    },
    onCloseMonth: async () => {
      setError('')
      setInfo('')
      if ((monthStatus[currentMonth] || 'empty') !== 'saved') {
        setInfo('Měsíc lze uzavřít až po úplném uložení a přepočtu podkladů pro PHV.')
        return
      }
      try {
        await persistWorkflowStatus('closed', true)
        closeMonth(currentMonth)
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
    onApproveMonth: async () => {
      setError('')
      setInfo('')
      try {
        await persistWorkflowStatus('approved', true)
        approveMonth(currentMonth)
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : AUTOMATIC_PHV_ERROR_MESSAGE)
      }
    },
  }
}
