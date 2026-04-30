import { calculateMonthDays, calcMonthlySummary } from '../payroll/calc'
import type {
  EmployeeMonth,
  EmployeeSettings,
  EmployerProfile,
  EmploymentContractDocument,
  Holiday,
  IssuedPayslipDocument,
  PayrollResult,
  TimeSheetStatementDocument,
} from '../shared/types'
import {
  getShiftOperationDailyFund,
} from '../shared/types'

function documentVersion(previousVersion?: number): number {
  return typeof previousVersion === 'number' ? previousVersion + 1 : 1
}

function buildEmploymentContractSnapshot(employee: EmployeeSettings, employer: EmployerProfile): EmploymentContractDocument['snapshot'] {
  return {
    employer,
    employee: {
      id: employee.id,
      name: employee.name,
      employeeNumber: employee.employeeNumber,
      permanentAddress: employee.permanentAddress,
      employmentStartDate: employee.employmentStartDate,
      employmentEndDate: employee.employmentEndDate,
      contractJobTitle: employee.contractJobTitle,
      contractWorkplace: employee.contractWorkplace,
      contractWorkSchedule: employee.contractWorkSchedule,
      probationMonths: employee.probationMonths,
      fixedTermEndDate: employee.fixedTermEndDate,
      baseSalary: employee.baseSalary,
      workload: employee.workload,
      shiftOperation: employee.shiftOperation,
      weeklyHours: employee.weeklyHours,
      dailyFund: getShiftOperationDailyFund(employee.shiftOperation, employee.workload),
    },
  }
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
    profile.name.trim(),
    profile.ico.trim(),
    profile.seat.trim(),
    profile.representativeName.trim(),
    profile.representativeRole.trim(),
  ]

  return requiredFields.every(Boolean)
}

export function getEmploymentContractMissingFields(employee: EmployeeSettings, employer: EmployerProfile): string[] {
  const missing: string[] = []
  if (!employer.name.trim()) missing.push('název zaměstnavatele')
  if (!employer.ico.trim()) missing.push('IČO zaměstnavatele')
  if (!employer.seat.trim()) missing.push('sídlo zaměstnavatele')
  if (!employer.representativeName.trim()) missing.push('jednající osoba zaměstnavatele')
  if (!employer.representativeRole.trim()) missing.push('funkce jednající osoby')
  if (!employee.name.trim()) missing.push('jméno zaměstnance')
  if (!employee.employeeNumber.trim()) missing.push('osobní číslo')
  if (!employee.permanentAddress.trim()) missing.push('adresa bydliště')
  if (!employee.employmentStartDate.trim()) missing.push('den nástupu')
  if (!employee.contractJobTitle.trim()) missing.push('druh práce')
  if (!employee.contractWorkplace.trim()) missing.push('místo výkonu práce')
  if (!employee.contractWorkSchedule.trim()) missing.push('pracovní doba / úvazek')
  return missing
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

  return {
    documentType: 'employment_contract',
    lifecycleStatus: missing.length === 0 ? 'ready' : 'draft',
    issuedAt: previous?.lifecycleStatus === 'issued' ? previous.issuedAt : undefined,
    issuedBy: previous?.issuedBy,
    updatedAt,
    referenceId: employee.id,
    version: documentVersion(previous?.version),
    snapshotOrigin: 'employee',
    invalidatedAt: previous?.lifecycleStatus === 'issued' ? updatedAt : previous?.invalidatedAt,
    invalidationReason: previous?.lifecycleStatus === 'issued'
      ? 'Změna zaměstnance nebo firemního profilu vyžaduje obnovu pracovní smlouvy.'
      : previous?.invalidationReason,
    snapshot,
  }
}

export function issueEmploymentContractDocument(document: EmploymentContractDocument): EmploymentContractDocument {
  const nowIso = new Date().toISOString()
  return {
    ...document,
    lifecycleStatus: 'issued',
    issuedAt: nowIso,
    updatedAt: nowIso,
    invalidatedAt: undefined,
    invalidationReason: undefined,
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
