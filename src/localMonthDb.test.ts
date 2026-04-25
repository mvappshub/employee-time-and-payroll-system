import { describe, expect, it } from 'vitest'
import {
  findLatestEmployeeContextMonth,
  pickEmployeeContextForMonth,
  type PersistedMonthRecord,
} from './infrastructure/dev-server/monthDbApi'

const januaryEmployee = {
  employmentStartDate: '2026-01-01',
  baseSalary: 30000,
  personalBonus: 0.1,
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
}

function monthRecord(month: string, employee: Partial<typeof januaryEmployee> = januaryEmployee): PersistedMonthRecord {
  return {
    employeeId: 'emp-1',
    month,
    status: 'time_saved',
    records: [],
    paySlipInputs: {
      manualReward: 0,
      includeManualRewardInAverage: false,
      unworked: 0,
      sickCarryoverDays: 0,
    },
    employee,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  }
}

describe('local month db employee context resolution', () => {
  it('picks the latest stored employee snapshot from month <= target month', () => {
    const records: PersistedMonthRecord[] = [
      monthRecord('2026-01', januaryEmployee),
      monthRecord('2026-03', { ...januaryEmployee, baseSalary: 35000 }),
      monthRecord('2026-05', { ...januaryEmployee, baseSalary: 39000 }),
    ]

    expect(findLatestEmployeeContextMonth(records, '2026-04')).toBe('2026-03')
    expect(pickEmployeeContextForMonth(records, '2026-04')).toEqual({ ...januaryEmployee, baseSalary: 35000 })
  })

  it('does not use future months as employee context source', () => {
    const records: PersistedMonthRecord[] = [
      monthRecord('2026-05', { ...januaryEmployee, baseSalary: 39000 }),
    ]

    expect(findLatestEmployeeContextMonth(records, '2026-04')).toBeNull()
    expect(pickEmployeeContextForMonth(records, '2026-04')).toBeNull()
  })

  it('normalizes legacy stored employee snapshots that miss employment start date', () => {
    const records: PersistedMonthRecord[] = [
      {
        ...monthRecord('2026-01', {
          baseSalary: 30000,
          personalBonus: 0,
          weeklyHours: 40,
          workDaysPerWeek: 5,
          weekendWorking: false,
        }),
      },
    ]

    expect(findLatestEmployeeContextMonth(records, '2026-04')).toBe('2026-01')
    expect(pickEmployeeContextForMonth(records, '2026-04')).toEqual({
      employmentStartDate: '2026-01-01',
      baseSalary: 30000,
      personalBonus: 0,
      weeklyHours: 40,
      workDaysPerWeek: 5,
      weekendWorking: false,
    })
  })

  it('accepts legacy month records without employer snapshot', () => {
    const records: PersistedMonthRecord[] = [
      monthRecord('2026-02', januaryEmployee),
    ]

    expect(records[0].employer).toBeUndefined()
    expect(findLatestEmployeeContextMonth(records, '2026-03')).toBe('2026-02')
  })
})
