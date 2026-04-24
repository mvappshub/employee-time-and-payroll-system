import fs from 'fs/promises'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { getEmploymentStartMonth, getPreviousQuarterMonths, resolveAverageEarnings, sumAverageQuarterTotals, type AverageEarningsEmployeeContext } from './src/phv'

const DATA_DIR = path.resolve(process.cwd(), 'month-data')
const MONTH_PATTERN = /^\d{4}-\d{2}$/

export interface PersistedMonthRecord {
  month: string
  employee?: Partial<AverageEarningsEmployeeContext>
  grossForAverage?: number
  workedHoursForAverage?: number
  workedDaysForAverage?: number
  snapshot?: {
    grossWage: number
    workedHours: number
    totalSaldo: number
    savedAt: string
  }
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
}

function monthFilePath(month: string): string {
  if (!MONTH_PATTERN.test(month)) {
    throw new Error(`Invalid month: ${month}`)
  }
  return path.join(DATA_DIR, `${month}.json`)
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : null
}

async function loadMonthRecord(month: string): Promise<PersistedMonthRecord | null> {
  try {
    const file = await fs.readFile(monthFilePath(month), 'utf8')
    return JSON.parse(file) as PersistedMonthRecord
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function loadAllMonthRecords(): Promise<PersistedMonthRecord[]> {
  await ensureDataDir()
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true })
  const records = await Promise.all(
    entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(async entry => {
        const file = await fs.readFile(path.join(DATA_DIR, entry.name), 'utf8')
        return JSON.parse(file) as PersistedMonthRecord
      }),
  )
  return records
}

function normalizeEmployeeContext(employee?: Partial<AverageEarningsEmployeeContext>): AverageEarningsEmployeeContext | null {
  if (!employee) return null

  return {
    employmentStartDate: typeof employee.employmentStartDate === 'string' && employee.employmentStartDate
      ? employee.employmentStartDate
      : DEFAULT_EMPLOYEE_CONTEXT.employmentStartDate,
    baseSalary: typeof employee.baseSalary === 'number'
      ? employee.baseSalary
      : DEFAULT_EMPLOYEE_CONTEXT.baseSalary,
    personalBonus: typeof employee.personalBonus === 'number'
      ? employee.personalBonus
      : DEFAULT_EMPLOYEE_CONTEXT.personalBonus,
    weeklyHours: typeof employee.weeklyHours === 'number'
      ? employee.weeklyHours
      : DEFAULT_EMPLOYEE_CONTEXT.weeklyHours,
    workDaysPerWeek: typeof employee.workDaysPerWeek === 'number'
      ? employee.workDaysPerWeek
      : DEFAULT_EMPLOYEE_CONTEXT.workDaysPerWeek,
    weekendWorking: typeof employee.weekendWorking === 'boolean'
      ? employee.weekendWorking
      : DEFAULT_EMPLOYEE_CONTEXT.weekendWorking,
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

async function handleMonthRecord(req: IncomingMessage, res: ServerResponse, month: string): Promise<void> {
  if (req.method === 'GET') {
    const record = await loadMonthRecord(month)
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
    await fs.writeFile(monthFilePath(month), JSON.stringify(body, null, 2), 'utf8')
    sendJson(res, 200, { ok: true })
    return
  }

  sendJson(res, 405, { error: 'method_not_allowed' })
}

async function handlePhv(res: ServerResponse, req: IncomingMessage, month: string): Promise<void> {
  const sourceMonths = getPreviousQuarterMonths(month)
  const allRecords = await loadAllMonthRecords()
  const employeeContextMonth = findLatestEmployeeContextMonth(allRecords, month)
  const employee = pickEmployeeContextForMonth(allRecords, month)
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
  const loaded = await Promise.all(sourceMonths.map(loadMonthRecord))
  const available = sourceMonths.flatMap((sourceMonth, index) => {
    const record = loaded[index]
    if (!record || sourceMonth < employmentStartMonth) return []
    return [{
      grossForAverage: record.grossForAverage || 0,
      workedHoursForAverage: record.workedHoursForAverage || 0,
      workedDaysForAverage: record.workedDaysForAverage || 0,
    }]
  })
  const missingMonths = effectiveSourceMonths.filter((sourceMonth, index) => {
    const actualIndex = sourceMonths.indexOf(sourceMonth)
    const record = loaded[actualIndex]
    return !record
  })
  const totals = sumAverageQuarterTotals(available)

  sendJson(res, 200, resolveAverageEarnings(
    month,
    employee,
    sourceMonths,
    totals,
    missingMonths.length > 0 ? missingMonths : [],
    employeeContextMonth,
  ))
}

export function monthDbApiPlugin() {
  return {
    name: 'month-db-api',
    configureServer(server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>) => void } }) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        const monthRecordMatch = url.match(/^\/api\/month-records\/(\d{4}-\d{2})$/)
        const phvMatch = url.match(/^\/api\/phv\/(\d{4}-\d{2})$/)

        try {
          if (monthRecordMatch) {
            await handleMonthRecord(req, res, monthRecordMatch[1])
            return
          }
          if (phvMatch && req.method === 'GET') {
            await handlePhv(res, req, phvMatch[1])
            return
          }
          next()
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : 'unknown_error' })
        }
      })
    },
    configurePreviewServer(server: { middlewares: { use: (handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>) => void } }) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        const monthRecordMatch = url.match(/^\/api\/month-records\/(\d{4}-\d{2})$/)
        const phvMatch = url.match(/^\/api\/phv\/(\d{4}-\d{2})$/)

        try {
          if (monthRecordMatch) {
            await handleMonthRecord(req, res, monthRecordMatch[1])
            return
          }
          if (phvMatch && req.method === 'GET') {
            await handlePhv(res, req, phvMatch[1])
            return
          }
          next()
        } catch (error) {
          sendJson(res, 500, { error: error instanceof Error ? error.message : 'unknown_error' })
        }
      })
    },
  }
}
