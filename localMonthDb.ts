import fs from 'fs/promises'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

const DATA_DIR = path.resolve(process.cwd(), 'month-data')
const MONTH_PATTERN = /^\d{4}-\d{2}$/

interface SavedMonthRecord {
  month: string
  snapshot?: {
    grossWage: number
    workedHours: number
    totalSaldo: number
    savedAt: string
  }
}

function getPreviousQuarterMonths(targetMonth: string): string[] {
  const [year, month] = targetMonth.split('-').map(Number)

  if (month >= 1 && month <= 3) return [`${year - 1}-10`, `${year - 1}-11`, `${year - 1}-12`]
  if (month >= 4 && month <= 6) return [`${year}-01`, `${year}-02`, `${year}-03`]
  if (month >= 7 && month <= 9) return [`${year}-04`, `${year}-05`, `${year}-06`]
  return [`${year}-07`, `${year}-08`, `${year}-09`]
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

async function handlePhv(res: ServerResponse, month: string): Promise<void> {
  const sourceMonths = getPreviousQuarterMonths(month)
  const loaded = await Promise.all(sourceMonths.map(loadMonthRecord))
  const available = loaded.filter((record): record is SavedMonthRecord => !!record && !!record.snapshot)
  const totalGrossWage = available.reduce((sum, record) => sum + (record.snapshot?.grossWage || 0), 0)
  const totalWorkedHours = available.reduce((sum, record) => sum + (record.snapshot?.workedHours || 0), 0)

  sendJson(res, 200, {
    month,
    sourceMonths,
    missingMonths: sourceMonths.filter((sourceMonth, index) => !loaded[index]?.snapshot),
    totalGrossWage,
    totalWorkedHours,
    phv: totalWorkedHours > 0 ? totalGrossWage / totalWorkedHours : null,
  })
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
            await handlePhv(res, phvMatch[1])
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
            await handlePhv(res, phvMatch[1])
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
