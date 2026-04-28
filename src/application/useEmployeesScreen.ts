import { useEffect, useMemo, useState } from 'react'
import {
  buildEmploymentContractDocument,
  getEmploymentContractMissingFields,
  hasContractRelevantChange,
  issueEmploymentContractDocument,
  isEmployerProfileReady,
} from '../domain/documents/builders'
import { printDocumentById } from '../screens/documents/print'
import {
  buildEmployeeMonthRecord,
  createEmployee as createEmployeeApi,
  listEmployeeMonths,
  listEmployees,
  saveEmployeeMonth,
  saveEmployeeDocument,
  updateEmployee as updateEmployeeApi,
} from '../infrastructure/api/monthStorage'
import { useStore, normalizeEmployeeSettings } from '../infrastructure/state/store'
import { invalidateDocument } from '../domain/documents/builders'
import type { EmployeeMonth, EmployeeSettings, MonthStatus } from '../domain/shared/types'
import { calculateMonthDays, calcMonthlySummary } from '../domain/payroll/calc'
import { formatMonthLabel } from './formatters'
import { defaultPaySlipInputs } from './defaults'

function actionLabelForStatus(status?: MonthStatus): string {
  if (!status) return 'Založit měsíc'
  switch (status) {
    case 'draft':
    case 'time_saved':
      return 'Otevřít evidenci'
    case 'time_closed':
      return 'Spočítat mzdu'
    case 'payroll_calculated':
      return 'Schválit mzdu'
    case 'payroll_approved':
      return 'Vystavit výplatní pásku'
    case 'payslip_issued':
      return 'Tisk / PDF'
    default:
      return 'Založit měsíc'
  }
}

function buildMonthList(currentMonth: string, loadedMonths: string[]): string[] {
  const year = currentMonth.split('-')[0]
  const generated = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
  return Array.from(new Set([...generated, ...loadedMonths])).sort()
}

export function useEmployeesScreen() {
  const employer = useStore(s => s.employer)
  const employees = useStore(s => s.employees)
  const selectedEmployeeId = useStore(s => s.selectedEmployeeId)
  const currentMonth = useStore(s => s.currentMonth)
  const recordsByEmployee = useStore(s => s.recordsByEmployee)
  const paySlipInputsByEmployee = useStore(s => s.paySlipInputsByEmployee)
  const monthStatusByEmployee = useStore(s => s.monthStatusByEmployee)
  const payrollByEmployee = useStore(s => s.payrollByEmployee)
  const holidays = useStore(s => s.holidays)
  const createEmployee = useStore(s => s.createEmployee)
  const updateEmployee = useStore(s => s.updateEmployee)
  const replaceEmployees = useStore(s => s.replaceEmployees)
  const selectEmployee = useStore(s => s.selectEmployee)
  const archiveEmployee = useStore(s => s.archiveEmployee)
  const initEmployeeMonth = useStore(s => s.initEmployeeMonth)
  const hydrateEmployeeMonth = useStore(s => s.hydrateEmployeeMonth)
  const setCurrentMonth = useStore(s => s.setCurrentMonth)
  const setSection = useStore(s => s.setSection)

  const [draftEmployee, setDraftEmployee] = useState<EmployeeSettings | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loadedEmployees, setLoadedEmployees] = useState(false)
  const [showContractPreview, setShowContractPreview] = useState(false)

  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId) || null
  const activeEmployee = draftEmployee || selectedEmployee
  const employmentContractDocument = activeEmployee?.employmentContractDocument || null
  const contractMissingFields = activeEmployee ? getEmploymentContractMissingFields(activeEmployee, employer) : []
  const canPrintContract = Boolean(activeEmployee?.id && isEmployerProfileReady(employer) && contractMissingFields.length === 0)

  useEffect(() => {
    if (loadedEmployees) return
    let active = true
    listEmployees()
      .then(loaded => {
        if (!active) return
        replaceEmployees(loaded)
        if (selectedEmployeeId && !loaded.some(employee => employee.id === selectedEmployeeId)) {
          selectEmployee(null)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadedEmployees(true)
      })
    return () => {
      active = false
    }
  }, [loadedEmployees, replaceEmployees, selectEmployee, selectedEmployeeId])

  useEffect(() => {
    if (!selectedEmployeeId) return
    let active = true
    listEmployeeMonths(selectedEmployeeId)
      .then(months => {
        if (!active) return
        months.forEach(monthData => hydrateEmployeeMonth(selectedEmployeeId, monthData.month, monthData))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [hydrateEmployeeMonth, selectedEmployeeId])

  const monthExists = (employeeId: string, month: string) => {
    const statuses = monthStatusByEmployee[employeeId] || {}
    return typeof statuses[month] !== 'undefined'
  }

  const schedulePrintWithRetry = (
    documentId: string,
    setFailure: (message: string) => void,
    attempt = 0,
  ) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const printed = printDocumentById(documentId)
        if (printed) return
        if (attempt >= 2) {
          setFailure('Tisk dokumentu se nepodařilo spustit. Zkuste akci zopakovat.')
          return
        }
        window.setTimeout(() => {
          schedulePrintWithRetry(documentId, setFailure, attempt + 1)
        }, 50)
      })
    })
  }

  const invalidateIssuedMonthDocuments = async (employee: EmployeeSettings) => {
    const employeePayroll = payrollByEmployee[employee.id] || {}
    const employeeStatuses = monthStatusByEmployee[employee.id] || {}
    const employeeRecords = recordsByEmployee[employee.id] || {}
    const employeeInputs = paySlipInputsByEmployee[employee.id] || {}
    const reason = 'Změna údajů zaměstnance vyžaduje obnovu dokumentu.'

    const monthsToRepair = Object.entries(employeePayroll).filter(([, payrollState]) =>
      payrollState?.timeSheetDocument?.lifecycleStatus === 'issued' || payrollState?.payslipDocument?.lifecycleStatus === 'issued',
    )

    for (const [month, payrollState] of monthsToRepair) {
      const nextTimeSheetDocument = invalidateDocument(payrollState?.timeSheetDocument, reason)
      const nextPayslipDocument = invalidateDocument(payrollState?.payslipDocument, reason)
      const nextAuditTrail = [
        ...(payrollState?.auditTrail || []),
        {
          at: new Date().toISOString(),
          action: 'invalidate-documents',
          note: reason,
        },
      ]

      const savedMonth = buildEmployeeMonthRecord({
        employeeId: employee.id,
        month,
        status: employeeStatuses[month] || 'draft',
        employer,
        employee,
        records: employeeRecords[month] || [],
        paySlipInputs: employeeInputs[month] || defaultPaySlipInputs,
        existing: payrollState ? {
          ...payrollState,
          employeeId: employee.id,
          month,
          status: employeeStatuses[month] || 'draft',
          employee,
          employer,
          records: employeeRecords[month] || [],
          paySlipInputs: employeeInputs[month] || defaultPaySlipInputs,
        } : null,
        timeSummary: payrollState?.timeSummary,
        payrollResult: payrollState?.payrollResult,
        calculationSnapshot: payrollState?.calculationSnapshot,
        timeSheetDocument: nextTimeSheetDocument,
        payslipDocument: nextPayslipDocument,
        auditTrail: nextAuditTrail,
        closedAt: payrollState?.closedAt,
        approvedAt: payrollState?.approvedAt,
        issuedAt: payrollState?.issuedAt,
        invalidatedAt: payrollState?.invalidatedAt,
        invalidationReason: payrollState?.invalidationReason,
      })

      await saveEmployeeMonth(employee.id, month, savedMonth)
      hydrateEmployeeMonth(employee.id, month, savedMonth as EmployeeMonth)
    }

    return monthsToRepair.length
  }

  const monthRows = useMemo(() => {
    if (!activeEmployee?.id) return []
    const employeeId = activeEmployee.id
    const records = recordsByEmployee[employeeId] || {}
    const inputsByMonth = paySlipInputsByEmployee[employeeId] || {}
    const statuses = monthStatusByEmployee[employeeId] || {}
    const payroll = payrollByEmployee[employeeId] || {}
    return buildMonthList(currentMonth, Object.keys(statuses)).map(month => {
      const monthRecords = records[month] || []
      const inputs = inputsByMonth[month] || defaultPaySlipInputs
      const summary = monthRecords.length > 0
        ? calcMonthlySummary(calculateMonthDays(monthRecords, activeEmployee, holidays, inputs.sickCarryoverDays))
        : null
      const status = statuses[month]
      const payrollState = payroll[month]
      return {
        month,
        monthLabel: formatMonthLabel(month),
        fundHours: summary?.monthlyFundHours ?? 0,
        workedHours: summary?.workedHours ?? 0,
        sickHours: summary?.totalSick ?? 0,
        vacationHours: summary?.totalVacation ?? 0,
        saldo: summary?.totalSaldo ?? 0,
        timeStatus: status || 'bez dat',
        payrollStatus: status === 'payroll_calculated' || status === 'payroll_approved' || status === 'payslip_issued' ? status : '—',
        payslipStatus: status === 'payslip_issued' ? 'vystavena' : '—',
        updatedAt: payrollState?.updatedAt || payrollState?.closedAt || payrollState?.approvedAt || '—',
        actionLabel: actionLabelForStatus(status),
        actionRoute: (!status ? 'init' : (status === 'draft' || status === 'time_saved' ? 'timesheet' : 'payroll')) as 'init' | 'timesheet' | 'payroll',
        canPreviewTimeSheetDocument: Boolean(payrollState?.timeSheetDocument),
      }
    })
  }, [activeEmployee, currentMonth, holidays, monthStatusByEmployee, paySlipInputsByEmployee, payrollByEmployee, recordsByEmployee])

  const employeeRows = useMemo(() => employees.map(employee => {
    const statuses = monthStatusByEmployee[employee.id] || {}
    const lastClosedMonth = Object.entries(statuses)
      .filter(([, status]) => status === 'time_closed' || status === 'payroll_calculated' || status === 'payroll_approved' || status === 'payslip_issued')
      .map(([month]) => month)
      .sort()
      .at(-1) || '—'
    const lastApprovedMonth = Object.entries(statuses)
      .filter(([, status]) => status === 'payroll_approved' || status === 'payslip_issued')
      .map(([month]) => month)
      .sort()
      .at(-1) || '—'
    return {
      ...employee,
      currentMonth,
      currentMonthStatus: statuses[currentMonth] || '—',
      lastClosedMonth,
      lastApprovedMonth,
    }
  }), [currentMonth, employees, monthStatusByEmployee])

  return {
    employees: employeeRows,
    selectedEmployee: activeEmployee,
    error,
    info,
    monthRows,
    employmentContractDocument,
    contractMissingFields,
    showContractPreview,
    canPrintContract,
    onSelectEmployee: (id: string) => {
      setDraftEmployee(null)
      setShowContractPreview(false)
      selectEmployee(id)
    },
    onCreateEmployee: () => {
      setError('')
      setInfo('')
      setDraftEmployee({ ...normalizeEmployeeSettings(), id: '' })
      selectEmployee(null)
    },
    onEmployeeChange: (field: keyof EmployeeSettings, value: string | number | boolean) => {
      if (!activeEmployee) return
      setDraftEmployee({ ...activeEmployee, [field]: value } as EmployeeSettings)
    },
    onToggleContractPreview: () => {
      setShowContractPreview(value => !value)
    },
    onRefreshContractDraft: async () => {
      if (!activeEmployee?.id) return
      const nextDocument = buildEmploymentContractDocument(activeEmployee, employer, activeEmployee.employmentContractDocument)
      try {
        await saveEmployeeDocument(activeEmployee.id, nextDocument)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Draft pracovní smlouvy se nepodařilo obnovit.')
        return
      }
      updateEmployee(activeEmployee.id, { employmentContractDocument: nextDocument })
      setInfo('Draft pracovní smlouvy byl aktualizován.')
    },
    onPrintContract: async () => {
      if (!activeEmployee?.id || !activeEmployee.employmentContractDocument || !canPrintContract) return
      const issuedDocument = issueEmploymentContractDocument(activeEmployee.employmentContractDocument)
      try {
        await saveEmployeeDocument(activeEmployee.id, issuedDocument)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Pracovní smlouvu se nepodařilo vystavit.')
        return
      }
      updateEmployee(activeEmployee.id, { employmentContractDocument: issuedDocument })
      setDraftEmployee(current => current ? { ...current, employmentContractDocument: issuedDocument } : current)
      setInfo('Pracovní smlouva byla vystavena.')
      schedulePrintWithRetry('employment-contract-document', setError)
    },
    onSaveEmployee: async () => {
      if (!activeEmployee) return
      if (!activeEmployee.name || !activeEmployee.employmentStartDate) {
        setError('Vyplňte jméno a datum nástupu.')
        return
      }
      if (typeof activeEmployee.baseSalary !== 'number' || activeEmployee.baseSalary <= 0) {
        setError('Základní mzda musí být kladné číslo.')
        return
      }
      setError('')
      setInfo('')
      const nextDocument = !activeEmployee.employmentContractDocument ||
        hasContractRelevantChange(
          activeEmployee.employmentContractDocument.snapshot,
          buildEmploymentContractDocument(activeEmployee, employer, null).snapshot,
        )
        ? buildEmploymentContractDocument(activeEmployee, employer, activeEmployee.employmentContractDocument)
        : activeEmployee.employmentContractDocument
      const employeePayload = { ...activeEmployee, employmentContractDocument: nextDocument }
      const employeeFields: Partial<EmployeeSettings> = {
        ...employeePayload,
        employmentContractDocument: undefined,
      }
      const isPersistedEmployee = !!activeEmployee.id && employees.some(employee => employee.id === activeEmployee.id)
      if (!isPersistedEmployee) {
        let persistedEmployee: EmployeeSettings
        try {
          persistedEmployee = await createEmployeeApi({
            ...employeeFields,
            id: undefined,
          })
          await saveEmployeeDocument(
            persistedEmployee.id,
            buildEmploymentContractDocument({ ...persistedEmployee, employmentContractDocument: null }, employer, nextDocument),
          )
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : 'Zaměstnance se nepodařilo uložit.')
          return
        }
        persistedEmployee = {
          ...persistedEmployee,
          employmentContractDocument: buildEmploymentContractDocument({ ...persistedEmployee, employmentContractDocument: null }, employer, nextDocument),
        }
        createEmployee(persistedEmployee)
        selectEmployee(persistedEmployee.id)
        setDraftEmployee(null)
        setInfo('Zaměstnanec byl uložen.')
        return
      }

      try {
        await updateEmployeeApi(activeEmployee.id, employeeFields)
        await saveEmployeeDocument(activeEmployee.id, nextDocument)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Zaměstnance se nepodařilo uložit.')
        return
      }

      const persistedEmployee = { ...employeeFields, employmentContractDocument: nextDocument } as EmployeeSettings
      try {
        const invalidatedMonths = await invalidateIssuedMonthDocuments(persistedEmployee)
        updateEmployee(activeEmployee.id, persistedEmployee)
        setDraftEmployee(null)
        setInfo(invalidatedMonths > 0
          ? 'Změny zaměstnance byly uloženy. Vydané dokumenty zaměstnance byly označeny jako neplatné.'
          : 'Změny zaměstnance byly uloženy.')
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Dokumenty zaměstnance se nepodařilo zneplatnit.')
        return
      }
    },
    onArchiveEmployee: async (id: string) => {
      setError('')
      setInfo('')
      try {
        await updateEmployeeApi(id, { status: 'archived' })
      } catch (archiveError) {
        setError(archiveError instanceof Error ? archiveError.message : 'Zaměstnance se nepodařilo archivovat.')
        return
      }
      archiveEmployee(id)
      setInfo('Zaměstnanec byl archivován.')
    },
    onInitMonth: async (month: string) => {
      if (!activeEmployee?.id || !employees.some(employee => employee.id === activeEmployee.id)) {
        setError('Nejprve uložte zaměstnance.')
        return
      }
      if (monthExists(activeEmployee.id, month)) {
        setInfo('Měsíc už existuje.')
        return
      }
      setError('')
      setInfo('')
      const draft = buildEmployeeMonthRecord({
        employeeId: activeEmployee.id,
        month,
        status: 'draft',
        employee: activeEmployee,
        records: [],
        paySlipInputs: defaultPaySlipInputs,
        auditTrail: [{ at: new Date().toISOString(), action: 'init-month' }],
      })
      try {
        await saveEmployeeMonth(activeEmployee.id, month, draft)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Měsíc se nepodařilo založit.')
        return
      }
      initEmployeeMonth(activeEmployee.id, month)
      hydrateEmployeeMonth(activeEmployee.id, month, draft as EmployeeMonth)
      setCurrentMonth(month)
      setSection('timesheet')
      setInfo('Měsíc byl založen.')
    },
    onOpenMonth: (month: string) => {
      if (!activeEmployee?.id) return
      setCurrentMonth(month)
      const status = monthStatusByEmployee[activeEmployee.id]?.[month]
      if (status === 'draft' || status === 'time_saved' || !status) {
        setSection('timesheet')
        return
      }
      setSection('payroll')
    },
    onOpenTimeSheetDocument: (month: string) => {
      if (!activeEmployee?.id) return
      setCurrentMonth(month)
      setSection('timesheet')
    },
  }
}
