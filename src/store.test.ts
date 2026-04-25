import { beforeEach, describe, expect, it } from 'vitest'

import type { EmployeeMonth } from './domain/shared/types'
import { useStore } from './infrastructure/state/store'

function resetStore() {
  useStore.setState({
    employer: { name: '', ico: '', seat: '' },
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

function createEmployee() {
  const id = useStore.getState().createEmployee({
    name: 'Jan Novák',
    employeeNumber: '001',
    employmentStartDate: '2026-01-01',
    baseSalary: 32000,
  })
  useStore.getState().selectEmployee(id)
  return id
}

describe('holiday defaults', () => {
  it('contains Czech public holidays for 2026', () => {
    const holidays = useStore.getState().holidays

    expect(holidays.some(h => h.date === '2026-04-06')).toBe(true)
    expect(holidays.some(h => h.date === '2026-12-25')).toBe(true)
  })
})

describe('employee month store', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts a new employee month as draft with empty records', () => {
    const employeeId = createEmployee()
    useStore.getState().initEmployeeMonth(employeeId, '2030-01')

    const records = useStore.getState().recordsByEmployee[employeeId]['2030-01']
    expect(records).toHaveLength(31)
    expect(records.every(record => record.shift === '' && record.arrival === '' && record.departure === '')).toBe(true)
    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-01']).toBe('draft')
  })

  it('prefills only the requested month for the selected employee', () => {
    const employeeId = createEmployee()
    useStore.getState().initEmployeeMonth(employeeId, '2030-02')
    useStore.getState().prefillEmployeeMonth(employeeId, '2030-02')

    const records = useStore.getState().recordsByEmployee[employeeId]['2030-02']
    expect(records.some(record => record.shift === 'ranní')).toBe(true)
    expect(useStore.getState().recordsByEmployee[employeeId]['2030-03']).toBeUndefined()
    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-02']).toBe('draft')
  })

  it('creates employees with pracovni_pomer as the only supported employment type', () => {
    const employeeId = createEmployee()
    const employee = useStore.getState().employees.find(item => item.id === employeeId)

    expect(employee?.employmentType).toBe('pracovni_pomer')
  })

  it('normalizes any attempted employmentType update back to pracovni_pomer', () => {
    const employeeId = createEmployee()
    useStore.getState().updateEmployee(employeeId, { employmentType: 'pracovni_pomer' as never })
    const employee = useStore.getState().employees.find(item => item.id === employeeId)

    expect(employee?.employmentType).toBe('pracovni_pomer')
  })

  it('starts with empty employer profile and selectedEmployeeId null', () => {
    const { employer, selectedEmployeeId, employees } = useStore.getState()

    expect(employer).toEqual({ name: '', ico: '', seat: '' })
    expect(selectedEmployeeId).toBeNull()
    expect(employees).toEqual([])
  })

  it('hydrates persisted workflow status and month data for an employee month', () => {
    const employeeId = createEmployee()
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

  it('invalidates payroll artifacts when time evidence changes after close', () => {
    const employeeId = createEmployee()
    useStore.getState().initEmployeeMonth(employeeId, '2030-06')
    useStore.getState().closeEmployeeTime(employeeId, '2030-06')
    useStore.getState().calculateEmployeePayroll(employeeId, '2030-06', {
      payrollResult: { hrubaMzda: 40000 },
      payslipDocument: { issuedAt: '2030-06-10T10:00:00.000Z', month: '2030-06' },
    })

    useStore.getState().updateRecord(employeeId, '2030-06', 0, { shift: 'ranní' })

    expect(useStore.getState().monthStatusByEmployee[employeeId]['2030-06']).toBe('time_saved')
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-06'].payrollResult).toBeUndefined()
    expect(useStore.getState().payrollByEmployee[employeeId]['2030-06'].payslipDocument).toBeNull()
  })
})
