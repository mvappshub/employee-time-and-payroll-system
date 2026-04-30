import type { MonthStatus } from './shared/types'

export interface MonthStatusDescription {
  label: string
  controlsLabel: string
  nextStepLabel: string
}

export interface MonthPrimaryAction {
  label: string
  route: 'init' | 'timesheet' | 'payroll'
}

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

export function describeMonthStatus(status?: MonthStatus): MonthStatusDescription {
  switch (status) {
    case 'draft':
      return {
        label: 'Rozpracováno',
        controlsLabel: 'Rozpracováno',
        nextStepLabel: 'Uzavřít evidenci a spočítat mzdu',
      }
    case 'time_saved':
      return {
        label: 'Evidence uložena',
        controlsLabel: 'Evidence uložena',
        nextStepLabel: 'Uzavřít evidenci a spočítat mzdu',
      }
    case 'time_closed':
      return {
        label: 'Evidence uzavřena',
        controlsLabel: 'Evidence uzavřena',
        nextStepLabel: 'Spočítat mzdu',
      }
    case 'payroll_calculated':
      return {
        label: 'Mzda spočítána',
        controlsLabel: 'Mzda spočítána',
        nextStepLabel: 'Schválit a vystavit výplatní pásku',
      }
    case 'payroll_approved':
      return {
        label: 'Mzda schválena',
        controlsLabel: 'Mzda schválena',
        nextStepLabel: 'Otevřít mzdy',
      }
    case 'payslip_issued':
      return {
        label: 'Páska vystavena',
        controlsLabel: 'Výplatní páska vystavena',
        nextStepLabel: 'Tisk / PDF',
      }
    case 'empty':
      return {
        label: 'Bez měsíce',
        controlsLabel: 'Bez měsíce',
        nextStepLabel: 'Uzavřít evidenci a spočítat mzdu',
      }
    default:
      return {
        label: 'Bez dat',
        controlsLabel: 'Bez měsíce',
        nextStepLabel: 'Založit měsíc',
      }
  }
}

export function getMonthPrimaryAction(status?: MonthStatus): MonthPrimaryAction {
  if (!status) {
    return { label: 'Založit měsíc', route: 'init' }
  }

  switch (status) {
    case 'draft':
    case 'time_saved':
      return { label: 'Uzavřít evidenci a spočítat mzdu', route: 'timesheet' }
    case 'time_closed':
      return { label: 'Spočítat mzdu', route: 'payroll' }
    case 'payroll_calculated':
      return { label: 'Schválit a vystavit výplatní pásku', route: 'payroll' }
    case 'payroll_approved':
      return { label: 'Otevřít mzdy', route: 'payroll' }
    case 'payslip_issued':
      return { label: 'Tisk / PDF', route: 'payroll' }
    default:
      return { label: 'Založit měsíc', route: 'init' }
  }
}
