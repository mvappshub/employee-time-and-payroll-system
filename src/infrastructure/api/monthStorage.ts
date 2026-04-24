import type { EmployerProfile, EmployeeSettings, PaySlipInputs, TimeRecord } from '../../domain/shared/types'

export interface SavedMonthSnapshot {
  grossWage: number
  workedHours: number
  totalSaldo: number
  savedAt: string
}

export interface SavedMonthAverageSource {
  grossForAverage: number
  workedHoursForAverage: number
  workedDaysForAverage: number
}

export interface SavedMonthRecord {
  month: string
  employer?: EmployerProfile
  employee: EmployeeSettings
  records: TimeRecord[]
  paySlipInputs: PaySlipInputs
  grossForAverage: number
  workedHoursForAverage: number
  workedDaysForAverage: number
  snapshot?: SavedMonthSnapshot
}

export interface QuarterlyPhvResponse {
  month: string
  sourceType: 'actual' | 'probable' | 'unavailable'
  averageHourlyEarnings: number | null
  actualPhv: number | null
  probableHourlyEarnings: number | null
  employeeContextMonth: string | null
  periodStart: string
  periodEnd: string
  sourceMonths: string[]
  missingMonths: string[]
  grossForAverage: number
  workedHoursForAverage: number
  workedDaysForAverage: number
  reason: string | null
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function loadSavedMonth(month: string): Promise<SavedMonthRecord | null> {
  const response = await fetch(`/api/month-records/${month}`)
  if (response.status === 404) return null
  return parseJsonResponse<SavedMonthRecord>(response)
}

export async function saveMonthRecord(record: SavedMonthRecord): Promise<void> {
  const response = await fetch(`/api/month-records/${record.month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
}

export async function fetchQuarterlyPhv(month: string): Promise<QuarterlyPhvResponse> {
  const response = await fetch(`/api/phv/${month}`)
  return parseJsonResponse<QuarterlyPhvResponse>(response)
}
