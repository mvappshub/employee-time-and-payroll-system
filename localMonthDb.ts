import fs from 'fs/promises'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { getEmploymentStartMonth, getPreviousQuarterMonths, resolveAverageEarnings, sumAverageQuarterTotals, type AverageEarningsEmployeeContext } from './src/phv'

const DATA_DIR = path.resolve(process.cwd(), 'month-data')
const MONTH_PATTERN = /^\d{4}-\d{2}$/

interface SavedMonthRecord {
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

async function loadMonthRecord(month: string): Promise<SavedMonthRecord | null> {
  try {
    const file = await fs.readFile(monthFilePath(month), 'utf8')
    return JSON.parse(file) as SavedMonthRecord
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function loadAllMonthRecords(): Promise<SavedMonthRecord[]> {
  await ensureDataDir()
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true })
  const records = await Promise.all(
    entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(async entry => {
        const file = await fs.readFile(path.join(DATA_DIR, entry.name), 'utf8')
        return JSON.parse(file) as SavedMonthRecord
      }),
  )
  return records
}

function employeeContextFromQuery(url: URL): Partial<AverageEarningsEmployeeContext> {
  const parseNumber = (name: string): number | undefined => {
    const raw = url.searchParams.get(name)
    if (raw === null || raw === '') return undefined
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  const parseBoolean = (name: string): boolean | undefined => {
    const raw = url.searchParams.get(name)
    if (raw === null || raw === '') return undefined
    return raw === 'true'
  }

  return {
    employmentStartDate: url.searchParams.get('employmentStartDate') || undefined,
    baseSalary: parseNumber('baseSalary'),
    personalBonus: parseNumber('personalBonus'),
    weeklyHours: parseNumber('weeklyHours'),
    workDaysPerWeek: parseNumber('workDaysPerWeek'),
    weekendWorking: parseBoolean('weekendWorking'),
  }
}

function resolveEmployeeContext(records: SavedMonthRecord[], queryContext: Partial<AverageEarningsEmployeeContext>): AverageEarningsEmployeeContext {
  const latestEmployee = [...records]
    .filter(record => record.employee)
    .sort((a, b) => a.month.localeCompare(b.month))
    .at(-1)?.employee

  return {
    employmentStartDate: queryContext.employmentStartDate || latestEmployee?.employmentStartDate || '2026-01-01',
    baseSalary: queryContext.baseSalary ?? latestEmployee?.baseSalary ?? 0,
    personalBonus: queryContext.personalBonus ?? latestEmployee?.personalBonus ?? 0,
    weeklyHours: queryContext.weeklyHours ?? latestEmployee?.weeklyHours ?? 40,
    workDaysPerWeek: queryContext.workDaysPerWeek ?? latestEmployee?.workDaysPerWeek ?? 5,
    weekendWorking: queryContext.weekendWorking ?? latestEmployee?.weekendWorking ?? false,
  }
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
  const url = new URL(req.url || '', 'http://localhost')
  const employee = resolveEmployeeContext(allRecords, employeeContextFromQuery(url))
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

  sendJson(res, 200, resolveAverageEarnings(month, employee, sourceMonths, totals, missingMonths.length > 0 ? missingMonths : []))
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
