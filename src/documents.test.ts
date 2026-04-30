import { describe, expect, it } from 'vitest'

import {
  buildEmploymentContractDocument,
  buildIssuedPayslipDocument,
  buildTimeSheetStatementDocument,
  invalidateDocument,
} from './domain/documents/builders'
import { buildEmployeeMonthRecord } from './domain/month/employeeMonth'
import type { EmployeeMonth, EmployeeSettings, EmployerProfile } from './domain/shared/types'

const employer: EmployerProfile = {
  name: 'ACME s.r.o.',
  ico: '12345678',
  seat: 'Praha 1',
  representativeName: 'Jana Jednatelová',
  representativeRole: 'jednatelka',
}

const employee: EmployeeSettings = {
  id: 'emp-1',
  name: 'Jan Novák',
  employeeNumber: '001',
  permanentAddress: 'Praha 10',
  status: 'active',
  employmentType: 'pracovni_pomer',
  employmentStartDate: '2026-01-01',
  employmentEndDate: '',
  contractJobTitle: 'Operátor výroby',
  contractWorkplace: 'Praha',
  contractWorkSchedule: 'plný úvazek, 40 hodin týdně',
  probationMonths: 3,
  fixedTermEndDate: '',
  workload: 1,
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
  shiftStart: '06:00',
  shiftEnd: '14:30',
  standardBreak: 0.5,
  nightWorkAllowed: true,
  nightFrom: '22:00',
  nightTo: '06:00',
  overtimeAllowed: true,
  baseSalary: 32000,
  personalBonus: 0.2,
  nightSurcharge: 0.1,
  weekendSurcharge: 0.1,
  holidaySurcharge: 1,
  overtimeSurcharge: 0.25,
  sickCompensation: 0.6,
  holidayCompensationMode: 'time-off',
  overtimeCompensationMode: 'premium',
  appliesHealthMinimumBase: true,
  healthMinimumBaseExceptionReason: '',
  taxDeclarationSigned: true,
  taxpayerCreditApplied: true,
  vacationEntitlementHours: 160,
  vacationUsedHours: 8,
  vacationRemainingHours: 152,
}

const month: EmployeeMonth = {
  employeeId: 'emp-1',
  month: '2026-04',
  status: 'payroll_approved',
  records: [
    { date: '2026-04-01', shift: 'ranní', arrival: '06:00', departure: '14:30' },
    { date: '2026-04-02', shift: 'dovolená', arrival: '', departure: '' },
  ],
  paySlipInputs: {
    manualReward: 0,
    includeManualRewardInAverage: false,
    unworked: 0,
    sickCarryoverDays: 0,
  },
  timeSummary: {
    monthlyFundHours: 160,
    workedHours: 8,
    workedDays: 1,
    vacationHours: 8,
    sickHours: 0,
    totalSaldo: 0,
  },
  payrollResult: {
    hrubaMzda: 40000,
    cistaMzda: 32000,
  },
  calculationSnapshot: {
    averageEarningsSource: 'actual',
    averageHourlyEarnings: 250,
    legalConstants: { foo: 1 },
    calculatedAt: '2026-04-30T10:00:00.000Z',
  },
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
}

describe('document builders', () => {
  it('creates a ready employment contract draft when required fields are present', () => {
    const document = buildEmploymentContractDocument(employee, employer)

    expect(document.lifecycleStatus).toBe('ready')
    expect(document.snapshot.employee.contractJobTitle).toBe('Operátor výroby')
    expect(document.snapshot.employer.representativeName).toBe('Jana Jednatelová')
  })

  it('downgrades previously issued contract to refreshable draft when source data changes', () => {
    const first = {
      ...buildEmploymentContractDocument(employee, employer),
      lifecycleStatus: 'issued' as const,
      issuedAt: '2026-04-01T10:00:00.000Z',
    }

    const refreshed = buildEmploymentContractDocument({ ...employee, contractWorkplace: 'Brno' }, employer, first)

    expect(refreshed.lifecycleStatus).toBe('ready')
    expect(refreshed.invalidationReason).toContain('obnovu pracovní smlouvy')
  })

  it('keeps issued contract unchanged when only non-contract payroll fields change', () => {
    const first = {
      ...buildEmploymentContractDocument(employee, employer),
      lifecycleStatus: 'issued' as const,
      issuedAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      version: 2,
    }

    const unchanged = buildEmploymentContractDocument({ ...employee, taxDeclarationSigned: false, vacationUsedHours: 40 }, employer, first)

    expect(unchanged).toBe(first)
    expect(unchanged.version).toBe(2)
    expect(unchanged.invalidatedAt).toBeUndefined()
  })

  it('builds time sheet statement from persisted month snapshot', () => {
    const document = buildTimeSheetStatementDocument(employee, employer, month, [])

    expect(document.snapshot.month).toBe('2026-04')
    expect(document.snapshot.rows[0].arrival).toBe('06:00')
    expect(document.snapshot.totals.vacationHours).toBe(8)
  })

  it('keeps incomplete employment contract in draft state when required fields are missing', () => {
    const document = buildEmploymentContractDocument(employee, { ...employer, representativeName: '', representativeRole: '' })

    expect(document.lifecycleStatus).toBe('draft')
  })

  it('builds issued payslip document with payroll snapshot', () => {
    const document = buildIssuedPayslipDocument(employee, employer, month, {
      workHoursWH: 160,
      workDaysWH: 20,
      totalNight: 4,
      totalWeekend: 0,
      totalHolidayTotal: 0,
      totalOvertime: 2,
      totalVacation: 8,
      totalSick: 0,
    })

    expect(document.lifecycleStatus).toBe('issued')
    expect(document.snapshot.payrollResult.hrubaMzda).toBe(40000)
    expect(document.snapshot.calculationSnapshot?.averageHourlyEarnings).toBe(250)
    expect(document.snapshot.documentSummary.totalOvertime).toBe(2)
  })

  it('invalidates an issued document in place', () => {
    const document = buildIssuedPayslipDocument(employee, employer, month, {
      workHoursWH: 160,
      workDaysWH: 20,
      totalNight: 4,
      totalWeekend: 0,
      totalHolidayTotal: 0,
      totalOvertime: 2,
      totalVacation: 8,
      totalSick: 0,
    })
    const invalidated = invalidateDocument(document, 'Změna dat.')

    expect(invalidated?.lifecycleStatus).toBe('invalidated')
    expect(invalidated?.invalidationReason).toBe('Změna dat.')
  })

  it('preserves issued payslip snapshot through JSON persistence roundtrip', () => {
    const payslipDocument = buildIssuedPayslipDocument(employee, employer, month, {
      workHoursWH: 160,
      workDaysWH: 20,
      totalNight: 4,
      totalWeekend: 0,
      totalHolidayTotal: 0,
      totalOvertime: 2,
      totalVacation: 8,
      totalSick: 0,
    })
    const persisted = buildEmployeeMonthRecord({
      employeeId: month.employeeId,
      month: month.month,
      status: 'payslip_issued',
      employee,
      employer,
      records: month.records,
      paySlipInputs: month.paySlipInputs,
      timeSummary: month.timeSummary,
      payrollResult: month.payrollResult,
      calculationSnapshot: month.calculationSnapshot,
      payslipDocument,
    })

    const roundtrip = JSON.parse(JSON.stringify(persisted)) as EmployeeMonth

    expect(roundtrip.payslipDocument?.documentType).toBe('issued_payslip')
    expect(roundtrip.payslipDocument?.snapshot.documentSummary.workHoursWH).toBe(160)
    expect(roundtrip.payslipDocument?.snapshot.paySlipInputs.manualReward).toBe(0)
  })
})
