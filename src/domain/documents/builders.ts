import { calculateMonthDays, calcMonthlySummary } from '../payroll/calc'
import type {
  EmployeeMonth,
  EmployeeSettings,
  EmployerProfile,
  EmploymentContractDocument,
  HandoverProtocolDocument,
  Holiday,
  IssuedPayslipDocument,
  PayrollResult,
  Section37Document,
  TimeSheetStatementDocument,
} from '../shared/types'
import { normalizeIco, validateIco } from './contractFormatters'
import {
  getMinimumMonthlyWage,
  validateEmploymentContractFields,
  type EmploymentContractValidationData,
} from './contractValidation'
import {
  buildEmploymentContractDocument as buildEmploymentContractTemplate,
  buildHandoverProtocolDocument as buildHandoverProtocolTemplate,
  buildSection37Document as buildSection37Template,
} from './contractTemplates'

export { formatCzechDate, formatCurrencyCZK, normalizeIco, validateIco } from './contractFormatters'
export { getMinimumMonthlyWage, validateEmploymentContractFields } from './contractValidation'

function documentVersion(previousVersion?: number): number {
  return typeof previousVersion === 'number' ? previousVersion + 1 : 1
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function hashDocumentSnapshot(snapshot: unknown): string {
  let hash = 2166136261
  const input = stableStringify(snapshot)
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) || '' }
}

function legalName(employer: EmployerProfile): string {
  return (employer.legalName || employer.name || '').trim()
}

function registeredAddress(employer: EmployerProfile): string {
  return (employer.registeredAddress || employer.seat || '').trim()
}

function employeeFirstName(employee: EmployeeSettings): string {
  return (employee.firstName || splitName(employee.name).firstName).trim()
}

function employeeLastName(employee: EmployeeSettings): string {
  return (employee.lastName || splitName(employee.name).lastName).trim()
}

function employeeFullName(employee: EmployeeSettings): string {
  const full = `${employeeFirstName(employee)} ${employeeLastName(employee)}`.trim()
  return full || employee.name.trim()
}

function employeeAddress(employee: EmployeeSettings): string {
  return (employee.address || employee.permanentAddress || '').trim()
}

function grossMonthlyWage(employee: EmployeeSettings): number {
  return typeof employee.grossMonthlyWage === 'number' ? employee.grossMonthlyWage : employee.baseSalary
}

function annualVacationWeeks(employee: EmployeeSettings): number {
  if (typeof employee.annualVacationWeeks === 'number') return employee.annualVacationWeeks
  if (employee.weeklyHours > 0 && employee.vacationEntitlementHours > 0) {
    return Math.round((employee.vacationEntitlementHours / employee.weeklyHours) * 100) / 100
  }
  return 4
}

function contractValidationData(employee: EmployeeSettings, employer: EmployerProfile): EmploymentContractValidationData {
  const durationType = employee.durationType || (employee.fixedTermEndDate ? 'fixed_term' : 'indefinite')
  return {
    employerLegalName: legalName(employer),
    employerIco: employer.ico,
    employerRegisteredAddress: registeredAddress(employer),
    representativeName: employer.representativeName,
    representativeRole: employer.representativeRole,
    employeeName: employeeFullName(employee),
    employeeBirthDate: employee.birthDate || '',
    employeeAddress: employeeAddress(employee),
    jobType: employee.contractJobTitle,
    workplace: employee.contractWorkplace,
    startDate: employee.employmentStartDate,
    contractConclusionDate: employee.contractConclusionDate || employee.employmentStartDate,
    signaturePlace: employee.signaturePlace || registeredAddress(employer),
    durationType,
    fixedTermEndDate: durationType === 'fixed_term' ? employee.fixedTermEndDate || null : null,
    weeklyHours: employee.weeklyHours,
    isManager: Boolean(employee.isManager),
    probationEnabled: Boolean(employee.probationEnabled),
    probationMonths: employee.probationEnabled ? employee.probationMonths || null : null,
    grossMonthlyWage: grossMonthlyWage(employee),
    annualVacationWeeks: annualVacationWeeks(employee),
  }
}

function buildEmploymentContractSnapshot(employee: EmployeeSettings, employer: EmployerProfile): EmploymentContractDocument['snapshot'] {
  const normalizedIco = normalizeIco(employer.ico)
  const durationType = employee.durationType || (employee.fixedTermEndDate ? 'fixed_term' : 'indefinite')
  const snapshotWithoutText = {
    employer: {
      legalName: legalName(employer),
      ico: normalizedIco,
      registeredAddress: registeredAddress(employer),
      representativeName: employer.representativeName.trim(),
      representativeRole: employer.representativeRole.trim(),
    },
    employee: {
      id: employee.id,
      name: employeeFullName(employee),
      firstName: employeeFirstName(employee),
      lastName: employeeLastName(employee),
      birthDate: employee.birthDate || '',
      address: employeeAddress(employee),
      personalNumberInternal: employee.personalNumberInternal || employee.employeeNumber || undefined,
    },
    contract: {
      jobType: employee.contractJobTitle.trim(),
      workplace: employee.contractWorkplace.trim(),
      startDate: employee.employmentStartDate,
      contractConclusionDate: employee.contractConclusionDate || employee.employmentStartDate,
      signaturePlace: employee.signaturePlace || registeredAddress(employer),
      durationType,
      fixedTermEndDate: durationType === 'fixed_term' ? employee.fixedTermEndDate || null : null,
      weeklyHours: employee.weeklyHours,
      isManager: Boolean(employee.isManager),
      probationEnabled: Boolean(employee.probationEnabled),
      probationMonths: employee.probationEnabled ? employee.probationMonths || null : null,
      grossMonthlyWage: grossMonthlyWage(employee),
      annualVacationWeeks: annualVacationWeeks(employee),
      employeeReceivedCopyAt: employee.employeeReceivedCopyAt,
    },
  }
  const template = buildEmploymentContractTemplate(snapshotWithoutText)
  return { ...snapshotWithoutText, ...template }
}

export function hasContractRelevantChange(
  previous: EmploymentContractDocument['snapshot'] | null | undefined,
  next: EmploymentContractDocument['snapshot'],
): boolean {
  if (!previous) return true
  return JSON.stringify(previous) !== JSON.stringify(next)
}

export function isEmployerProfileReady(profile: EmployerProfile): boolean {
  const requiredFields = [
    legalName(profile),
    profile.ico.trim(),
    registeredAddress(profile),
    profile.representativeName.trim(),
    profile.representativeRole.trim(),
  ]

  return requiredFields.every(Boolean) && validateIco(profile.ico)
}

export function getEmploymentContractMissingFields(employee: EmployeeSettings, employer: EmployerProfile): string[] {
  const validation = validateEmploymentContractFields(contractValidationData(employee, employer))
  return [...validation.missingFields, ...validation.errors]
}

export function buildEmploymentContractDocument(
  employee: EmployeeSettings,
  employer: EmployerProfile,
  previous?: EmploymentContractDocument | null,
): EmploymentContractDocument {
  const snapshot = buildEmploymentContractSnapshot(employee, employer)
  if (previous && !hasContractRelevantChange(previous.snapshot, snapshot)) {
    return previous
  }

  const updatedAt = new Date().toISOString()
  const missing = getEmploymentContractMissingFields(employee, employer)
  const documentId = previous?.documentId || `employment-contract-${employee.id || 'draft'}`
  const hash = hashDocumentSnapshot(snapshot)

  return {
    documentType: 'employment_contract',
    lifecycleStatus: missing.length === 0 ? 'ready' : 'draft',
    issuedAt: previous?.lifecycleStatus === 'issued' ? previous.issuedAt : undefined,
    issuedBy: previous?.issuedBy,
    updatedAt,
    referenceId: employee.id,
    version: documentVersion(previous?.version),
    snapshotOrigin: 'employee',
    documentId,
    generatedAt: updatedAt,
    hash,
    templateVersion: 'employment-contract-cz-v2',
    invalidatedAt: previous?.lifecycleStatus === 'issued' ? updatedAt : previous?.invalidatedAt,
    invalidationReason: previous?.lifecycleStatus === 'issued'
      ? 'Změna zaměstnance nebo firemního profilu vyžaduje obnovu pracovní smlouvy.'
      : previous?.invalidationReason,
    snapshot,
  }
}

export function issueEmploymentContractDocument(document: EmploymentContractDocument): EmploymentContractDocument {
  const nowIso = new Date().toISOString()
  const hash = hashDocumentSnapshot(document.snapshot)
  return {
    ...document,
    lifecycleStatus: 'issued',
    issuedAt: nowIso,
    updatedAt: nowIso,
    generatedAt: document.generatedAt || nowIso,
    hash,
    templateVersion: document.templateVersion || 'employment-contract-cz-v2',
    invalidatedAt: undefined,
    invalidationReason: undefined,
  }
}

export function buildSection37Document(
  employee: EmployeeSettings,
  employer: EmployerProfile,
  generatedAt = new Date().toISOString(),
): Section37Document {
  const contract = buildEmploymentContractSnapshot(employee, employer)
  const snapshotWithoutText = {
    employer: {
      ...contract.employer,
      wageDueText: employer.wageDueText || 'mzda je splatná po vykonání práce, nejpozději v kalendářním měsíci následujícím po měsíci, ve kterém vzniklo právo na mzdu',
      wagePaymentTerm: employer.wagePaymentTerm || 'do 15. dne následujícího kalendářního měsíce',
      wagePaymentPlace: employer.wagePaymentPlace || 'pracoviště zaměstnavatele',
      wagePaymentMethod: employer.wagePaymentMethod || 'bezhotovostním převodem na účet zaměstnance, není-li dohodnuto jinak',
      workScheduleText: employer.workScheduleText || employee.contractWorkSchedule || 'rovnoměrné rozvržení pracovní doby',
      balancingPeriodText: employer.balancingPeriodText || 'neuplatní se',
      overtimeScopeText: employer.overtimeScopeText || 'práce přesčas může být nařízena nebo dohodnuta v rozsahu podle zákoníku práce',
      socialSecurityAuthority: employer.socialSecurityAuthority || 'Česká správa sociálního zabezpečení',
    },
    employee: contract.employee,
    contract: contract.contract,
    generatedAt,
    handedOverAt: employee.employeeReceivedCopyAt,
    handoverMethod: employee.employeeReceivedCopyAt ? 'osobně' : undefined,
  }
  const template = buildSection37Template(snapshotWithoutText)
  const snapshot = { ...snapshotWithoutText, ...template }
  return {
    documentType: 'section37_information',
    lifecycleStatus: 'ready',
    updatedAt: generatedAt,
    referenceId: employee.id,
    version: 1,
    snapshotOrigin: 'employee',
    documentId: `section37-${employee.id || 'draft'}`,
    generatedAt,
    hash: hashDocumentSnapshot(snapshot),
    templateVersion: 'section37-cz-v1',
    snapshot,
  }
}

export function buildHandoverProtocolDocument(
  employee: EmployeeSettings,
  _employer: EmployerProfile,
  generatedAt = new Date().toISOString(),
): HandoverProtocolDocument {
  const nameParts = splitName(employee.name)
  const snapshotWithoutText = {
    employee: {
      id: employee.id,
      name: employeeFullName(employee),
      firstName: employee.firstName || nameParts.firstName,
      lastName: employee.lastName || nameParts.lastName,
      birthDate: employee.birthDate || '',
      address: employeeAddress(employee),
      personalNumberInternal: employee.personalNumberInternal || employee.employeeNumber || undefined,
    },
    generatedAt,
    handedOverAt: employee.employeeReceivedCopyAt,
    handoverMethod: employee.employeeReceivedCopyAt ? 'osobně' : undefined,
    hasBopDocuments: false,
  }
  const template = buildHandoverProtocolTemplate(snapshotWithoutText)
  const snapshot = { ...snapshotWithoutText, ...template }
  return {
    documentType: 'handover_protocol',
    lifecycleStatus: employee.employeeReceivedCopyAt ? 'issued' : 'ready',
    updatedAt: generatedAt,
    referenceId: employee.id,
    version: 1,
    snapshotOrigin: 'employee',
    documentId: `handover-${employee.id || 'draft'}`,
    generatedAt,
    hash: hashDocumentSnapshot(snapshot),
    templateVersion: 'handover-cz-v1',
    snapshot,
  }
}

export function getTimeSheetStatementBlockingReason(month: EmployeeMonth, employer?: EmployerProfile): string | null {
  if (!month.timeSummary) {
    return 'Chybí uložený souhrn evidence za měsíc.'
  }
  if (!employer || !isEmployerProfileReady(employer)) {
    return 'Firemní profil není uložený v plném rozsahu pro vydání dokumentu.'
  }
  return null
}

export function buildTimeSheetStatementDocument(
  employee: EmployeeSettings,
  employer: EmployerProfile,
  month: EmployeeMonth,
  holidays: Holiday[],
  previous?: TimeSheetStatementDocument | null,
): TimeSheetStatementDocument {
  const updatedAt = new Date().toISOString()
  const calculated = calculateMonthDays(month.records, employee, holidays, month.paySlipInputs.sickCarryoverDays)
  const summary = month.timeSummary || calcMonthlySummary(calculated)

  return {
    documentType: 'time_sheet_statement',
    lifecycleStatus: 'ready',
    updatedAt,
    referenceId: employee.id,
    sourceMonth: month.month,
    version: documentVersion(previous?.version),
    snapshotOrigin: 'month',
    snapshot: {
      employer,
      employee: {
        id: employee.id,
        name: employee.name,
        employeeNumber: employee.employeeNumber,
        permanentAddress: employee.permanentAddress,
        contractJobTitle: employee.contractJobTitle,
      },
      month: month.month,
      periodLabel: month.month,
      rows: calculated.map((day, index) => ({
        date: day.date,
        shift: month.records[index]?.shift || '',
        arrival: month.records[index]?.arrival || '',
        departure: month.records[index]?.departure || '',
        breakStart: month.records[index]?.breakStart || '',
        breakEnd: month.records[index]?.breakEnd || '',
        workedHours: day.worked,
        overtimeHours: day.overtime,
        nightHours: day.nightHours,
        absenceLabel: month.records[index]?.shift === 'dovolená'
          ? 'Dovolená'
          : month.records[index]?.shift === 'nemoc'
            ? 'Nemoc'
            : '',
      })),
      totals: {
        workedHours: summary.workedHours,
        overtimeHours: calculated.reduce((sum, day) => sum + day.overtime, 0),
        nightHours: calculated.reduce((sum, day) => sum + day.nightHours, 0),
        vacationHours: 'vacationHours' in summary ? summary.vacationHours : summary.totalVacation,
        sickHours: 'sickHours' in summary ? summary.sickHours : summary.totalSick,
        totalSaldo: summary.totalSaldo,
      },
    },
  }
}

export function buildIssuedPayslipDocument(
  employee: EmployeeSettings,
  employer: EmployerProfile,
  month: EmployeeMonth,
  documentSummary: IssuedPayslipDocument['snapshot']['documentSummary'],
  previous?: IssuedPayslipDocument | null,
): IssuedPayslipDocument {
  if (!documentSummary) {
    throw new Error('Issued payslip document requires documentSummary.')
  }

  const updatedAt = new Date().toISOString()

  return {
    documentType: 'issued_payslip',
    lifecycleStatus: 'issued',
    issuedAt: updatedAt,
    updatedAt,
    referenceId: employee.id,
    sourceMonth: month.month,
    version: documentVersion(previous?.version),
    snapshotOrigin: 'month',
    snapshot: {
      employer,
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
      month: month.month,
      calculationSnapshot: month.calculationSnapshot,
      payrollResult: (month.payrollResult || {}) as PayrollResult,
      timeSummary: month.timeSummary,
      paySlipInputs: month.paySlipInputs,
      documentSummary,
    },
  }
}

export function invalidateDocument<T extends { lifecycleStatus: string; invalidatedAt?: string; invalidationReason?: string }>(
  document: T | null | undefined,
  reason: string,
): T | null {
  if (!document) return null
  return {
    ...document,
    lifecycleStatus: 'invalidated',
    invalidatedAt: new Date().toISOString(),
    invalidationReason: reason,
  }
}
