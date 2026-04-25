import { useEffect, useMemo, useState } from 'react'
import { createEmployee as createEmployeeApi, listEmployeeMonths, listEmployees, updateEmployee as updateEmployeeApi } from '../infrastructure/api/monthStorage'
import { useStore, normalizeEmployeeSettings } from '../infrastructure/state/store'
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
      return 'Tisk PDF'
    default:
      return 'Založit měsíc'
  }
}

function buildMonthList(currentMonth: string, loadedMonths: string[]): string[] {
  const year = currentMonth.split('-')[0]
  const generated = Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
  return Array.from(new Set([...generated, ...loadedMonths])).sort()
}

function makeEmployeeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `emp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useEmployeesScreen() {
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

  const selectedEmployee = employees.find(employee => employee.id === selectedEmployeeId) || null
  const activeEmployee = draftEmployee || selectedEmployee

  useEffect(() => {
    if (loadedEmployees || employees.length > 0) return
    let active = true
    listEmployees()
      .then(async loaded => {
        if (!active) return
        loaded.forEach(employee => {
          if (!employees.some(existing => existing.id === employee.id)) {
            createEmployee(employee)
          }
        })
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadedEmployees(true)
      })
    return () => {
      active = false
    }
  }, [createEmployee, employees, loadedEmployees])

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
        timeStatus: status || '—',
        payrollStatus: status === 'payroll_calculated' || status === 'payroll_approved' || status === 'payslip_issued' ? status : '—',
        payslipStatus: status === 'payslip_issued' ? 'vystavena' : '—',
        updatedAt: payrollState?.updatedAt || payrollState?.closedAt || payrollState?.approvedAt || '—',
        actionLabel: actionLabelForStatus(status),
        actionRoute: !status ? 'init' : (status === 'draft' || status === 'time_saved' ? 'timesheet' : 'payroll'),
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
    onSelectEmployee: (id: string) => {
      setDraftEmployee(null)
      selectEmployee(id)
    },
    onCreateEmployee: () => {
      setError('')
      setInfo('')
      setDraftEmployee(normalizeEmployeeSettings({ id: '' }))
      selectEmployee(null)
    },
    onEmployeeChange: (field: keyof EmployeeSettings, value: string | number | boolean) => {
      if (!activeEmployee) return
      setDraftEmployee({ ...activeEmployee, [field]: value } as EmployeeSettings)
    },
    onSaveEmployee: async () => {
      if (!activeEmployee) return
      if (!activeEmployee.name || !activeEmployee.employmentStartDate || !activeEmployee.baseSalary) {
        setError('Vyplňte jméno, datum nástupu a základní mzdu.')
        return
      }
      setError('')
      if (!activeEmployee.id) {
        const newId = makeEmployeeId()
        const created = normalizeEmployeeSettings({ ...activeEmployee, id: newId })
        try {
          await createEmployeeApi(created)
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : 'Zaměstnance se nepodařilo uložit.')
          return
        }
        createEmployee(created)
        setDraftEmployee(null)
        setInfo('Zaměstnanec byl uložen.')
        return
      }

      try {
        await updateEmployeeApi(activeEmployee.id, activeEmployee)
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Zaměstnance se nepodařilo uložit.')
        return
      }
      updateEmployee(activeEmployee.id, activeEmployee)
      setDraftEmployee(null)
      setInfo('Změny zaměstnance byly uloženy.')
    },
    onArchiveEmployee: (id: string) => archiveEmployee(id),
    onInitMonth: (month: string) => {
      if (!activeEmployee?.id) return
      initEmployeeMonth(activeEmployee.id, month)
      setCurrentMonth(month)
      setSection('timesheet')
    },
    onOpenMonth: (month: string) => {
      if (!activeEmployee?.id) return
      initEmployeeMonth(activeEmployee.id, month)
      setCurrentMonth(month)
      const status = monthStatusByEmployee[activeEmployee.id]?.[month]
      if (status === 'draft' || status === 'time_saved' || !status) {
        setSection('timesheet')
        return
      }
      setSection('payroll')
    },
  }
}
