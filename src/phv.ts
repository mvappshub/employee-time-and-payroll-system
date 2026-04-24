import { getDaysInMonth, isWeekend } from './calc'
import { mergeHolidayYears } from './holidayCalendar'
import type { QuarterlyPhvResponse } from './monthStorage'
import type { EmployeeSettings } from './types'

export const AUTOMATIC_PHV_ERROR_MESSAGE = 'Chybí podklady pro automatický výpočet PHV z předchozího čtvrtletí.'

function monthId(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function getPreviousQuarterMonths(targetMonth: string): string[] {
  const [year, month] = targetMonth.split('-').map(Number)

  if (month >= 1 && month <= 3) {
    return [monthId(year - 1, 10), monthId(year - 1, 11), monthId(year - 1, 12)]
  }
  if (month >= 4 && month <= 6) {
    return [monthId(year, 1), monthId(year, 2), monthId(year, 3)]
  }
  if (month >= 7 && month <= 9) {
    return [monthId(year, 4), monthId(year, 5), monthId(year, 6)]
  }
  return [monthId(year, 7), monthId(year, 8), monthId(year, 9)]
}

export interface AverageQuarterTotals {
  grossForAverage: number
  workedHoursForAverage: number
  workedDaysForAverage: number
}

export interface AverageEarningsEmployeeContext {
  employmentStartDate: string
  baseSalary: number
  personalBonus: number
  weeklyHours: number
  workDaysPerWeek: number
  weekendWorking: boolean
}

export function getEmploymentStartMonth(employmentStartDate: string): string {
  return employmentStartDate.slice(0, 7)
}

export function sumAverageQuarterTotals(items: AverageQuarterTotals[]): AverageQuarterTotals {
  return items.reduce(
    (sum, item) => ({
      grossForAverage: sum.grossForAverage + item.grossForAverage,
      workedHoursForAverage: sum.workedHoursForAverage + item.workedHoursForAverage,
      workedDaysForAverage: sum.workedDaysForAverage + item.workedDaysForAverage,
    }),
    { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
  )
}

export function calculateActualPhv(totals: AverageQuarterTotals): number | null {
  if (totals.workedHoursForAverage > 0 && totals.grossForAverage > 0) {
    return totals.grossForAverage / totals.workedHoursForAverage
  }

  return null
}

export function calculateProbableHourlyEarnings(employee: AverageEarningsEmployeeContext, targetMonth: string): number | null {
  const probableMonthlyEarnings = employee.baseSalary + employee.baseSalary * employee.personalBonus
  const [year] = targetMonth.split('-').map(Number)
  const holidays = mergeHolidayYears([], [year])
  const holidayDates = new Set(holidays.map(holiday => holiday.date))
  const dailyFund = employee.workDaysPerWeek > 0 ? employee.weeklyHours / employee.workDaysPerWeek : 0
  const targetMonthFundHours = getDaysInMonth(targetMonth).reduce((sum, date) => {
    if (!employee.weekendWorking && isWeekend(date)) return sum
    if (holidayDates.has(date)) return sum
    return sum + dailyFund
  }, 0)

  if (probableMonthlyEarnings <= 0 || targetMonthFundHours <= 0) {
    return null
  }

  return probableMonthlyEarnings / targetMonthFundHours
}

export function resolveAverageEarnings(
  month: string,
  employee: AverageEarningsEmployeeContext | null,
  sourceMonths: string[],
  totals: AverageQuarterTotals,
  missingMonths: string[],
  employeeContextMonth: string | null = null,
): QuarterlyPhvResponse {
  const quarterComplete = missingMonths.length === 0
  const actualPhv = quarterComplete ? calculateActualPhv(totals) : null
  const probableHourlyEarnings = employee ? calculateProbableHourlyEarnings(employee, month) : null
  const [periodStart] = sourceMonths
  const periodEnd = sourceMonths[sourceMonths.length - 1]

  if (actualPhv !== null) {
    return {
      month,
      sourceType: 'actual',
      averageHourlyEarnings: actualPhv,
      actualPhv,
      probableHourlyEarnings,
      employeeContextMonth,
      periodStart,
      periodEnd,
      sourceMonths,
      missingMonths,
      grossForAverage: totals.grossForAverage,
      workedHoursForAverage: totals.workedHoursForAverage,
      workedDaysForAverage: totals.workedDaysForAverage,
      reason: null,
    }
  }

  if (probableHourlyEarnings !== null) {
    return {
      month,
      sourceType: 'probable',
      averageHourlyEarnings: probableHourlyEarnings,
      actualPhv: null,
      probableHourlyEarnings,
      employeeContextMonth,
      periodStart,
      periodEnd,
      sourceMonths,
      missingMonths,
      grossForAverage: totals.grossForAverage,
      workedHoursForAverage: totals.workedHoursForAverage,
      workedDaysForAverage: totals.workedDaysForAverage,
      reason: null,
    }
  }

  const reason = !quarterComplete
    ? employee === null
      ? 'Chybí uložený employee snapshot pro výpočet pravděpodobného výdělku.'
      : AUTOMATIC_PHV_ERROR_MESSAGE
    : employee === null
      ? 'Chybí uložený employee snapshot pro výpočet pravděpodobného výdělku.'
      : AUTOMATIC_PHV_ERROR_MESSAGE

  return {
    month,
    sourceType: 'unavailable',
    averageHourlyEarnings: null,
    actualPhv: null,
    probableHourlyEarnings: null,
    employeeContextMonth,
    periodStart,
    periodEnd,
    sourceMonths,
    missingMonths,
    grossForAverage: totals.grossForAverage,
    workedHoursForAverage: totals.workedHoursForAverage,
    workedDaysForAverage: totals.workedDaysForAverage,
    reason,
  }
}

export function assertAvailableAverageEarnings(response: QuarterlyPhvResponse): number {
  if (response.sourceType === 'unavailable' || response.averageHourlyEarnings === null || response.averageHourlyEarnings <= 0) {
    throw new Error(response.reason || AUTOMATIC_PHV_ERROR_MESSAGE)
  }

  return response.averageHourlyEarnings
}
