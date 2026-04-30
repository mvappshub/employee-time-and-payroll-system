import { beforeEach, describe, expect, it } from 'vitest'

import type { EmployeeMonth } from './domain/shared/types'
import { useStore } from './infrastructure/state/store'

function resetStore() {
  useStore.setState({
    employer: { name: '', ico: '', seat: '', representativeName: '', representativeRole: '' },
    employees: [],
    selectedEmployeeId: null,
    recordsByEmployee: {},
    paySlipInputsByEmployee: {},
    monthStatusByEmployee: {},
    payrollByEmployee: {},
    currentMonth: '2026-04',
    section: 'employees',
  })
}

function createPersistedEmployee() {
  return useStore.getState().createEmployee({
    id: 'emp-1',
    name: 'Jan Novák',
    employeeNumber: '001',
    permanentAddress: 'Praha',
    employmentStartDate: '2026-01-01',
    contractJobTitle: 'Operátor',
    contractWorkplace: 'Praha',
    contractWorkSchedule: 'plný úvazek',
    baseSalary: 32000,
  })
}

describe('holiday defaults', () => {
  it('contains Czech public holidays for 2026', () => {
    const holidays = useStore.getState().holidays

    expect(holidays.some(h => h.date === '2026-04-06')).toBe(true)
    expect(holidays.some(h => h.date === '2026-12-25')).toBe(true)
  })
})

describe('store workflow cache', () => {
  beforeEach(() => {
    resetStore()
  })

  it('selecting an employee does not create a month automatically', () => {
    const employeeId = createPersistedEmployee()

    useStore.getState().selectEmployee(employeeId)

    expect(useStore.getState().recordsByEmployee[employeeId]?.['2026-04']).toBeUndefined()
    expect(useStore.getState().monthStatusByEmployee[employeeId]?.['2026-04']).toBeUndefined()
  })

  it('changing currentMonth does not create a month automatically', () => {
    const employeeId = createPersistedEmployee()
    useStore.getState().selectEmployee(employeeId)

    useStore.getState().setCurrentMonth('2030-02')

    expect(useStore.getState().recordsByEmployee[employeeId]?.['2030-02']).toBeUndefined()
    expect(useStore.getState().monthStatusByEmployee[employeeId]?.['2030-02']).toBeUndefined()
  })

  it('month is created only by explicit initEmployeeMonth with prefilled work schedule', () => {
    const employeeId = createPersistedEmployee()

    useStore.getState().initEmployeeMonth(employeeId, '2030-01')

    const records = useStore.getState().recordsByEmployee[employeeId]['2030-01']
    expect(records).toHaveLength(31)
    expect(records[0]).toMatchObject({ date: '2030-01-01', shift: 'ranní', arrival: '06:00', departure: '14:30' })
    expect(records[5]).toMatchObject({ date: '2030-01-06', shift: 'volno', arrival: '', departure: '' })
    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-01']).toBe('draft')
  })

  it('returns month status from payroll phase to time_saved after editing closed evidence', () => {
    const employeeId = createPersistedEmployee()
    useStore.getState().initEmployeeMonth(employeeId, '2030-06')
    useStore.getState().closeEmployeeTime(employeeId, '2030-06')
    useStore.getState().calculateEmployeePayroll(employeeId, '2030-06', {
      payrollResult: { hrubaMzda: 40000 },
      payslipDocument: {
        documentType: 'issued_payslip',
        lifecycleStatus: 'issued',
        issuedAt: '2030-06-10T10:00:00.000Z',
        updatedAt: '2030-06-10T10:00:00.000Z',
        referenceId: employeeId,
        sourceMonth: '2030-06',
        version: 1,
        snapshotOrigin: 'month',
        snapshot: {
          employer: { name: 'ACME', ico: '123', seat: 'Praha', representativeName: 'Jana', representativeRole: 'jednatelka' },
          employee: {
            id: employeeId,
            name: 'Jan Novák',
            employeeNumber: '001',
            employmentType: 'pracovni_pomer',
            baseSalary: 32000,
            personalBonus: 0.25,
            nightSurcharge: 0.1,
            weekendSurcharge: 0.1,
            sickCompensation: 0.6,
            overtimeSurcharge: 0.25,
            vacationEntitlementHours: 0,
            vacationUsedHours: 0,
            vacationRemainingHours: 0,
          },
          month: '2030-06',
          payrollResult: { hrubaMzda: 40000 },
          paySlipInputs: {
            manualReward: 0,
            includeManualRewardInAverage: false,
            unworked: 0,
            sickCarryoverDays: 0,
            holidayCompensationMode: 'time-off',
          },
          documentSummary: {
            workHoursWH: 160,
            workDaysWH: 20,
            totalNight: 0,
            totalWeekend: 0,
            totalHolidayTotal: 0,
            totalOvertime: 0,
            totalVacation: 0,
            totalSick: 0,
          },
        },
      },
    })

    useStore.getState().updateRecord(employeeId, '2030-06', 0, { shift: 'ranní' })

    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-06']).toBe('time_saved')
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-06'].payrollResult).toBeUndefined()
  })

  it('returns month status from payroll phase to time_closed after editing payroll inputs', () => {
    const employeeId = createPersistedEmployee()
    useStore.getState().initEmployeeMonth(employeeId, '2030-07')
    useStore.getState().closeEmployeeTime(employeeId, '2030-07')
    useStore.getState().calculateEmployeePayroll(employeeId, '2030-07', {
      payrollResult: { hrubaMzda: 40000 },
      approvedAt: '2030-07-10T10:00:00.000Z',
      issuedAt: '2030-07-10T10:00:00.000Z',
    })

    useStore.getState().setPaySlipInput(employeeId, '2030-07', { manualReward: 1000 })

    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-07']).toBe('time_closed')
    expect(useStore.getState().paySlipInputsByEmployee[employeeId]['2030-07'].manualReward).toBe(1000)
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-07'].payrollResult).toBeUndefined()
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-07'].approvedAt).toBeUndefined()
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-07'].issuedAt).toBeUndefined()
  })

  it('hydrates persisted workflow status and month data for an employee month', () => {
    const employeeId = createPersistedEmployee()
    const monthData: EmployeeMonth = {
      employeeId,
      month: '2030-05',
      status: 'payroll_approved',
      records: [],
      paySlipInputs: {
        manualReward: 0,
        includeManualRewardInAverage: false,
        unworked: 0,
        sickCarryoverDays: 0,
        holidayCompensationMode: 'time-off',
      },
      createdAt: '2030-05-01T10:00:00.000Z',
      updatedAt: '2030-05-02T10:00:00.000Z',
      approvedAt: '2030-05-03T10:00:00.000Z',
      auditTrail: [{ at: '2030-05-03T10:00:00.000Z', action: 'approve-payroll' }],
    }

    useStore.getState().hydrateEmployeeMonth(employeeId, '2030-05', monthData)

    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-05']).toBe('payroll_approved')
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-05'].approvedAt).toBe('2030-05-03T10:00:00.000Z')
  })
})
