import type {
  EmployeeSettings,
  EmploymentContractDocument,
  EmployerProfile,
  MonthStatus,
} from '../../domain/shared/types'
import type { QuarterlyPhvResponse } from '../../domain/payroll/phv'
import type { SavedMonthRecord } from '../../domain/month/employeeMonth'

export type { MonthStatus }
export type { QuarterlyPhvResponse }
export type { SavedMonthRecord } from '../../domain/month/employeeMonth'

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
