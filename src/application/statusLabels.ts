import type { MonthStatus } from '../domain/shared/types'
import { describeMonthStatus, isPayrollCalculatedOrLater } from '../domain/monthWorkflow'

export function formatMonthStatus(status?: MonthStatus): string {
  return describeMonthStatus(status).label
}

export function isPayrollStatus(status?: MonthStatus): boolean {
  return isPayrollCalculatedOrLater(status)
}

export function payslipStatusLabel(status?: MonthStatus): string {
  return status === 'payslip_issued' ? 'Vystavena' : '—'
}
