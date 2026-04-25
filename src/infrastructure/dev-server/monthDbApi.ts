import fs from 'fs/promises'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import {
  getEmploymentStartMonth,
  getPreviousQuarterMonths,
  resolveAverageEarnings,
  sumAverageQuarterTotals,
  type AverageEarningsEmployeeContext,
} from '../../domain/payroll/phv'
import type { EmployeeSettings, EmployerProfile } from '../../domain/shared/types'
import type { SavedMonthRecord } from '../api/monthStorage'

const DATA_DIR = path.resolve(process.cwd(), 'month-data')
const EMPLOYEES_DIR = path.join(DATA_DIR, 'employees')
const EMPLOYEES_FILE = path.join(DATA_DIR, 'employees.json')
const COMPANY_FILE = path.join(DATA_DIR, 'company.json')
const MONTH_PATTERN = /^\d{4}-\d{2}$/

export type PersistedMonthRecord = Omit<SavedMonthRecord, 'employee'> & {
  employer?: EmployerProfile
  employee: Partial<AverageEarningsEmployeeContext> & Partial<EmployeeSettings>
}

const DEFAULT_EMPLOYEE_CONTEXT: AverageEarningsEmployeeContext = {
  employmentStartDate: '2026-01-01',
  baseSalary: 30000,
  personalBonus: 0.25,
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(EMPLOYEES_DIR, { recursive: true })
}

function employeeDirPath(employeeId: string): string {
  return path.join(EMPLOYEES_DIR, employeeId)
}

function monthFilePath(employeeId: string, month: string): string {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`Invalid month: ${month}`)
  }
  return path.join(employeeDirPath(employeeId), `${month}.json`)
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : null
}

async function loadEmployees(): Promise<EmployeeSettings[]> {
  await ensureDataDir()
  try {
    const file = await fs.readFile(EMPLOYEES_FILE, 'utf8')
    return JSON.parse(file) as EmployeeSettings[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function loadCompanyProfile(): Promise<EmployerProfile> {
  await ensureDataDir()
  try {
    const file = await fs.readFile(COMPANY_FILE, 'utf8')
    return JSON.parse(file) as EmployerProfile
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        name: '',
        ico: '',
        seat: '',
        representativeName: '',
        representativeRole: '',
      }
    }
    throw error
  }
}

async function saveCompanyProfile(profile: EmployerProfile): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(COMPANY_FILE, JSON.stringify(profile, null, 2), 'utf8')
}

async function saveEmployees(employees: EmployeeSettings[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(EMPLOYEES_FILE, JSON.stringify(employees, null, 2), 'utf8')
}

async function loadMonthRecord(employeeId: string, month: string): Promise<PersistedMonthRecord | null> {
  try {
    const file = await fs.readFile(monthFilePath(employeeId, month), 'utf8')
    return JSON.parse(file) as PersistedMonthRecord
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function listMonthRecords(employeeId: string): Promise<PersistedMonthRecord[]> {
  await ensureDataDir()
  const dir = employeeDirPath(employeeId)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const months = await Promise.all(
      entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(async entry => {
          const file = await fs.readFile(path.join(dir, entry.name), 'utf8')
          return JSON.parse(file) as PersistedMonthRecord
        }),
    )
    return months.sort((a, b) => a.month.localeCompare(b.month))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

function normalizeEmployeeContext(employee?: Partial<AverageEarningsEmployeeContext>): AverageEarningsEmployeeContext | null {
  if (!employee) return null
  return {
    employmentStartDate: typeof employee.employmentStartDate === 'string' && employee.employmentStartDate
      ? employee.employmentStartDate
      : DEFAULT_EMPLOYEE_CONTEXT.employmentStartDate,
    baseSalary: typeof employee.baseSalary === 'number' ? employee.baseSalary : DEFAULT_EMPLOYEE_CONTEXT.baseSalary,
    personalBonus: typeof employee.personalBonus === 'number' ? employee.personalBonus : DEFAULT_EMPLOYEE_CONTEXT.personalBonus,
    weeklyHours: typeof employee.weeklyHours === 'number' ? employee.weeklyHours : DEFAULT_EMPLOYEE_CONTEXT.weeklyHours,
    workDaysPerWeek: typeof employee.workDaysPerWeek === 'number' ? employee.workDaysPerWeek : DEFAULT_EMPLOYEE_CONTEXT.workDaysPerWeek,
    weekendWorking: typeof employee.weekendWorking === 'boolean' ? employee.weekendWorking : DEFAULT_EMPLOYEE_CONTEXT.weekendWorking,
  }
}

export function findLatestEmployeeContextMonth(records: PersistedMonthRecord[], targetMonth: string): string | null {
  return [...records]
    .filter(record => record.month <= targetMonth && normalizeEmployeeContext(record.employee) !== null)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1)?.month ?? null
}

export function pickEmployeeContextForMonth(records: PersistedMonthRecord[], targetMonth: string): AverageEarningsEmployeeContext | null {
  const month = findLatestEmployeeContextMonth(records, targetMonth)
  if (!month) return null
  const record = records.find(item => item.month === month)
  return record ? normalizeEmployeeContext(record.employee) : null
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function hasValidAverageSource(record: PersistedMonthRecord | null): record is PersistedMonthRecord & {
  grossForAverage: number
  workedHoursForAverage: number
  workedDaysForAverage: number
} {
  return !!record &&
    typeof record.grossForAverage === 'number' &&
    typeof record.workedHoursForAverage === 'number' &&
    typeof record.workedDaysForAverage === 'number'
}

async function handleEmployees(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') {
    sendJson(res, 200, await loadEmployees())
    return
  }

  if (req.method === 'POST') {
    const body = await readJsonBody(req) as Partial<EmployeeSettings> | null
    const employees = await loadEmployees()
    if (!body?.name || !body.employmentStartDate || typeof body.baseSalary !== 'number' || body.baseSalary <= 0) {
      sendJson(res, 400, { error: 'invalid_employee_payload' })
      return
    }
    const id = body.id || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `emp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
    if (employees.some(employee => employee.id === id)) {
      sendJson(res, 409, { error: 'duplicate_employee_id' })
      return
    }
    const employee = { ...body, id } as EmployeeSettings
    employees.push(employee)
    await saveEmployees(employees)
    sendJson(res, 201, employee)
    return
  }

  sendJson(res, 405, { error: 'method_not_allowed' })
}

async function handleCompany(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === 'GET') {
    sendJson(res, 200, await loadCompanyProfile())
    return
  }

  if (req.method === 'PUT') {
    const body = await readJsonBody(req) as Partial<EmployerProfile> | null
    const profile: EmployerProfile = {
      name: body?.name || '',
      ico: body?.ico || '',
      seat: body?.seat || '',
      representativeName: body?.representativeName || '',
      representativeRole: body?.representativeRole || '',
    }
    await saveCompanyProfile(profile)
    sendJson(res, 200, profile)
    return
  }

  sendJson(res, 405, { error: 'method_not_allowed' })
}

async function handleEmployeeUpdate(req: IncomingMessage, res: ServerResponse, employeeId: string): Promise<void> {
  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: 'method_not_allowed' })
    return
  }
  const body = await readJsonBody(req) as Partial<EmployeeSettings> | null
  const employees = await loadEmployees()
  if (!employees.some(employee => employee.id === employeeId)) {
    sendJson(res, 404, { error: 'employee_not_found' })
    return
  }
  const updated = employees.map(employee => employee.id === employeeId ? { ...employee, ...body, id: employeeId } : employee)
  await saveEmployees(updated)
  sendJson(res, 200, { ok: true })
}

async function handleEmployeeDocument(req: IncomingMessage, res: ServerResponse, employeeId: string): Promise<void> {
  if (req.method !== 'PUT') {
    sendJson(res, 405, { error: 'method_not_allowed' })
    return
  }

  const body = await readJsonBody(req) as EmployeeSettings['employmentContractDocument'] | null
  const employees = await loadEmployees()
  const employee = employees.find(item => item.id === employeeId)
  if (!employee) {
    sendJson(res, 404, { error: 'employee_not_found' })
    return
  }

  const updated = employees.map(item => item.id === employeeId ? { ...item, employmentContractDocument: body } : item)
  await saveEmployees(updated)
  sendJson(res, 200, { ok: true })
}

async function handleEmployeeMonths(req: IncomingMessage, res: ServerResponse, employeeId: string): Promise<void> {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed' })
    return
  }
  sendJson(res, 200, await listMonthRecords(employeeId))
}

async function handleEmployeeMonth(req: IncomingMessage, res: ServerResponse, employeeId: string, month: string): Promise<void> {
  const employees = await loadEmployees()
  if (!employees.some(employee => employee.id === employeeId)) {
    sendJson(res, 404, { error: 'employee_not_found' })
    return
  }

  if (req.method === 'GET') {
    const record = await loadMonthRecord(employeeId, month)
    if (!record) {
      sendJson(res, 404, { error: 'not_found' })
      return
    }
    sendJson(res, 200, record)
    return
  }

  if (req.method === 'PUT') {
    const body = await readJsonBody(req)
    await ensureDataDir()
    await fs.mkdir(employeeDirPath(employeeId), { recursive: true })
    await fs.writeFile(monthFilePath(employeeId, month), JSON.stringify(body, null, 2), 'utf8')
    sendJson(res, 200, { ok: true })
    return
  }

  sendJson(res, 405, { error: 'method_not_allowed' })
}

async function handlePhv(req: IncomingMessage, res: ServerResponse, employeeId: string, month: string): Promise<void> {
  const sourceMonths = getPreviousQuarterMonths(month)
  const allRecords = await listMonthRecords(employeeId)
  const fallbackBody = req.method === 'POST' ? await readJsonBody(req) as { employee?: Partial<EmployeeSettings> } | null : null
  const fallbackEmployeeContext = normalizeEmployeeContext(fallbackBody?.employee)
  const employeeContextMonth = findLatestEmployeeContextMonth(allRecords, month)
  const employee = pickEmployeeContextForMonth(allRecords, month) || fallbackEmployeeContext

  if (!employee) {
    sendJson(res, 200, resolveAverageEarnings(
      month,
      null,
      sourceMonths,
      { grossForAverage: 0, workedHoursForAverage: 0, workedDaysForAverage: 0 },
      sourceMonths,
      null,
    ))
    return
  }

  const employmentStartMonth = getEmploymentStartMonth(employee.employmentStartDate)
  const effectiveSourceMonths = sourceMonths.filter(sourceMonth => sourceMonth >= employmentStartMonth)
  const loaded = await Promise.all(sourceMonths.map(sourceMonth => loadMonthRecord(employeeId, sourceMonth)))
  const available = sourceMonths.flatMap((sourceMonth, index) => {
    const record = loaded[index]
    if (sourceMonth < employmentStartMonth || !hasValidAverageSource(record)) return []
    return [{
      grossForAverage: record.grossForAverage,
      workedHoursForAverage: record.workedHoursForAverage,
      workedDaysForAverage: record.workedDaysForAverage,
    }]
  })
  const missingMonths = effectiveSourceMonths.filter(sourceMonth => {
    const index = sourceMonths.indexOf(sourceMonth)
    return !hasValidAverageSource(loaded[index])
  })

  sendJson(res, 200, resolveAverageEarnings(
    month,
    employee,
    sourceMonths,
    sumAverageQuarterTotals(available),
    missingMonths,
    employeeContextMonth,
  ))
}

function installMiddleware(server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>) => void } }) {
  server.middlewares.use(async (req, res, next) => {
    const url = req.url || ''
    const companyMatch = url.match(/^\/api\/company$/)
    const employeesMatch = url.match(/^\/api\/employees$/)
    const employeeUpdateMatch = url.match(/^\/api\/employees\/([^/]+)$/)
    const employeeDocumentMatch = url.match(/^\/api\/employees\/([^/]+)\/document$/)
    const employeeMonthsMatch = url.match(/^\/api\/employees\/([^/]+)\/months$/)
    const employeeMonthMatch = url.match(/^\/api\/employees\/([^/]+)\/months\/(\d{4}-\d{2})$/)
    const phvMatch = url.match(/^\/api\/phv\/([^/]+)\/(\d{4}-\d{2})(?:\?.*)?$/)

    try {
      if (companyMatch) {
        await handleCompany(req, res)
        return
      }
      if (employeesMatch) {
        await handleEmployees(req, res)
        return
      }
      if (employeeDocumentMatch) {
        await handleEmployeeDocument(req, res, employeeDocumentMatch[1])
        return
      }
      if (employeeUpdateMatch) {
        await handleEmployeeUpdate(req, res, employeeUpdateMatch[1])
        return
      }
      if (employeeMonthsMatch) {
        await handleEmployeeMonths(req, res, employeeMonthsMatch[1])
        return
      }
      if (employeeMonthMatch) {
        await handleEmployeeMonth(req, res, employeeMonthMatch[1], employeeMonthMatch[2])
        return
      }
      if (phvMatch && (req.method === 'GET' || req.method === 'POST')) {
        await handlePhv(req, res, phvMatch[1], phvMatch[2])
        return
      }
      next()
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'unknown_error' })
    }
  })
}

export function monthDbApiPlugin() {
  return {
    name: 'month-db-api',
    configureServer(server: Parameters<typeof installMiddleware>[0]) {
      installMiddleware(server)
    },
    configurePreviewServer(server: Parameters<typeof installMiddleware>[0]) {
      installMiddleware(server)
    },
  }
}
