import type { EmployeeMonth, EmployeeSettings, EmployerProfile, MonthStatus } from '../../domain/shared/types'

export type { MonthStatus }

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
