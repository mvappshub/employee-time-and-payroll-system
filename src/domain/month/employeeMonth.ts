import type {
  CalculationSnapshot,
  EmployeeMonth,
  EmployeeSettings,
  EmployerProfile,
  IssuedPayslipDocument,
  MonthStatus,
  PaySlipInputs,
  PayrollResult,
  TimeRecord,
  TimeSheetStatementDocument,
  TimeSummary,
  WorkflowAuditEntry,
} from '../shared/types'

export interface SavedMonthSnapshot {
  grossWage: number
  workedHours: number
  totalSaldo: number
  savedAt: string
}

export interface SavedMonthAverageSource {
  grossForAverage?: number
  workedHoursForAverage?: number
  workedDaysForAverage?: number
}

export interface SavedMonthRecord extends EmployeeMonth, SavedMonthAverageSource {
  employer?: EmployerProfile
  employee: EmployeeSettings
  snapshot?: SavedMonthSnapshot
}

export interface BuildEmployeeMonthRecordInput {
  employeeId: string
  month: string
  status: MonthStatus
  employee: EmployeeSettings
  employer?: EmployerProfile
  records: TimeRecord[]
  paySlipInputs: PaySlipInputs
  existing?: Partial<SavedMonthRecord> | null
  timeSummary?: TimeSummary
  payrollResult?: PayrollResult
  calculationSnapshot?: CalculationSnapshot
  timeSheetDocument?: TimeSheetStatementDocument | null
  payslipDocument?: IssuedPayslipDocument | null
  auditTrail?: WorkflowAuditEntry[]
  grossForAverage?: number
  workedHoursForAverage?: number
  workedDaysForAverage?: number
  snapshot?: SavedMonthSnapshot
  closedAt?: string
  approvedAt?: string
  issuedAt?: string
  invalidatedAt?: string
  invalidationReason?: string
}

export function buildEmployeeMonthRecord(input: BuildEmployeeMonthRecordInput): SavedMonthRecord {
  const nowIso = new Date().toISOString()
  const existing = input.existing || null

  return {
    employeeId: input.employeeId,
    month: input.month,
    status: input.status,
    employer: input.employer ?? existing?.employer,
    employee: input.employee,
    records: input.records,
    paySlipInputs: input.paySlipInputs,
    timeSummary: input.timeSummary ?? existing?.timeSummary,
    payrollResult: input.payrollResult ?? existing?.payrollResult,
    calculationSnapshot: input.calculationSnapshot ?? existing?.calculationSnapshot,
    timeSheetDocument: input.timeSheetDocument ?? existing?.timeSheetDocument ?? null,
    payslipDocument: input.payslipDocument ?? existing?.payslipDocument ?? null,
    auditTrail: input.auditTrail ?? existing?.auditTrail ?? [],
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
    closedAt: input.closedAt ?? existing?.closedAt,
    approvedAt: input.approvedAt ?? existing?.approvedAt,
    issuedAt: input.issuedAt ?? existing?.issuedAt,
    invalidatedAt: input.invalidatedAt ?? existing?.invalidatedAt,
    invalidationReason: input.invalidationReason ?? existing?.invalidationReason,
    grossForAverage: input.grossForAverage ?? existing?.grossForAverage,
    workedHoursForAverage: input.workedHoursForAverage ?? existing?.workedHoursForAverage,
    workedDaysForAverage: input.workedDaysForAverage ?? existing?.workedDaysForAverage,
    snapshot: input.snapshot ?? existing?.snapshot,
  }
}
