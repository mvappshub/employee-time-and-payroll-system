import { describe, expect, it } from 'vitest'
import {
  AUTOMATIC_PHV_ERROR_MESSAGE,
  calculateProbableHourlyEarnings,
  getEmploymentStartMonth,
  getPreviousQuarterMonths,
  resolveAverageEarnings,
  sumAverageQuarterTotals,
} from './domain/payroll/phv'
import type { AverageEarningsEmployeeContext } from './domain/payroll/phv'

const employee: AverageEarningsEmployeeContext = {
  employmentStartDate: '2026-01-01',
  baseSalary: 30000,
  personalBonus: 0.25,
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
}

describe('PHV quarter selection', () => {
  it('uses October to December for January to March', () => {
    expect(getPreviousQuarterMonths('2026-01')).toEqual(['2025-10', '2025-11', '2025-12'])
    expect(getPreviousQuarterMonths('2026-03')).toEqual(['2025-10', '2025-11', '2025-12'])
  })

  it('uses the previous calendar quarter for the rest of the year', () => {
    expect(getPreviousQuarterMonths('2026-04')).toEqual(['2026-01', '2026-02', '2026-03'])
    expect(getPreviousQuarterMonths('2026-07')).toEqual(['2026-04', '2026-05', '2026-06'])
    expect(getPreviousQuarterMonths('2026-10')).toEqual(['2026-07', '2026-08', '2026-09'])
  })
})

describe('average earnings source resolution', () => {
  it('uses probable source for January 2026 because previous quarter is before employment start', () => {
    const result = resolveAverageEarnings(
      '2026-01',
      employee,
      ['2025-10', '2025-11', '2025-12'],
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      [],
    )

    expect(getEmploymentStartMonth(employee.employmentStartDate)).toBe('2026-01')
    expect(result.sourceType).toBe('probable')
    expect(result.averageHourlyEarnings).toBe(result.probableHourlyEarnings)
    expect(result.actualPhv).toBeNull()
    expect(result.reason).toBeNull()
  })

  it('uses probable earnings for April 2026 when Q1 has fewer than 21 worked days', () => {
    const totals = sumAverageQuarterTotals([
      { grossForAverage: 30000, workedHoursForAverage: 160, workedDaysForAverage: 6 },
      { grossForAverage: 32000, workedHoursForAverage: 152, workedDaysForAverage: 5 },
      { grossForAverage: 31000, workedHoursForAverage: 160, workedDaysForAverage: 6 },
    ])
    const result = resolveAverageEarnings(
      '2026-04',
      employee,
      ['2026-01', '2026-02', '2026-03'],
      totals,
      [],
    )

    expect(result.sourceType).toBe('probable')
    expect(result.actualPhv).toBeNull()
    expect(result.averageHourlyEarnings).toBe(result.probableHourlyEarnings)
  })

  it('does not return actual PHV when one relevant quarter month is missing', () => {
    const totals = sumAverageQuarterTotals([
      { grossForAverage: 62000, workedHoursForAverage: 320, workedDaysForAverage: 42 },
      { grossForAverage: 31000, workedHoursForAverage: 160, workedDaysForAverage: 21 },
    ])
    const result = resolveAverageEarnings(
      '2026-04',
      employee,
      ['2026-01', '2026-02', '2026-03'],
      totals,
      ['2026-02'],
      '2026-01',
    )

    expect(result.sourceType).toBe('probable')
    expect(result.actualPhv).toBeNull()
    expect(result.reason).toBeNull()
  })

  it('uses probable source for February 2026 when previous quarter is before employment start', () => {
    const result = resolveAverageEarnings(
      '2026-02',
      employee,
      ['2025-10', '2025-11', '2025-12'],
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      [],
    )

    expect(result.sourceType).toBe('probable')
    expect(result.actualPhv).toBeNull()
    expect(result.reason).toBeNull()
  })

  it('uses probable source for March 2026 when previous quarter is before employment start', () => {
    const result = resolveAverageEarnings(
      '2026-03',
      employee,
      ['2025-10', '2025-11', '2025-12'],
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      [],
    )

    expect(result.sourceType).toBe('probable')
    expect(result.actualPhv).toBeNull()
    expect(result.reason).toBeNull()
  })

  it('treats missing post-start month as incomplete quarter even if earlier quarter months are irrelevant', () => {
    const employeeStartingInFebruary: AverageEarningsEmployeeContext = {
      ...employee,
      employmentStartDate: '2026-02-10',
    }
    const result = resolveAverageEarnings(
      '2026-05',
      employeeStartingInFebruary,
      ['2026-01', '2026-02', '2026-03'],
      { grossForAverage: 64000, workedHoursForAverage: 320, workedDaysForAverage: 40 },
      ['2026-03'],
      '2026-02',
    )

    expect(result.sourceType).toBe('probable')
    expect(result.missingMonths).toEqual(['2026-03'])
    expect(result.reason).toBeNull()
  })

  it('does not count months before employment start as missing', () => {
    const result = resolveAverageEarnings(
      '2026-02',
      employee,
      ['2025-10', '2025-11', '2025-12'],
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      [],
    )

    expect(result.missingMonths).toEqual([])
    expect(result.sourceType).toBe('probable')
    expect(result.reason).toBeNull()
  })

  it('returns unavailable when probable earnings are missing and employee snapshot is unavailable', () => {
    const result = resolveAverageEarnings(
      '2026-04',
      null,
      ['2026-01', '2026-02', '2026-03'],
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      ['2026-02'],
    )

    expect(result.sourceType).toBe('unavailable')
    expect(result.averageHourlyEarnings).toBeNull()
    expect(result.reason).toBe('Chybí uložený employee snapshot pro výpočet pravděpodobného výdělku.')
  })

  it('returns unavailable when quarter is incomplete and stored employee snapshot cannot produce probable earnings', () => {
    const result = resolveAverageEarnings(
      '2026-04',
      { ...employee, baseSalary: 0, personalBonus: 0 },
      ['2026-01', '2026-02', '2026-03'],
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      ['2026-02'],
      '2026-01',
    )

    expect(result.sourceType).toBe('unavailable')
    expect(result.averageHourlyEarnings).toBeNull()
    expect(result.reason).toBe(AUTOMATIC_PHV_ERROR_MESSAGE)
  })

  it('calculates probable earnings from fixed contractual data and target month fund hours', () => {
    const probable = calculateProbableHourlyEarnings(employee, '2026-01')

    expect(probable).toBeGreaterThan(0)
    expect(probable).toBeCloseTo(37500 / 168, 8)
  })
})
