import type {
  CalculationSnapshot,
  EmployeeMonth,
  EmployeeSettings,
  EmploymentContractDocument,
  EmployerProfile,
  IssuedPayslipDocument,
  MonthStatus,
  PaySlipInputs,
  PayrollResult,
  TimeRecord,
  TimeSheetStatementDocument,
  TimeSummary,
  WorkflowAuditEntry,
} from '../../domain/shared/types'
import type { QuarterlyPhvResponse } from '../../domain/payroll/phv'

export type { MonthStatus }
export type { QuarterlyPhvResponse }

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

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const raw = await response.text()
    let message = raw
    try {
      const parsed = raw ? JSON.parse(raw) as { error?: string } : null
      if (parsed?.error) {
        message = parsed.error
      }
    } catch {
      // Keep original plain-text body when response is not JSON.
    }
    throw new Error(message || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
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

export async function listEmployees(): Promise<EmployeeSettings[]> {
  const response = await fetch('/api/employees')
  return parseJsonResponse<EmployeeSettings[]>(response)
}

export async function createEmployee(data: Partial<EmployeeSettings>): Promise<EmployeeSettings> {
  const response = await fetch('/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseJsonResponse<EmployeeSettings>(response)
}

export async function loadCompanyProfile(): Promise<EmployerProfile> {
  const response = await fetch('/api/company')
  return parseJsonResponse<EmployerProfile>(response)
}

export async function saveCompanyProfile(data: EmployerProfile): Promise<EmployerProfile> {
  const response = await fetch('/api/company', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return parseJsonResponse<EmployerProfile>(response)
}

/**
 * Employment contract documents are persisted separately from general employee settings
 * so document issuance/refresh stays explicit and does not depend on the broader employee update payload.
 */
export async function saveEmployeeDocument(employeeId: string, document: EmploymentContractDocument): Promise<void> {
  const response = await fetch(`/api/employees/${employeeId}/document`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
}

export async function updateEmployee(employeeId: string, data: Partial<EmployeeSettings>): Promise<void> {
  const response = await fetch(`/api/employees/${employeeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
}

export async function loadEmployeeMonth(employeeId: string, month: string): Promise<SavedMonthRecord | null> {
  const response = await fetch(`/api/employees/${employeeId}/months/${month}`)
  if (response.status === 404) return null
  return parseJsonResponse<SavedMonthRecord>(response)
}

export async function saveEmployeeMonth(employeeId: string, month: string, data: SavedMonthRecord): Promise<void> {
  const response = await fetch(`/api/employees/${employeeId}/months/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
}

export async function listEmployeeMonths(employeeId: string): Promise<SavedMonthRecord[]> {
  const response = await fetch(`/api/employees/${employeeId}/months`)
  return parseJsonResponse<SavedMonthRecord[]>(response)
}

export async function fetchQuarterlyPhv(
  month: string,
  employeeId?: string | null,
  employee?: Partial<EmployeeSettings>,
): Promise<QuarterlyPhvResponse> {
  const query = new URLSearchParams()
  if (employeeId) query.set('employeeId', employeeId)
  const suffix = employeeId ? `/api/phv/${employeeId}/${month}` : `/api/phv/default/${month}`
  const response = await fetch(`${suffix}${query.size > 0 ? `?${query.toString()}` : ''}`, {
    method: employee ? 'POST' : 'GET',
    headers: employee ? { 'Content-Type': 'application/json' } : undefined,
    body: employee ? JSON.stringify({ employee }) : undefined,
  })
  return parseJsonResponse<QuarterlyPhvResponse>(response)
}
