import type { MonthStatus } from '../domain/shared/types'

export const MONTH_STATUS_LABELS: Record<MonthStatus, string> = {
  empty: 'Bez měsíce',
  draft: 'Rozpracováno',
  time_saved: 'Evidence uložena',
  time_closed: 'Evidence uzavřena',
  payroll_calculated: 'Mzda spočítána',
  payroll_approved: 'Mzda schválena',
  payslip_issued: 'Páska vystavena',
}

export function formatMonthStatus(status?: MonthStatus): string {
  return status ? MONTH_STATUS_LABELS[status] : 'Bez dat'
}

export function isPayrollStatus(status?: MonthStatus): boolean {
  return status === 'payroll_calculated' || status === 'payroll_approved' || status === 'payslip_issued'
}

export function payslipStatusLabel(status?: MonthStatus): string {
  return status === 'payslip_issued' ? 'Vystavena' : '—'
}
