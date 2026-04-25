export type EmploymentType = 'pracovni_pomer'
export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  pracovni_pomer: 'Pracovní poměr',
}

export type EmployeeLifecycleStatus = 'active' | 'archived'
export type HolidayCompensationMode = 'time-off' | 'premium'
export type OvertimeCompensationMode = 'time-off' | 'premium'
export type RemunerationType = 'mzda' | 'plat'
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
}

export interface EmployeeSettings {
  id: string
  name: string
  employeeNumber: string
  status: EmployeeLifecycleStatus
  employmentType: EmploymentType
  remunerationType: RemunerationType
  employmentStartDate: string
  employmentEndDate?: string
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

export interface PayrollResult {
  [key: string]: string | number | boolean | null
}

export interface EmployeeMonth {
  employeeId: string
  month: string
  status: MonthStatus
  records: TimeRecord[]
  paySlipInputs: PaySlipInputs
  timeSummary?: TimeSummary
  payrollResult?: PayrollResult
  calculationSnapshot?: CalculationSnapshot
  payslipDocument?: {
    issuedAt: string
    month: string
  } | null
  auditTrail?: WorkflowAuditEntry[]
  createdAt: string
  updatedAt: string
  closedAt?: string
  approvedAt?: string
  issuedAt?: string
  invalidatedAt?: string
  invalidationReason?: string
}
