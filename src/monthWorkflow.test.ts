import { describe, expect, it } from 'vitest'

import {
  canApproveAndIssue,
  canCalculatePayroll,
  canCloseAndCalculate,
  canIssuePayslip,
  canPrintPayslip,
  canReopenMonth,
  describeMonthStatus,
  getMonthPrimaryAction,
  isPayrollApprovedOrLater,
  isPayrollCalculatedOrLater,
  isTimeClosedOrLater,
  isTimeEditable,
  isTimeSavedOrLater,
  routeForMonthStatus,
} from './domain/monthWorkflow'

describe('month workflow predicates', () => {
  it('keeps time evidence editable only before closure', () => {
    expect(isTimeEditable('draft')).toBe(true)
    expect(isTimeEditable('time_saved')).toBe(true)
    expect(isTimeEditable('time_closed')).toBe(false)
    expect(isTimeEditable('payslip_issued')).toBe(false)
  })

  it('models workflow phase thresholds', () => {
    expect(isTimeSavedOrLater('draft')).toBe(false)
    expect(isTimeSavedOrLater('time_saved')).toBe(true)
    expect(isTimeClosedOrLater('time_closed')).toBe(true)
    expect(isTimeClosedOrLater('payroll_calculated')).toBe(true)
    expect(isPayrollCalculatedOrLater('time_closed')).toBe(false)
    expect(isPayrollCalculatedOrLater('payroll_calculated')).toBe(true)
    expect(isPayrollApprovedOrLater('payroll_approved')).toBe(true)
    expect(isPayrollApprovedOrLater('payslip_issued')).toBe(true)
  })

  it('centralizes action availability', () => {
    expect(canCloseAndCalculate('draft')).toBe(true)
    expect(canCloseAndCalculate('time_saved')).toBe(true)
    expect(canCalculatePayroll('time_closed')).toBe(true)
    expect(canApproveAndIssue('payroll_calculated')).toBe(true)
    expect(canIssuePayslip('payroll_approved')).toBe(true)
    expect(canPrintPayslip('payslip_issued')).toBe(true)
    expect(canReopenMonth('payroll_approved')).toBe(true)
  })

  it('routes time statuses to time tracking and payroll statuses to payroll', () => {
    expect(routeForMonthStatus()).toBe('time-tracking')
    expect(routeForMonthStatus('draft')).toBe('time-tracking')
    expect(routeForMonthStatus('time_saved')).toBe('time-tracking')
    expect(routeForMonthStatus('time_closed')).toBe('payroll')
    expect(routeForMonthStatus('payslip_issued')).toBe('payroll')
  })

  it('describes status labels and primary actions in one place', () => {
    expect(describeMonthStatus().label).toBe('Bez dat')
    expect(describeMonthStatus('payslip_issued').label).toBe('Páska vystavena')
    expect(describeMonthStatus('payslip_issued').controlsLabel).toBe('Výplatní páska vystavena')
    expect(describeMonthStatus('payroll_calculated').nextStepLabel).toBe('Schválit a vystavit výplatní pásku')

    expect(getMonthPrimaryAction().label).toBe('Založit měsíc')
    expect(getMonthPrimaryAction().route).toBe('init')
    expect(getMonthPrimaryAction('time_saved')).toEqual({
      label: 'Uzavřít evidenci a spočítat mzdu',
      route: 'timesheet',
    })
    expect(getMonthPrimaryAction('payslip_issued')).toEqual({
      label: 'Tisk / PDF',
      route: 'payroll',
    })
  })
})
