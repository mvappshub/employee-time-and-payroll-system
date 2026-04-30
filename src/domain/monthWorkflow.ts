import type { MonthStatus } from './shared/types'

const TIME_CLOSED_OR_LATER: MonthStatus[] = [
  'time_closed',
  'payroll_calculated',
  'payroll_approved',
  'payslip_issued',
]

const PAYROLL_STATUS: MonthStatus[] = [
  'payroll_calculated',
  'payroll_approved',
  'payslip_issued',
]

export function isDraftLike(status?: MonthStatus): boolean {
  return status === 'draft' || status === 'time_saved'
}

export function isTimeSavedOrLater(status?: MonthStatus): boolean {
  return status === 'time_saved' || isTimeClosedOrLater(status)
}

export function isTimeClosedOrLater(status?: MonthStatus): boolean {
  return status ? TIME_CLOSED_OR_LATER.includes(status) : false
}

export function isPayrollCalculatedOrLater(status?: MonthStatus): boolean {
  return status ? PAYROLL_STATUS.includes(status) : false
}

export function isPayrollApprovedOrLater(status?: MonthStatus): boolean {
  return status === 'payroll_approved' || status === 'payslip_issued'
}

export function isTimeEditable(status?: MonthStatus): boolean {
  return status === 'draft' || status === 'time_saved'
}

export function isPayrollPhase(status?: MonthStatus): boolean {
  return isTimeClosedOrLater(status)
}

export function canCloseAndCalculate(status?: MonthStatus): boolean {
  return isDraftLike(status)
}

export function canCalculatePayroll(status?: MonthStatus): boolean {
  return status === 'time_closed' || status === 'payroll_calculated'
}

export function canApproveAndIssue(status?: MonthStatus): boolean {
  return status === 'payroll_calculated'
}

export function canIssuePayslip(status?: MonthStatus): boolean {
  return status === 'payroll_approved'
}

export function canPrintPayslip(status?: MonthStatus): boolean {
  return status === 'payslip_issued'
}

export function canReopenMonth(status?: MonthStatus): boolean {
  return isTimeClosedOrLater(status)
}

export function routeForMonthStatus(status?: MonthStatus): 'time-tracking' | 'payroll' {
  return !status || isDraftLike(status) ? 'time-tracking' : 'payroll'
}
