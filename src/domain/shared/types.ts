export type EmploymentType = 'pracovni_pomer'
export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  pracovni_pomer: 'Pracovní poměr',
}

export type EmployeeLifecycleStatus = 'active' | 'archived'
export type HolidayCompensationMode = 'time-off' | 'premium'
export type OvertimeCompensationMode = 'time-off' | 'premium'
export type ShiftType = 'ranní' | 'odpolední' | 'noční' | 'přesčas' | 'volno' | 'dovolená' | 'nemoc' | ''

export type MonthStatus =
  | 'empty'
  | 'draft'
  | 'time_saved'
  | 'time_closed'
  | 'payroll_calculated'
  | 'payroll_approved'
  | 'payslip_issued'

export interface EmployerProfile {
  name: string
  ico: string
  seat: string
  representativeName: string
  representativeRole: string
}

export type DocumentType = 'employment_contract' | 'time_sheet_statement' | 'issued_payslip'
export type DocumentLifecycleStatus = 'draft' | 'ready' | 'issued' | 'invalidated'

export interface DocumentMetadata {
  documentType: DocumentType
  lifecycleStatus: DocumentLifecycleStatus
  issuedAt?: string
  issuedBy?: string
  updatedAt: string
  sourceMonth?: string
  referenceId: string
  version: number
  snapshotOrigin: 'employee' | 'month'
  invalidatedAt?: string
  invalidationReason?: string
}

export interface EmploymentContractSnapshot {
  employer: EmployerProfile
  employee: {
    id: string
    name: string
    employeeNumber: string
    permanentAddress: string
    employmentStartDate: string
    employmentEndDate?: string
    contractJobTitle: string
    contractWorkplace: string
    contractWorkSchedule: string
    probationMonths?: number
    fixedTermEndDate?: string
    baseSalary: number
    workload: number
    weeklyHours: number
  }
}

export interface TimeSheetStatementSnapshot {
  employer: EmployerProfile
  employee: {
    id: string
    name: string
    employeeNumber: string
    permanentAddress: string
    contractJobTitle: string
  }
  month: string
  periodLabel: string
  rows: Array<{
    date: string
    shift: ShiftType
    arrival: string
    departure: string
    workedHours: number
    overtimeHours: number
    nightHours: number
    absenceLabel: string
  }>
  totals: {
    workedHours: number
    overtimeHours: number
    nightHours: number
    vacationHours: number
    sickHours: number
    totalSaldo: number
  }
}

export interface IssuedPayslipSnapshot {
  employer: EmployerProfile
  employee: {
    id: string
    name: string
    employeeNumber: string
    employmentType: EmploymentType
    baseSalary: number
    personalBonus: number
    nightSurcharge: number
    weekendSurcharge: number
    sickCompensation: number
    overtimeSurcharge: number
    vacationEntitlementHours: number
    vacationUsedHours: number
    vacationRemainingHours: number
  }
  month: string
  calculationSnapshot?: CalculationSnapshot
  payrollResult: PayrollResult
  timeSummary?: TimeSummary
  paySlipInputs: PaySlipInputs
  documentSummary: {
    workHoursWH: number
    workDaysWH: number
    totalNight: number
    totalWeekend: number
    totalHolidayTotal: number
    totalOvertime: number
    totalVacation: number
    totalSick: number
  }
}

export interface EmploymentContractDocument extends DocumentMetadata {
  documentType: 'employment_contract'
  snapshot: EmploymentContractSnapshot
}

export interface TimeSheetStatementDocument extends DocumentMetadata {
  documentType: 'time_sheet_statement'
  snapshot: TimeSheetStatementSnapshot
}

export interface IssuedPayslipDocument extends DocumentMetadata {
  documentType: 'issued_payslip'
  snapshot: IssuedPayslipSnapshot
}

export interface EmployeeSettings {
  id: string
  name: string
  employeeNumber: string
  permanentAddress: string
  status: EmployeeLifecycleStatus
  employmentType: EmploymentType
  employmentStartDate: string
  employmentEndDate?: string
  contractJobTitle: string
  contractWorkplace: string
  contractWorkSchedule: string
  probationMonths?: number
  fixedTermEndDate?: string
  workload: number
  weeklyHours: number
  workDaysPerWeek: number
  weekendWorking: boolean
  shiftStart: string
  shiftEnd: string
  standardBreak: number
  nightWorkAllowed: boolean
  nightFrom: string
  nightTo: string
  overtimeAllowed: boolean
  baseSalary: number
  personalBonus: number
  nightSurcharge: number
  weekendSurcharge: number
  holidaySurcharge: number
  overtimeSurcharge: number
  sickCompensation: number
  holidayCompensationMode: HolidayCompensationMode
  overtimeCompensationMode: OvertimeCompensationMode
  appliesHealthMinimumBase: boolean
  healthMinimumBaseExceptionReason?: string
  taxDeclarationSigned: boolean
  taxpayerCreditApplied: boolean
  vacationEntitlementHours: number
  vacationUsedHours: number
  vacationRemainingHours: number
  employmentContractDocument?: EmploymentContractDocument | null
}

export interface TimeRecord {
  date: string
  shift: ShiftType
  arrival: string
  departure: string
}

export interface Holiday {
  date: string
  name: string
}

export interface PaySlipInputs {
  manualReward: number
  includeManualRewardInAverage: boolean
  unworked: number
  sickCarryoverDays: number
  holidayCompensationMode: HolidayCompensationMode
}

export interface TimeSummary {
  monthlyFundHours: number
  workedHours: number
  workedDays: number
  vacationHours: number
  sickHours: number
  totalSaldo: number
}

export interface WorkflowAuditEntry {
  at: string
  action: string
  note?: string
}

export interface CalculationSnapshot {
  averageEarningsSource: 'actual' | 'probable' | 'unavailable'
  averageHourlyEarnings: number | null
  legalConstants: Record<string, number>
  calculatedAt: string
}

export type PayrollResult = Record<string, unknown>

export interface EmployeeMonth {
  employeeId: string
  month: string
  status: MonthStatus
  records: TimeRecord[]
  paySlipInputs: PaySlipInputs
  timeSummary?: TimeSummary
  payrollResult?: PayrollResult
  calculationSnapshot?: CalculationSnapshot
  timeSheetDocument?: TimeSheetStatementDocument | null
  payslipDocument?: IssuedPayslipDocument | null
  auditTrail?: WorkflowAuditEntry[]
  createdAt: string
  updatedAt: string
  closedAt?: string
  approvedAt?: string
  issuedAt?: string
  invalidatedAt?: string
  invalidationReason?: string
}
