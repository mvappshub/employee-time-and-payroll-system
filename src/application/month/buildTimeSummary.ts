import type { calcMonthlySummary } from '../../domain/payroll/calc'
import type { TimeSummary } from '../../domain/shared/types'

export function buildTimeSummary(summary: ReturnType<typeof calcMonthlySummary>): TimeSummary {
  return {
    monthlyFundHours: summary.monthlyFundHours,
    workedHours: summary.workedHours,
    workedDays: summary.workedDays,
    vacationHours: summary.totalVacation,
    sickHours: summary.totalSick,
    totalSaldo: summary.totalSaldo,
  }
}
