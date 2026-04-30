import { describe, expect, it } from 'vitest'
import {
  findLatestEmployeeContextMonth,
  pickEmployeeContextForMonth,
  repairPersistedMonthRecord,
  type PersistedMonthRecord,
} from './infrastructure/dev-server/monthDbApi'
import type { EmployeeSettings } from './domain/shared/types'

const januaryEmployee = {
  employmentStartDate: '2026-01-01',
  baseSalary: 30000,
  personalBonus: 0.1,
  workload: 1,
  shiftOperation: 'single' as const,
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
}

function monthRecord(month: string, employee: Partial<EmployeeSettings> = januaryEmployee): PersistedMonthRecord {
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
      workload: 1,
      shiftOperation: 'single',
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

  it('repairs legacy issued payslip documents missing snapshot fields', () => {
    const repaired = repairPersistedMonthRecord({
      ...monthRecord('2026-02', {
        ...januaryEmployee,
        id: 'emp-1',
        name: 'Jan Novák',
        employeeNumber: '001',
        overtimeSurcharge: 0.25,
      }),
      timeSummary: {
        monthlyFundHours: 160,
        workedHours: 152,
        workedDays: 19,
        vacationHours: 8,
        sickHours: 0,
        totalSaldo: 0,
      },
      payrollResult: {
        dailyFund: 8,
        averageHourlyEarnings: 250,
        nightSurchargeRate: 0.1,
        weekendSurchargeRate: 0.1,
        holidaySurchargeRate: 1,
        nightSurchargeCalc: 100,
        weekendSurchargeCalc: 0,
        holidaySurchargeCalc: 0,
        overtimeSurchargeCalc: 125,
      },
      payslipDocument: {
        issuedAt: '2026-02-28T10:00:00.000Z',
        month: '2026-02',
      } as never,
    })

    expect(repaired.payslipDocument?.documentType).toBe('issued_payslip')
    expect(repaired.payslipDocument?.snapshot.documentSummary.workHoursWH).toBe(160)
    expect(repaired.payslipDocument?.snapshot.documentSummary.totalOvertime).toBe(2)
  })
})
