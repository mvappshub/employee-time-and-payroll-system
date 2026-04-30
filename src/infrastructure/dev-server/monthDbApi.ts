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
import {
  calculateShiftOperationWeeklyHours,
  normalizeShiftOperationType,
  type EmployeeSettings,
  type EmployerProfile,
  type IssuedPayslipDocument,
  type PaySlipInputs,
  type PayrollResult,
  type TimeSummary,
} from '../../domain/shared/types'
import type { SavedMonthRecord } from '../../domain/month/employeeMonth'

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
  workload: 1,
  shiftOperation: 'single',
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
}

function repairEmployerProfile(profile?: EmployerProfile): EmployerProfile {
  const legalName = profile?.legalName || profile?.name || ''
  const registeredAddress = profile?.registeredAddress || profile?.seat || ''
  return {
    name: profile?.name || legalName,
    legalName,
    ico: profile?.ico || '',
    seat: profile?.seat || registeredAddress,
    registeredAddress,
    representativeName: profile?.representativeName || '',
    representativeRole: profile?.representativeRole || '',
    wageDueText: profile?.wageDueText || '',
    wagePaymentTerm: profile?.wagePaymentTerm || '',
    wagePaymentPlace: profile?.wagePaymentPlace || '',
    wagePaymentMethod: profile?.wagePaymentMethod || '',
    workScheduleText: profile?.workScheduleText || '',
    balancingPeriodText: profile?.balancingPeriodText || '',
    overtimeScopeText: profile?.overtimeScopeText || '',
    socialSecurityAuthority: profile?.socialSecurityAuthority || '',
  }
}

function repairEmployeeSettings(employee?: Partial<EmployeeSettings>): EmployeeSettings {
  const workload = typeof employee?.workload === 'number' ? employee.workload : 1
  const shiftOperation = normalizeShiftOperationType(employee?.shiftOperation)
  const workDaysPerWeek = typeof employee?.workDaysPerWeek === 'number' ? employee.workDaysPerWeek : 5
  const weeklyHours = calculateShiftOperationWeeklyHours(shiftOperation, workDaysPerWeek, workload)
  const nameParts = (employee?.name || '').trim().split(/\s+/).filter(Boolean)
  const firstName = employee?.firstName || (nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || '')
  const lastName = employee?.lastName || (nameParts.length > 1 ? nameParts.at(-1) || '' : '')
  const name = employee?.name || `${firstName} ${lastName}`.trim()
  const address = employee?.address || employee?.permanentAddress || ''
  const baseSalary = employee?.baseSalary || 0
  const durationType = employee?.durationType || (employee?.fixedTermEndDate ? 'fixed_term' : 'indefinite')
  return {
    id: employee?.id || '',
    name,
    firstName,
    lastName,
    birthDate: employee?.birthDate || '',
    address,
    personalNumberInternal: employee?.personalNumberInternal || employee?.employeeNumber || '',
    employeeNumber: employee?.employeeNumber || '',
    permanentAddress: employee?.permanentAddress || address,
    status: employee?.status || 'active',
    employmentType: employee?.employmentType || 'pracovni_pomer',
    employmentStartDate: employee?.employmentStartDate || '2026-01-01',
    employmentEndDate: employee?.employmentEndDate || '',
    contractJobTitle: employee?.contractJobTitle || '',
    contractWorkplace: employee?.contractWorkplace || '',
    contractWorkSchedule: employee?.contractWorkSchedule || '',
    contractConclusionDate: employee?.contractConclusionDate || employee?.employmentStartDate || '2026-01-01',
    signaturePlace: employee?.signaturePlace || '',
    durationType,
    isManager: Boolean(employee?.isManager),
    probationEnabled: Boolean(employee?.probationEnabled),
    probationMonths: employee?.probationEnabled ? employee?.probationMonths || 3 : null,
    fixedTermEndDate: durationType === 'fixed_term' ? employee?.fixedTermEndDate || null : null,
    grossMonthlyWage: typeof employee?.grossMonthlyWage === 'number' ? employee.grossMonthlyWage : baseSalary,
    annualVacationWeeks: typeof employee?.annualVacationWeeks === 'number'
      ? employee.annualVacationWeeks
      : employee?.vacationEntitlementHours && weeklyHours > 0
        ? Math.round((employee.vacationEntitlementHours / weeklyHours) * 100) / 100
        : 4,
    employeeReceivedCopyAt: employee?.employeeReceivedCopyAt || '',
    workload,
    shiftOperation,
    weeklyHours,
    workDaysPerWeek,
    weekendWorking: employee?.weekendWorking || false,
    shiftStart: employee?.shiftStart || '06:00',
    shiftEnd: employee?.shiftEnd || '14:30',
    standardBreak: employee?.standardBreak || 0.5,
    nightWorkAllowed: employee?.nightWorkAllowed || false,
    nightFrom: employee?.nightFrom || '22:00',
    nightTo: employee?.nightTo || '06:00',
    overtimeAllowed: employee?.overtimeAllowed || false,
    baseSalary,
    personalBonus: employee?.personalBonus || 0,
    nightSurcharge: employee?.nightSurcharge || 0,
    weekendSurcharge: employee?.weekendSurcharge || 0,
    holidaySurcharge: employee?.holidaySurcharge || 0,
    overtimeSurcharge: employee?.overtimeSurcharge || 0,
    sickCompensation: employee?.sickCompensation || 0,
    holidayCompensationMode: employee?.holidayCompensationMode || 'time-off',
    overtimeCompensationMode: employee?.overtimeCompensationMode || 'premium',
    appliesHealthMinimumBase: employee?.appliesHealthMinimumBase ?? true,
    healthMinimumBaseExceptionReason: employee?.healthMinimumBaseExceptionReason || '',
    taxDeclarationSigned: employee?.taxDeclarationSigned || false,
    taxpayerCreditApplied: employee?.taxpayerCreditApplied || false,
    vacationEntitlementHours: employee?.vacationEntitlementHours || 0,
    vacationUsedHours: employee?.vacationUsedHours || 0,
    vacationRemainingHours: employee?.vacationRemainingHours || 0,
    employmentContractDocument: employee?.employmentContractDocument || null,
  }
}

function repairPaySlipInputs(inputs?: Partial<PaySlipInputs>): PaySlipInputs {
  return {
    manualReward: inputs?.manualReward || 0,
    includeManualRewardInAverage: inputs?.includeManualRewardInAverage || false,
    unworked: 0,
    sickCarryoverDays: 0,
    holidayCompensationMode: inputs?.holidayCompensationMode || 'time-off',
  }
}

function repairTimeSummary(summary?: Partial<TimeSummary>): TimeSummary | undefined {
  if (!summary) return undefined
  return {
    monthlyFundHours: summary.monthlyFundHours || 0,
    workedHours: summary.workedHours || 0,
    workedDays: summary.workedDays || 0,
    vacationHours: summary.vacationHours || 0,
    sickHours: summary.sickHours || 0,
    totalSaldo: summary.totalSaldo || 0,
  }
}

function repairDocumentSummary(record: PersistedMonthRecord): IssuedPayslipDocument['snapshot']['documentSummary'] {
  const payrollResult = (record.payrollResult || {}) as PayrollResult & {
    dailyFund?: number
    averageHourlyEarnings?: number
    nightSurchargeRate?: number
    weekendSurchargeRate?: number
    holidaySurchargeRate?: number
    overtimeSurchargeCalc?: number
    nightSurchargeCalc?: number
    weekendSurchargeCalc?: number
    holidaySurchargeCalc?: number
  }
  const timeSummary = repairTimeSummary(record.timeSummary)
  const employee = repairEmployeeSettings(record.employee)
  const dailyFund = typeof payrollResult.dailyFund === 'number' && payrollResult.dailyFund > 0 ? payrollResult.dailyFund : 8
  const averageHourlyEarnings = typeof payrollResult.averageHourlyEarnings === 'number' && payrollResult.averageHourlyEarnings > 0
    ? payrollResult.averageHourlyEarnings
    : 0
  const totalNight = averageHourlyEarnings > 0 && typeof payrollResult.nightSurchargeRate === 'number' && payrollResult.nightSurchargeRate > 0
    ? Number(payrollResult.nightSurchargeCalc || 0) / (averageHourlyEarnings * payrollResult.nightSurchargeRate)
    : 0
  const totalWeekend = averageHourlyEarnings > 0 && typeof payrollResult.weekendSurchargeRate === 'number' && payrollResult.weekendSurchargeRate > 0
    ? Number(payrollResult.weekendSurchargeCalc || 0) / (averageHourlyEarnings * payrollResult.weekendSurchargeRate)
    : 0
  const totalHolidayTotal = averageHourlyEarnings > 0 && typeof payrollResult.holidaySurchargeRate === 'number' && payrollResult.holidaySurchargeRate > 0
    ? Number(payrollResult.holidaySurchargeCalc || 0) / (averageHourlyEarnings * payrollResult.holidaySurchargeRate)
    : 0
  const totalOvertime = averageHourlyEarnings > 0 && employee.overtimeSurcharge > 0
    ? Number(payrollResult.overtimeSurchargeCalc || 0) / (averageHourlyEarnings * employee.overtimeSurcharge)
    : 0

  return {
    workHoursWH: timeSummary?.monthlyFundHours || 0,
    workDaysWH: dailyFund > 0 ? (timeSummary?.monthlyFundHours || 0) / dailyFund : 0,
    totalNight,
    totalWeekend,
    totalHolidayTotal,
    totalOvertime,
    totalVacation: timeSummary?.vacationHours || 0,
    totalSick: timeSummary?.sickHours || 0,
  }
}

export function repairPersistedMonthRecord(record: PersistedMonthRecord): PersistedMonthRecord {
  const repairedRecord: PersistedMonthRecord = {
    ...record,
    employer: repairEmployerProfile(record.employer),
    employee: repairEmployeeSettings(record.employee),
    paySlipInputs: repairPaySlipInputs(record.paySlipInputs),
    timeSummary: repairTimeSummary(record.timeSummary),
  }

  const payslipDocument = repairedRecord.payslipDocument
  if (payslipDocument && (!('snapshot' in payslipDocument) || !payslipDocument.snapshot?.documentSummary)) {
    const employee = repairEmployeeSettings(repairedRecord.employee)
    repairedRecord.payslipDocument = {
      documentType: 'issued_payslip',
      lifecycleStatus: 'issued',
      issuedAt: payslipDocument.issuedAt || repairedRecord.issuedAt || repairedRecord.updatedAt,
      updatedAt: repairedRecord.updatedAt,
      referenceId: repairedRecord.employeeId,
      sourceMonth: repairedRecord.month,
      version: typeof (payslipDocument as IssuedPayslipDocument).version === 'number'
        ? (payslipDocument as IssuedPayslipDocument).version
        : 1,
      snapshotOrigin: 'month',
      snapshot: {
        employer: repairEmployerProfile(repairedRecord.employer),
        employee: {
          id: employee.id,
          name: employee.name,
          employeeNumber: employee.employeeNumber,
          employmentType: employee.employmentType,
          baseSalary: employee.baseSalary,
          personalBonus: employee.personalBonus,
          nightSurcharge: employee.nightSurcharge,
          weekendSurcharge: employee.weekendSurcharge,
          sickCompensation: employee.sickCompensation,
          overtimeSurcharge: employee.overtimeSurcharge,
          vacationEntitlementHours: employee.vacationEntitlementHours,
          vacationUsedHours: employee.vacationUsedHours,
          vacationRemainingHours: employee.vacationRemainingHours,
        },
        month: repairedRecord.month,
        calculationSnapshot: repairedRecord.calculationSnapshot,
        payrollResult: repairedRecord.payrollResult || {},
        timeSummary: repairedRecord.timeSummary,
        paySlipInputs: repairPaySlipInputs(repairedRecord.paySlipInputs),
        documentSummary: repairDocumentSummary(repairedRecord),
      },
    }
  }

  return repairedRecord
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
    const raw = JSON.parse(file) as Partial<EmployeeSettings>[]
    const repaired = raw.map(repairEmployeeSettings)
    if (JSON.stringify(repaired) !== JSON.stringify(raw)) {
      await saveEmployees(repaired)
    }
    return repaired
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function loadCompanyProfile(): Promise<EmployerProfile> {
  await ensureDataDir()
  try {
    const file = await fs.readFile(COMPANY_FILE, 'utf8')
    const raw = JSON.parse(file) as EmployerProfile
    const repaired = repairEmployerProfile(raw)
    if (JSON.stringify(repaired) !== JSON.stringify(raw)) {
      await saveCompanyProfile(repaired)
    }
    return repaired
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return repairEmployerProfile()
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
    const raw = JSON.parse(file) as PersistedMonthRecord
    const parsed = repairPersistedMonthRecord(raw)
    if (JSON.stringify(parsed) !== JSON.stringify(raw)) {
      await fs.writeFile(monthFilePath(employeeId, month), JSON.stringify(parsed, null, 2), 'utf8')
    }
    return parsed
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
          const raw = JSON.parse(file) as PersistedMonthRecord
          const parsed = repairPersistedMonthRecord(raw)
          if (JSON.stringify(parsed) !== JSON.stringify(raw)) {
            await fs.writeFile(path.join(dir, entry.name), JSON.stringify(parsed, null, 2), 'utf8')
          }
          return parsed
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
    workload: typeof employee.workload === 'number' ? employee.workload : DEFAULT_EMPLOYEE_CONTEXT.workload,
    shiftOperation: normalizeShiftOperationType(employee.shiftOperation),
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
    const employeeName = body?.name || `${body?.firstName || ''} ${body?.lastName || ''}`.trim()
    const wage = typeof body?.grossMonthlyWage === 'number' ? body.grossMonthlyWage : body?.baseSalary
    if (!employeeName || !body?.employmentStartDate || typeof wage !== 'number' || wage <= 0) {
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
    const employee = repairEmployeeSettings({ ...body, id })
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
    const profile = repairEmployerProfile(body || undefined)
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
  const updated = employees.map(employee => employee.id === employeeId ? repairEmployeeSettings({ ...employee, ...body, id: employeeId }) : employee)
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
    const body = repairPersistedMonthRecord(await readJsonBody(req) as PersistedMonthRecord)
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
