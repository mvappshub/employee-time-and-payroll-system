export type EmploymentType = 'pracovni_pomer'
export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  pracovni_pomer: 'Pracovní poměr',
}

export type EmploymentContractTemplate = 'full_2026' | 'minimum_2026'

export type ShiftOperationType = 'single' | 'double' | 'triple'
export const ShiftOperationTypeLabels: Record<ShiftOperationType, string> = {
  single: 'Jednosměnný provoz',
  double: 'Dvousměnný provoz',
  triple: 'Třísměnný provoz',
}
export const ShiftOperationDailyFund: Record<ShiftOperationType, number> = {
  single: 8,
  double: 7.47,
  triple: 7.5,
}

export function normalizeShiftOperationType(value: unknown): ShiftOperationType {
  return value === 'double' || value === 'triple' ? value : 'single'
}

export function getShiftOperationDailyFund(value: unknown, workload = 1): number {
  const safeWorkload = Number.isFinite(workload) && workload > 0 ? workload : 0
  return ShiftOperationDailyFund[normalizeShiftOperationType(value)] * safeWorkload
}

export function calculateShiftOperationWeeklyHours(value: unknown, workDaysPerWeek: number, workload = 1): number {
  const safeWorkDays = Number.isFinite(workDaysPerWeek) && workDaysPerWeek > 0 ? workDaysPerWeek : 0
  return Math.round(getShiftOperationDailyFund(value, workload) * safeWorkDays * 100) / 100
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
  legalName?: string
  ico: string
  seat: string
  registeredAddress?: string
  representativeName: string
  representativeRole: string
  wageDueText?: string
  wagePaymentTerm?: string
  wagePaymentPlace?: string
  wagePaymentMethod?: string
  workScheduleText?: string
  balancingPeriodText?: string
  overtimeScopeText?: string
  socialSecurityAuthority?: string
}

export type DocumentType = 'employment_contract' | 'section37_information' | 'handover_protocol' | 'time_sheet_statement' | 'issued_payslip'
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
  documentId?: string
  generatedAt?: string
  hash?: string
  templateVersion?: string
}

export interface EmploymentContractSnapshot {
  template: EmploymentContractTemplate
  employer: {
    legalName: string
    ico: string
    registeredAddress: string
    representativeName: string
    representativeRole: string
  }
  employee: {
    id: string
    name: string
    firstName: string
    lastName: string
    birthDate: string
    address: string
    personalNumberInternal?: string
  }
  contract: {
    jobType: string
    workplace: string
    startDate: string
    contractConclusionDate: string
    signaturePlace: string
    durationType: 'indefinite' | 'fixed_term'
    fixedTermEndDate: string | null
    weeklyHours: number
    isManager: boolean
    probationEnabled: boolean
    probationMonths: number | null
    grossMonthlyWage: number
    annualVacationWeeks: number
    employeeReceivedCopyAt?: string
  }
  text: string
  sections: Array<{ heading?: string; lines: string[] }>
}

export interface Section37Snapshot {
  employer: EmploymentContractSnapshot['employer'] & {
    wageDueText: string
    wagePaymentTerm: string
    wagePaymentPlace: string
    wagePaymentMethod: string
    workScheduleText: string
    balancingPeriodText: string
    overtimeScopeText: string
    socialSecurityAuthority: string
  }
  employee: EmploymentContractSnapshot['employee']
  contract: EmploymentContractSnapshot['contract']
  generatedAt: string
  handedOverAt?: string
  handoverMethod?: string
  text: string
  sections: Array<{ heading?: string; lines: string[] }>
}

export interface HandoverProtocolSnapshot {
  employee: EmploymentContractSnapshot['employee']
  generatedAt: string
  handedOverAt?: string
  handoverMethod?: string
  hasBopDocuments?: boolean
  text: string
  sections: Array<{ heading?: string; lines: string[] }>
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
    breakStart?: string
    breakEnd?: string
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
    employmentStartDate?: string
    contractWorkplace?: string
    weeklyHours?: number
    workload?: number
    baseSalary: number
    personalBonus: number
    nightSurcharge: number
    weekendSurcharge: number
    sickCompensation: number
    overtimeSurcharge: number
    taxDeclarationSigned?: boolean
    taxpayerCreditApplied?: boolean
    healthInsuranceCompany?: string
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

export interface Section37Document extends DocumentMetadata {
  documentType: 'section37_information'
  snapshot: Section37Snapshot
}

export interface HandoverProtocolDocument extends DocumentMetadata {
  documentType: 'handover_protocol'
  snapshot: HandoverProtocolSnapshot
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
  firstName?: string
  lastName?: string
  birthDate?: string
  address?: string
  personalNumberInternal?: string
  employeeNumber: string
  permanentAddress: string
  status: EmployeeLifecycleStatus
  employmentType: EmploymentType
  employmentStartDate: string
  employmentEndDate?: string
  contractJobTitle: string
  contractWorkplace: string
  contractWorkSchedule: string
  contractConclusionDate?: string
  signaturePlace?: string
  durationType?: 'indefinite' | 'fixed_term'
  isManager?: boolean
  probationEnabled?: boolean
  probationMonths?: number | null
  fixedTermEndDate?: string | null
  employmentContractTemplate?: EmploymentContractTemplate
  grossMonthlyWage?: number
  annualVacationWeeks?: number
  employeeReceivedCopyAt?: string
  workload: number
  shiftOperation: ShiftOperationType
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
  breakStart?: string
  breakEnd?: string
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
