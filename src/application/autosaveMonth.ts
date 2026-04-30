import type {
  EmployeeSettings,
  EmployerProfile,
  MonthStatus,
  PaySlipInputs,
  TimeRecord,
  TimeSummary,
} from '../domain/shared/types'
import {
  buildEmployeeMonthRecord,
  saveEmployeeMonth as saveEmployeeMonthApi,
  type SavedMonthRecord,
} from '../infrastructure/api/monthStorage'

type AutosaveMonthInput = {
  employer: EmployerProfile
  employee: EmployeeSettings
  employeeId: string
  month: string
  status: MonthStatus
  records: TimeRecord[]
  paySlipInputs: PaySlipInputs
  timeSummary: TimeSummary
  payrollState?: Partial<SavedMonthRecord>
}

export async function autosaveEmployeeMonthDraft({
  employer,
  employee,
  employeeId,
  month,
  status,
  records,
  paySlipInputs,
  timeSummary,
  payrollState,
}: AutosaveMonthInput) {
  if (status !== 'draft' && status !== 'time_saved' && status !== 'time_closed') return

  const saved = buildEmployeeMonthRecord({
    employeeId,
    month,
    status,
    employer,
    employee,
    records,
    paySlipInputs,
    existing: payrollState ? {
      ...payrollState,
      employeeId,
      month,
      status,
      employee,
      employer,
      records,
      paySlipInputs,
    } : null,
    timeSummary,
    payrollResult: payrollState?.payrollResult,
    calculationSnapshot: payrollState?.calculationSnapshot,
    timeSheetDocument: payrollState?.timeSheetDocument || null,
    payslipDocument: payrollState?.payslipDocument || null,
    auditTrail: payrollState?.auditTrail || [],
    closedAt: payrollState?.closedAt,
    approvedAt: payrollState?.approvedAt,
    issuedAt: payrollState?.issuedAt,
    invalidatedAt: payrollState?.invalidatedAt,
    invalidationReason: payrollState?.invalidationReason,
  })

  await saveEmployeeMonthApi(employeeId, month, saved)
}
