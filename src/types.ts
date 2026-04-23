export type EmploymentType = 'pracovni_pomer' | 'dpc' | 'dpp'
export const EmploymentTypeLabels: Record<EmploymentType, string> = {
  pracovni_pomer: 'Pracovní poměr',
  dpc: 'DPČ',
  dpp: 'DPP',
}
export type HolidayCompensationMode = 'time-off' | 'premium'
export type OvertimeCompensationMode = 'time-off' | 'premium'
export type RemunerationType = 'mzda' | 'plat'
export type ShiftType = 'ranní' | 'odpolední' | 'noční' | 'přesčas' | 'volno' | 'dovolená' | 'nemoc' | ''

export interface EmployeeSettings {
  name: string
  employmentType: EmploymentType
  remunerationType: RemunerationType
  employmentStartDate: string
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
