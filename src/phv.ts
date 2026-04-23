import type { SavedMonthSnapshot } from './monthStorage'
import type { QuarterlyPhvResponse } from './monthStorage'

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

export function calculateQuarterlyPhv(months: Array<{ month: string; snapshot: SavedMonthSnapshot }>): {
  phv: number | null
  totalGrossWage: number
  totalWorkedHours: number
} {
  const totalGrossWage = months.reduce((sum, item) => sum + item.snapshot.grossWage, 0)
  const totalWorkedHours = months.reduce((sum, item) => sum + item.snapshot.workedHours, 0)

  return {
    phv: totalWorkedHours > 0 ? totalGrossWage / totalWorkedHours : null,
    totalGrossWage,
    totalWorkedHours,
  }
}

export function resolveAutomaticPhv(response: QuarterlyPhvResponse): number {
  if (response.phv === null || response.missingMonths.length > 0 || !Number.isFinite(response.phv) || response.phv <= 0) {
    throw new Error(AUTOMATIC_PHV_ERROR_MESSAGE)
  }

  return response.phv
}
