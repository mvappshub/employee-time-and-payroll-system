import { describe, expect, it } from 'vitest'

import {
  buildEmploymentContractDocument,
  buildHandoverProtocolDocument,
  buildIssuedPayslipDocument,
  buildSection37Document,
  buildTimeSheetStatementDocument,
  formatCzechDate,
  getMinimumMonthlyWage,
  hashDocumentSnapshot,
  invalidateDocument,
  normalizeIco,
  validateEmploymentContractFields,
} from './domain/documents/builders'
import { buildEmployeeMonthRecord } from './domain/month/employeeMonth'
import type { EmployeeMonth, EmployeeSettings, EmployerProfile } from './domain/shared/types'

const employer: EmployerProfile = {
  name: 'ACME s.r.o.',
  legalName: 'ACME s.r.o.',
  ico: '27074358',
  seat: 'Praha 1',
  registeredAddress: 'Praha 1',
  representativeName: 'Jana Jednatelová',
  representativeRole: 'jednatelka',
}

const employee: EmployeeSettings = {
  id: 'emp-1',
  name: 'Jan Novák',
  firstName: 'Jan',
  lastName: 'Novák',
  birthDate: '1990-05-10',
  address: 'Praha 10',
  personalNumberInternal: '001',
  employeeNumber: '001',
  permanentAddress: 'Praha 10',
  status: 'active',
  employmentType: 'pracovni_pomer',
  employmentStartDate: '2026-01-01',
  employmentEndDate: '',
  contractJobTitle: 'Operátor výroby',
  contractWorkplace: 'Praha',
  contractWorkSchedule: 'plný úvazek, 40 hodin týdně',
  contractConclusionDate: '2025-12-15',
  signaturePlace: 'Praha',
  durationType: 'indefinite',
  isManager: false,
  probationEnabled: true,
  probationMonths: 3,
  fixedTermEndDate: null,
  grossMonthlyWage: 30000,
  annualVacationWeeks: 4,
  workload: 1,
  shiftOperation: 'single',
  weeklyHours: 40,
  workDaysPerWeek: 5,
  weekendWorking: false,
  shiftStart: '06:00',
  shiftEnd: '14:30',
  standardBreak: 0.5,
  nightWorkAllowed: true,
  nightFrom: '22:00',
  nightTo: '06:00',
  overtimeAllowed: true,
  baseSalary: 30000,
  personalBonus: 0.2,
  nightSurcharge: 0.1,
  weekendSurcharge: 0.1,
  holidaySurcharge: 1,
  overtimeSurcharge: 0.25,
  sickCompensation: 0.6,
  holidayCompensationMode: 'time-off',
  overtimeCompensationMode: 'premium',
  appliesHealthMinimumBase: true,
  healthMinimumBaseExceptionReason: '',
  taxDeclarationSigned: true,
  taxpayerCreditApplied: true,
  vacationEntitlementHours: 160,
  vacationUsedHours: 8,
  vacationRemainingHours: 152,
  employmentContractDocument: null,
}

const month: EmployeeMonth = {
  employeeId: 'emp-1',
  month: '2026-04',
  status: 'payroll_approved',
  records: [
    { date: '2026-04-01', shift: 'ranní', arrival: '06:00', departure: '14:30' },
    { date: '2026-04-02', shift: 'dovolená', arrival: '', departure: '' },
  ],
  paySlipInputs: {
    manualReward: 0,
    includeManualRewardInAverage: false,
    unworked: 0,
    sickCarryoverDays: 0,
    holidayCompensationMode: 'time-off',
  },
  timeSummary: {
    monthlyFundHours: 160,
    workedHours: 8,
    workedDays: 1,
    vacationHours: 8,
    sickHours: 0,
    totalSaldo: 0,
  },
  payrollResult: {
    hrubaMzda: 40000,
    cistaMzda: 32000,
  },
  calculationSnapshot: {
    averageEarningsSource: 'actual',
    averageHourlyEarnings: 250,
    legalConstants: { foo: 1 },
    calculatedAt: '2026-04-30T10:00:00.000Z',
  },
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
}

const isoDateRegex = /\b\d{4}-\d{2}-\d{2}\b/

describe('document builders', () => {
  it('formats Czech dates and keeps ISO dates out of employment contract text', () => {
    const document = buildEmploymentContractDocument(employee, employer)

    expect(formatCzechDate('2026-01-01')).toBe('1. 1. 2026')
    expect(document.snapshot.text).not.toMatch(isoDateRegex)
  })

  it('builds indefinite employment contract without fixed-term end labels', () => {
    const document = buildEmploymentContractDocument({ ...employee, durationType: 'indefinite', fixedTermEndDate: null }, employer)

    expect(document.lifecycleStatus).toBe('ready')
    expect(document.snapshot.text).toContain('Pracovní poměr se sjednává na dobu neurčitou.')
    expect(document.snapshot.text).not.toContain('Doba určitá do')
    expect(document.snapshot.text).not.toContain('Datum ukončení')
  })

  it('builds fixed-term employment contract with Czech end date', () => {
    const document = buildEmploymentContractDocument({
      ...employee,
      durationType: 'fixed_term',
      fixedTermEndDate: '2026-12-31',
    }, employer)

    expect(document.snapshot.text).toContain('Pracovní poměr se sjednává na dobu určitou do 31. 12. 2026.')
  })

  it('prints wage only as gross monthly wage', () => {
    const document = buildEmploymentContractDocument({ ...employee, grossMonthlyWage: 30000 }, employer)

    expect(document.snapshot.text).toContain('Zaměstnanci náleží hrubá měsíční mzda ve výši 30 000 Kč.')
    expect(document.snapshot.text).not.toContain('Mzda 30 000 Kč')
  })

  it('omits probation section when probation is disabled', () => {
    const document = buildEmploymentContractDocument({ ...employee, probationEnabled: false, probationMonths: null }, employer)

    expect(document.snapshot.text).not.toContain('Zkušební doba')
    expect(document.snapshot.text).not.toContain('Smluvní strany sjednávají zkušební dobu')
  })

  it('prints probation section when probation is enabled', () => {
    const document = buildEmploymentContractDocument({ ...employee, probationEnabled: true, probationMonths: 3 }, employer)

    expect(document.snapshot.text).toContain('Smluvní strany sjednávají zkušební dobu v délce 3 měsíců ode dne vzniku pracovního poměru.')
  })

  it('returns validation error when probation is agreed after start date', () => {
    const result = validateEmploymentContractFields({
      employerLegalName: employer.legalName || employer.name,
      employerIco: employer.ico,
      employerRegisteredAddress: employer.registeredAddress || employer.seat,
      representativeName: employer.representativeName,
      representativeRole: employer.representativeRole,
      employeeName: employee.name,
      employeeBirthDate: employee.birthDate || '',
      employeeAddress: employee.address || employee.permanentAddress,
      jobType: employee.contractJobTitle,
      workplace: employee.contractWorkplace,
      startDate: '2026-01-01',
      contractConclusionDate: '2026-04-30',
      signaturePlace: 'Praha',
      durationType: 'indefinite',
      fixedTermEndDate: null,
      weeklyHours: 40,
      isManager: false,
      probationEnabled: true,
      probationMonths: 3,
      grossMonthlyWage: 30000,
      annualVacationWeeks: 4,
    })

    expect(result.errors.join(' ')).toContain('Datum uzavření smlouvy nesmí být po dni nástupu')
  })

  it('normalizes IČO and never prints raw short IČO', () => {
    const document = buildEmploymentContractDocument(employee, { ...employer, ico: '123456' })

    expect(normalizeIco('123456')).toBe('00123456')
    expect(document.snapshot.text).not.toContain('IČO: 123456')
  })

  it('does not contain forbidden employment contract text fragments', () => {
    const document = buildEmploymentContractDocument(employee, employer)

    expect(document.snapshot.text).not.toContain('Pracovní smlouva / plný úvazek')
    expect(document.snapshot.text).not.toContain('Doba určitá do: na dobu neurčitou')
    expect(document.snapshot.text).not.toContain('Mzda 30 000 Kč')
    expect(document.snapshot.text).not.toContain('2026-01-01')
    expect(document.snapshot.text).not.toContain('dd.mm.rrrr')
    expect(document.snapshot.text).not.toContain('lorem')
    expect(document.snapshot.text).not.toContain('Nevím')
  })

  it('builds section 37 information with required rows', () => {
    const document = buildSection37Document(employee, employer, '2026-04-30T10:00:00.000Z')
    const text = document.snapshot.text

    expect(text).toContain('Dovolená: 4 týdny za kalendářní rok')
    expect(text).toContain('Hrubá měsíční mzda je sjednána v pracovní smlouvě ve výši 30 000 Kč')
    expect(text).toContain('Týdenní pracovní doba: 40 hodin týdně')
    expect(text).toContain('Výpovědní doba')
    expect(text).toContain('Orgán sociálního zabezpečení')
    expect(text).toContain('u zaměstnavatele není evidována kolektivní smlouva vztahující se na zaměstnance')
  })

  it('builds handover protocol without wage statement', () => {
    const document = buildHandoverProtocolDocument(employee, employer, '2026-04-30T10:00:00.000Z')
    const text = document.snapshot.text

    expect(text).toContain('pracovní smlouva')
    expect(text).toContain('informace podle § 37 zákoníku práce')
    expect(text).not.toContain('mzdový výměr')
  })

  it('detects wage below 2026 minimum wage', () => {
    const minimum = getMinimumMonthlyWage(2026, 40)
    const result = validateEmploymentContractFields({
      employerLegalName: employer.legalName || employer.name,
      employerIco: employer.ico,
      employerRegisteredAddress: employer.registeredAddress || employer.seat,
      representativeName: employer.representativeName,
      representativeRole: employer.representativeRole,
      employeeName: employee.name,
      employeeBirthDate: employee.birthDate || '',
      employeeAddress: employee.address || employee.permanentAddress,
      jobType: employee.contractJobTitle,
      workplace: employee.contractWorkplace,
      startDate: '2026-01-01',
      contractConclusionDate: '2025-12-15',
      signaturePlace: 'Praha',
      durationType: 'indefinite',
      fixedTermEndDate: null,
      weeklyHours: 40,
      isManager: false,
      probationEnabled: false,
      probationMonths: null,
      grossMonthlyWage: 20000,
      annualVacationWeeks: 4,
    })

    expect(minimum).toBe(22400)
    expect(result.wageBelowMinimum).toBe(true)
  })

  it('keeps original problematic sample clean and flags probation date', () => {
    const sample = {
      ...employee,
      name: 'Jan Novák',
      firstName: 'Jan',
      lastName: 'Novák',
      contractJobTitle: 'Kopáč',
      employmentStartDate: '2026-01-01',
      contractConclusionDate: '2026-04-30',
      probationEnabled: true,
      probationMonths: 3,
    }
    const document = buildEmploymentContractDocument(sample, employer)
    const validation = validateEmploymentContractFields({
      employerLegalName: employer.legalName || employer.name,
      employerIco: employer.ico,
      employerRegisteredAddress: employer.registeredAddress || employer.seat,
      representativeName: employer.representativeName,
      representativeRole: employer.representativeRole,
      employeeName: sample.name,
      employeeBirthDate: sample.birthDate || '',
      employeeAddress: sample.address || sample.permanentAddress,
      jobType: sample.contractJobTitle,
      workplace: sample.contractWorkplace,
      startDate: sample.employmentStartDate,
      contractConclusionDate: sample.contractConclusionDate || '',
      signaturePlace: sample.signaturePlace || '',
      durationType: 'indefinite',
      fixedTermEndDate: null,
      weeklyHours: sample.weeklyHours,
      isManager: false,
      probationEnabled: true,
      probationMonths: 3,
      grossMonthlyWage: sample.grossMonthlyWage || sample.baseSalary,
      annualVacationWeeks: sample.annualVacationWeeks || 4,
    })

    expect(document.snapshot.text).not.toMatch(isoDateRegex)
    expect(document.snapshot.text).not.toContain('Doba určitá do: na dobu neurčitou')
    expect(document.snapshot.text).not.toContain('Mzda 30 000 Kč')
    expect(validation.errors.join(' ')).toContain('Datum uzavření smlouvy nesmí být po dni nástupu')
  })

  it('stores deterministic audit hash on employment contract', () => {
    const document = buildEmploymentContractDocument(employee, employer)

    expect(document.hash).toBe(hashDocumentSnapshot(document.snapshot))
    expect(document.templateVersion).toBe('employment-contract-cz-v2')
    expect(document.documentId).toBe('employment-contract-emp-1')
  })

  it('downgrades previously issued contract to refreshable draft when source data changes', () => {
    const first = {
      ...buildEmploymentContractDocument(employee, employer),
      lifecycleStatus: 'issued' as const,
      issuedAt: '2026-04-01T10:00:00.000Z',
    }

    const refreshed = buildEmploymentContractDocument({ ...employee, contractWorkplace: 'Brno' }, employer, first)

    expect(refreshed.lifecycleStatus).toBe('ready')
    expect(refreshed.invalidationReason).toContain('obnovu pracovní smlouvy')
  })

  it('keeps issued contract unchanged when only non-contract payroll fields change', () => {
    const first = {
      ...buildEmploymentContractDocument(employee, employer),
      lifecycleStatus: 'issued' as const,
      issuedAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
      version: 2,
    }

    const unchanged = buildEmploymentContractDocument({ ...employee, taxDeclarationSigned: false, vacationUsedHours: 40 }, employer, first)

    expect(unchanged).toBe(first)
    expect(unchanged.version).toBe(2)
    expect(unchanged.invalidatedAt).toBeUndefined()
  })

  it('builds time sheet statement from persisted month snapshot', () => {
    const document = buildTimeSheetStatementDocument(employee, employer, month, [])

    expect(document.snapshot.month).toBe('2026-04')
    expect(document.snapshot.rows[0].arrival).toBe('06:00')
    expect(document.snapshot.totals.vacationHours).toBe(8)
  })

  it('builds issued payslip document with payroll snapshot', () => {
    const document = buildIssuedPayslipDocument(employee, employer, month, {
      workHoursWH: 160,
      workDaysWH: 20,
      totalNight: 4,
      totalWeekend: 0,
      totalHolidayTotal: 0,
      totalOvertime: 2,
      totalVacation: 8,
      totalSick: 0,
    })

    expect(document.lifecycleStatus).toBe('issued')
    expect(document.snapshot.payrollResult.hrubaMzda).toBe(40000)
    expect(document.snapshot.calculationSnapshot?.averageHourlyEarnings).toBe(250)
    expect(document.snapshot.documentSummary.totalOvertime).toBe(2)
  })

  it('invalidates an issued document in place', () => {
    const document = buildIssuedPayslipDocument(employee, employer, month, {
      workHoursWH: 160,
      workDaysWH: 20,
      totalNight: 4,
      totalWeekend: 0,
      totalHolidayTotal: 0,
      totalOvertime: 2,
      totalVacation: 8,
      totalSick: 0,
    })
    const invalidated = invalidateDocument(document, 'Změna dat.')

    expect(invalidated?.lifecycleStatus).toBe('invalidated')
    expect(invalidated?.invalidationReason).toBe('Změna dat.')
  })

  it('preserves issued payslip snapshot through JSON persistence roundtrip', () => {
    const payslipDocument = buildIssuedPayslipDocument(employee, employer, month, {
      workHoursWH: 160,
      workDaysWH: 20,
      totalNight: 4,
      totalWeekend: 0,
      totalHolidayTotal: 0,
      totalOvertime: 2,
      totalVacation: 8,
      totalSick: 0,
    })
    const persisted = buildEmployeeMonthRecord({
      employeeId: month.employeeId,
      month: month.month,
      status: 'payslip_issued',
      employee,
      employer,
      records: month.records,
      paySlipInputs: month.paySlipInputs,
      timeSummary: month.timeSummary,
      payrollResult: month.payrollResult,
      calculationSnapshot: month.calculationSnapshot,
      payslipDocument,
    })

    const roundtrip = JSON.parse(JSON.stringify(persisted)) as EmployeeMonth

    expect(roundtrip.payslipDocument?.documentType).toBe('issued_payslip')
    expect(roundtrip.payslipDocument?.snapshot.documentSummary.workHoursWH).toBe(160)
    expect(roundtrip.payslipDocument?.snapshot.paySlipInputs.manualReward).toBe(0)
  })
})
