import { describe, expect, it } from 'vitest'

import { formatMonthStatus, isPayrollStatus, payslipStatusLabel } from './application/statusLabels'

describe('month status labels', () => {
  it('formats workflow enum values for UI without leaking raw statuses', () => {
    expect(formatMonthStatus()).toBe('Bez dat')
    expect(formatMonthStatus('time_saved')).toBe('Evidence uložena')
    expect(formatMonthStatus('time_closed')).toBe('Evidence uzavřena')
    expect(formatMonthStatus('payroll_calculated')).toBe('Mzda spočítána')
    expect(formatMonthStatus('payroll_approved')).toBe('Mzda schválena')
    expect(formatMonthStatus('payslip_issued')).toBe('Páska vystavena')
  })

  it('separates payroll and payslip status presentation', () => {
    expect(isPayrollStatus('time_saved')).toBe(false)
    expect(isPayrollStatus('payroll_calculated')).toBe(true)
    expect(isPayrollStatus('payroll_approved')).toBe(true)
    expect(isPayrollStatus('payslip_issued')).toBe(true)
    expect(payslipStatusLabel('payslip_issued')).toBe('Vystavena')
    expect(payslipStatusLabel('payroll_approved')).toBe('—')
  })
})
