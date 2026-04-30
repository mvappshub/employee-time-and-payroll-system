import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { invalidateDocument } from '../../domain/documents/builders'
import {
  type EmployeeMonth,
  type EmployeeSettings,
  type EmployerProfile,
  type Holiday,
  type MonthStatus,
  type PaySlipInputs,
  type ShiftType,
  type TimeRecord,
  calculateShiftOperationWeeklyHours,
  normalizeShiftOperationType,
} from '../../domain/shared/types'
import { getDaysInMonth, isWeekend } from '../../domain/payroll/calc'
import { mergeHolidayYears } from '../../domain/calendar/holidayCalendar'
import { isTimeClosedOrLater } from '../../domain/monthWorkflow'
import { defaultPaySlipInputs } from '../../domain/payroll/defaults'

const defaultEmployeeTemplate: EmployeeSettings = {
  id: '',
  name: '',
  employeeNumber: '',
  permanentAddress: '',
  status: 'active',
  employmentType: 'pracovni_pomer',
  employmentStartDate: '2026-01-01',
  employmentEndDate: '',
  contractJobTitle: '',
  contractWorkplace: '',
  contractWorkSchedule: '',
  probationMonths: 3,
  fixedTermEndDate: '',
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
  personalBonus: 0.25,
  nightSurcharge: 0.10,
  weekendSurcharge: 0.10,
  holidaySurcharge: 1.00,
  overtimeSurcharge: 0.25,
  sickCompensation: 0.60,
  holidayCompensationMode: 'time-off',
  overtimeCompensationMode: 'premium',
  appliesHealthMinimumBase: true,
  healthMinimumBaseExceptionReason: '',
  taxDeclarationSigned: false,
  taxpayerCreditApplied: false,
  vacationEntitlementHours: 0,
  vacationUsedHours: 0,
  vacationRemainingHours: 0,
  employmentContractDocument: null,
}

const defaultEmployer: EmployerProfile = {
  name: '',
  ico: '',
  seat: '',
  representativeName: '',
  representativeRole: '',
}

const now = new Date()
const currentYear = now.getFullYear()
const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const defaultHolidays: Holiday[] = mergeHolidayYears([], [currentYear, currentYear + 1])

type PayrollMonthState = Partial<Omit<EmployeeMonth, 'employeeId' | 'month' | 'status' | 'records' | 'paySlipInputs'>> & {
  payrollResult?: EmployeeMonth['payrollResult']
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `emp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function yearFromMonth(month: string): number {
  return parseInt(month.split('-')[0], 10)
}

function normalizeEmployerProfile(employer?: Partial<EmployerProfile>): EmployerProfile {
  return {
    ...defaultEmployer,
    ...employer,
  }
}

export function normalizeEmployeeSettings(employee?: Partial<EmployeeSettings>): EmployeeSettings {
  const shiftOperation = normalizeShiftOperationType(employee?.shiftOperation)
  const workload = typeof employee?.workload === 'number' ? employee.workload : defaultEmployeeTemplate.workload
  const workDaysPerWeek = typeof employee?.workDaysPerWeek === 'number' ? employee.workDaysPerWeek : defaultEmployeeTemplate.workDaysPerWeek
  return {
    ...defaultEmployeeTemplate,
    ...employee,
    id: employee?.id || defaultEmployeeTemplate.id || makeId(),
    employmentType: 'pracovni_pomer',
    status: employee?.status || 'active',
    workload,
    shiftOperation,
    workDaysPerWeek,
    weeklyHours: calculateShiftOperationWeeklyHours(shiftOperation, workDaysPerWeek, workload),
    employmentContractDocument: employee?.employmentContractDocument || null,
  }
}

function normalizePaySlipInputs(paySlipInputs?: Partial<PaySlipInputs>): PaySlipInputs {
  return {
    ...defaultPaySlipInputs,
    ...paySlipInputs,
    unworked: 0,
    sickCarryoverDays: 0,
  }
}

export function buildEmptyMonthRecords(month: string): TimeRecord[] {
  return getDaysInMonth(month).map(date => ({
    date,
    shift: '',
    arrival: '',
    departure: '',
  }))
}

export function buildPrefilledMonthRecords(month: string, employee: EmployeeSettings): TimeRecord[] {
  return getDaysInMonth(month).map(date => ({
    date,
    shift: (isWeekend(date) ? 'volno' : 'ranní') as ShiftType,
    arrival: isWeekend(date) ? '' : employee.shiftStart,
    departure: isWeekend(date) ? '' : employee.shiftEnd,
  }))
}

export function buildInitialEmployeeMonthRecords(month: string, employee?: EmployeeSettings | null): TimeRecord[] {
  return employee ? buildPrefilledMonthRecords(month, employee) : buildEmptyMonthRecords(month)
}

function withEmployeeMonthMap<T>(map: Record<string, Record<string, T>>, employeeId: string): Record<string, T> {
  return map[employeeId] || {}
}

function appendAudit(
  payrollState: PayrollMonthState | undefined,
  action: string,
  note?: string,
): PayrollMonthState {
  return {
    ...payrollState,
    auditTrail: [
      ...(payrollState?.auditTrail || []),
      {
        at: new Date().toISOString(),
        action,
        note,
      },
    ],
  }
}

function invalidateDerivedMonthState(
  payrollState: PayrollMonthState | undefined,
  reason: string,
): PayrollMonthState {
  const nowIso = new Date().toISOString()
  return appendAudit(
    {
      ...payrollState,
      payrollResult: undefined,
      calculationSnapshot: undefined,
      timeSheetDocument: invalidateDocument(payrollState?.timeSheetDocument, reason),
      payslipDocument: invalidateDocument(payrollState?.payslipDocument, reason),
      approvedAt: undefined,
      issuedAt: undefined,
      invalidatedAt: nowIso,
      invalidationReason: reason,
    },
    'invalidate',
    reason,
  )
}

export interface Store {
  employer: EmployerProfile
  employees: EmployeeSettings[]
  selectedEmployeeId: string | null
  recordsByEmployee: Record<string, Record<string, TimeRecord[]>>
  holidays: Holiday[]
  currentMonth: string
  paySlipInputsByEmployee: Record<string, Record<string, PaySlipInputs>>
  monthStatusByEmployee: Record<string, Record<string, MonthStatus>>
  payrollByEmployee: Record<string, Record<string, PayrollMonthState>>
  section: 'employees' | 'time-tracking' | 'payroll' | 'company' | 'holidays'
  setEmployer: (u: Partial<EmployerProfile>) => void
  setSection: (s: Store['section']) => void
  setCurrentMonth: (m: string) => void
  replaceEmployees: (employees: EmployeeSettings[]) => void
  createEmployee: (data: Partial<EmployeeSettings>) => string
  updateEmployee: (employeeId: string, patch: Partial<EmployeeSettings>) => void
  selectEmployee: (employeeId: string | null) => void
  archiveEmployee: (employeeId: string) => void
  initEmployeeMonth: (employeeId: string, month: string) => void
  prefillEmployeeMonth: (employeeId: string, month: string) => void
  saveEmployeeMonth: (employeeId: string, month: string) => void
  closeEmployeeTime: (employeeId: string, month: string) => void
  calculateEmployeePayroll: (employeeId: string, month: string, payload?: PayrollMonthState) => void
  approveEmployeePayroll: (employeeId: string, month: string) => void
  issueEmployeePayslip: (employeeId: string, month: string, payload?: PayrollMonthState) => void
  hydrateEmployeeMonth: (employeeId: string, month: string, data: EmployeeMonth) => void
  updateRecord: (employeeId: string, month: string, idx: number, u: Partial<TimeRecord>) => void
  setPaySlipInput: (employeeId: string, month: string, u: Partial<PaySlipInputs>) => void
  setMonthStatus: (employeeId: string, month: string, status: MonthStatus) => void
  setPayrollMonthState: (employeeId: string, month: string, patch: PayrollMonthState) => void
  addHoliday: (h: Holiday) => void
  removeHoliday: (i: number) => void
  updateHoliday: (i: number, h: Holiday) => void
  resetEmployeeMonth: (employeeId: string, month: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      employer: defaultEmployer,
      employees: [],
      selectedEmployeeId: null,
      recordsByEmployee: {},
      holidays: defaultHolidays,
      currentMonth: currentYM,
      paySlipInputsByEmployee: {},
      monthStatusByEmployee: {},
      payrollByEmployee: {},
      section: 'employees',

      setEmployer: (u) => set(s => ({ employer: normalizeEmployerProfile({ ...s.employer, ...u }) })),
      setSection: (section) => set({ section }),
      setCurrentMonth: (m) => {
        set(s => ({ currentMonth: m, holidays: mergeHolidayYears(s.holidays, [yearFromMonth(m)]) }))
      },
      replaceEmployees: (employees) => set(s => ({
        employees: employees.map(employee => normalizeEmployeeSettings(employee)),
        selectedEmployeeId: s.selectedEmployeeId && employees.some(employee => employee.id === s.selectedEmployeeId)
          ? s.selectedEmployeeId
          : null,
      })),

      createEmployee: (data) => {
        const employee = normalizeEmployeeSettings({ ...data, id: data.id || makeId() })
        set(s => ({
          employees: [...s.employees, employee],
          selectedEmployeeId: employee.id,
          recordsByEmployee: { ...s.recordsByEmployee, [employee.id]: s.recordsByEmployee[employee.id] || {} },
          paySlipInputsByEmployee: { ...s.paySlipInputsByEmployee, [employee.id]: s.paySlipInputsByEmployee[employee.id] || {} },
          monthStatusByEmployee: { ...s.monthStatusByEmployee, [employee.id]: s.monthStatusByEmployee[employee.id] || {} },
          payrollByEmployee: { ...s.payrollByEmployee, [employee.id]: s.payrollByEmployee[employee.id] || {} },
        }))
        return employee.id
      },

      updateEmployee: (employeeId, patch) => set(s => ({
        employees: s.employees.map(employee =>
          employee.id === employeeId ? normalizeEmployeeSettings({ ...employee, ...patch, id: employeeId }) : employee,
        ),
      })),

      selectEmployee: (selectedEmployeeId) => {
        set({ selectedEmployeeId })
      },

      archiveEmployee: (employeeId) => set(s => ({
        employees: s.employees.map(employee =>
          employee.id === employeeId ? { ...employee, status: 'archived' } : employee,
        ),
      })),

      initEmployeeMonth: (employeeId, month) => {
        const state = get()
        const nextHolidays = mergeHolidayYears(state.holidays, [yearFromMonth(month)])
        const employeeRecords = withEmployeeMonthMap(state.recordsByEmployee, employeeId)
        const employeeInputs = withEmployeeMonthMap(state.paySlipInputsByEmployee, employeeId)
        const employeeStatuses = withEmployeeMonthMap(state.monthStatusByEmployee, employeeId)
        const employeePayroll = withEmployeeMonthMap(state.payrollByEmployee, employeeId)
        const employee = state.employees.find(item => item.id === employeeId)
        if (employeeRecords[month]) {
          if (nextHolidays.length !== state.holidays.length) set({ holidays: nextHolidays })
          return
        }
        set({
          holidays: nextHolidays,
          recordsByEmployee: {
            ...state.recordsByEmployee,
            [employeeId]: { ...employeeRecords, [month]: buildInitialEmployeeMonthRecords(month, employee) },
          },
          paySlipInputsByEmployee: {
            ...state.paySlipInputsByEmployee,
            [employeeId]: { ...employeeInputs, [month]: normalizePaySlipInputs(employeeInputs[month]) },
          },
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...employeeStatuses, [month]: 'draft' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...employeePayroll,
              [month]: appendAudit(employeePayroll[month], 'init-month'),
            },
          },
        })
      },

      prefillEmployeeMonth: (employeeId, month) => {
        const state = get()
        const employee = state.employees.find(item => item.id === employeeId)
        if (!employee) return
        const employeeRecords = withEmployeeMonthMap(state.recordsByEmployee, employeeId)
        const employeeInputs = withEmployeeMonthMap(state.paySlipInputsByEmployee, employeeId)
        const employeeStatuses = withEmployeeMonthMap(state.monthStatusByEmployee, employeeId)
        set({
          recordsByEmployee: {
            ...state.recordsByEmployee,
            [employeeId]: { ...employeeRecords, [month]: buildPrefilledMonthRecords(month, employee) },
          },
          paySlipInputsByEmployee: {
            ...state.paySlipInputsByEmployee,
            [employeeId]: { ...employeeInputs, [month]: normalizePaySlipInputs(employeeInputs[month]) },
          },
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...employeeStatuses, [month]: 'draft' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit(withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month], 'prefill-month'),
            },
          },
        })
      },

      saveEmployeeMonth: (employeeId, month) => {
        const state = get()
        const payrollState = withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]
        set({
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: 'time_saved' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit({ ...payrollState, updatedAt: new Date().toISOString() }, 'save-time'),
            },
          },
        })
      },

      closeEmployeeTime: (employeeId, month) => {
        const state = get()
        const nowIso = new Date().toISOString()
        const payrollState = withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]
        set({
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: 'time_closed' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit({ ...payrollState, closedAt: nowIso, updatedAt: nowIso }, 'close-time'),
            },
          },
        })
      },

      calculateEmployeePayroll: (employeeId, month, payload) => {
        const state = get()
        const nowIso = new Date().toISOString()
        const payrollState = withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]
        set({
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: 'payroll_calculated' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit({ ...payrollState, ...payload, updatedAt: nowIso, invalidatedAt: undefined, invalidationReason: undefined }, 'calculate-payroll'),
            },
          },
        })
      },

      approveEmployeePayroll: (employeeId, month) => {
        const state = get()
        const nowIso = new Date().toISOString()
        const payrollState = withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]
        set({
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: 'payroll_approved' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit({ ...payrollState, approvedAt: nowIso, updatedAt: nowIso }, 'approve-payroll'),
            },
          },
        })
      },

      issueEmployeePayslip: (employeeId, month, payload) => {
        const state = get()
        const nowIso = new Date().toISOString()
        const payrollState = withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]
        set({
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: 'payslip_issued' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit({
                ...payrollState,
                ...payload,
                payslipDocument: payload?.payslipDocument || payrollState?.payslipDocument,
                issuedAt: nowIso,
                updatedAt: nowIso,
              }, 'issue-payslip'),
            },
          },
        })
      },

      hydrateEmployeeMonth: (employeeId, month, data) => {
        const state = get()
        set({
          recordsByEmployee: {
            ...state.recordsByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.recordsByEmployee, employeeId),
              [month]: data.records,
            },
          },
          paySlipInputsByEmployee: {
            ...state.paySlipInputsByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.paySlipInputsByEmployee, employeeId),
              [month]: normalizePaySlipInputs(data.paySlipInputs),
            },
          },
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId),
              [month]: data.status,
            },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: {
                timeSummary: data.timeSummary,
                payrollResult: data.payrollResult,
                calculationSnapshot: data.calculationSnapshot,
                auditTrail: data.auditTrail,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
                closedAt: data.closedAt,
                approvedAt: data.approvedAt,
                issuedAt: data.issuedAt,
                invalidatedAt: data.invalidatedAt,
                invalidationReason: data.invalidationReason,
                timeSheetDocument: data.timeSheetDocument,
                payslipDocument: data.payslipDocument,
              },
            },
          },
        })
      },

      updateRecord: (employeeId, month, idx, u) => {
        const state = get()
        const employeeRecords = [...(withEmployeeMonthMap(state.recordsByEmployee, employeeId)[month] || [])]
        if (!employeeRecords[idx]) return
        employeeRecords[idx] = { ...employeeRecords[idx], ...u }
        const previousStatus = withEmployeeMonthMap(state.monthStatusByEmployee, employeeId)[month] || 'draft'
        const nextStatus = previousStatus === 'draft' ? 'draft' : 'time_saved'
        const nextPayrollState = isTimeClosedOrLater(previousStatus)
          ? invalidateDerivedMonthState(withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month], 'Změna evidence po uzavření měsíce.')
          : withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]

        set({
          recordsByEmployee: {
            ...state.recordsByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.recordsByEmployee, employeeId), [month]: employeeRecords },
          },
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: nextStatus },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: nextPayrollState,
            },
          },
        })
      },

      setPaySlipInput: (employeeId, month, u) => {
        const state = get()
        const previousStatus = withEmployeeMonthMap(state.monthStatusByEmployee, employeeId)[month] || 'draft'
        const wasPayrollPhase = isTimeClosedOrLater(previousStatus)
        const nextStatus = wasPayrollPhase
          ? 'time_closed'
          : previousStatus === 'draft'
            ? 'draft'
            : 'time_saved'
        const current = normalizePaySlipInputs(withEmployeeMonthMap(state.paySlipInputsByEmployee, employeeId)[month])
        const nextPayrollState = wasPayrollPhase
          ? invalidateDerivedMonthState(withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month], 'Změna mzdových vstupů po uzavření měsíce.')
          : withEmployeeMonthMap(state.payrollByEmployee, employeeId)[month]
        set({
          paySlipInputsByEmployee: {
            ...state.paySlipInputsByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.paySlipInputsByEmployee, employeeId),
              [month]: normalizePaySlipInputs({ ...current, ...u }),
            },
          },
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: nextStatus },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: nextPayrollState,
            },
          },
        })
      },

      setMonthStatus: (employeeId, month, status) => set(s => ({
        monthStatusByEmployee: {
          ...s.monthStatusByEmployee,
          [employeeId]: { ...withEmployeeMonthMap(s.monthStatusByEmployee, employeeId), [month]: status },
        },
      })),

      setPayrollMonthState: (employeeId, month, patch) => set(s => ({
        payrollByEmployee: {
          ...s.payrollByEmployee,
          [employeeId]: {
            ...withEmployeeMonthMap(s.payrollByEmployee, employeeId),
            [month]: { ...withEmployeeMonthMap(s.payrollByEmployee, employeeId)[month], ...patch },
          },
        },
      })),

      addHoliday: (h) => set(s => ({ holidays: [...s.holidays, h].sort((a, b) => a.date.localeCompare(b.date)) })),
      removeHoliday: (i) => set(s => ({ holidays: s.holidays.filter((_, idx) => idx !== i) })),
      updateHoliday: (i, h) => set(s => ({ holidays: s.holidays.map((old, idx) => idx === i ? h : old) })),

      resetEmployeeMonth: (employeeId, month) => {
        const state = get()
        set({
          recordsByEmployee: {
            ...state.recordsByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.recordsByEmployee, employeeId), [month]: buildEmptyMonthRecords(month) },
          },
          paySlipInputsByEmployee: {
            ...state.paySlipInputsByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.paySlipInputsByEmployee, employeeId), [month]: defaultPaySlipInputs },
          },
          monthStatusByEmployee: {
            ...state.monthStatusByEmployee,
            [employeeId]: { ...withEmployeeMonthMap(state.monthStatusByEmployee, employeeId), [month]: 'draft' },
          },
          payrollByEmployee: {
            ...state.payrollByEmployee,
            [employeeId]: {
              ...withEmployeeMonthMap(state.payrollByEmployee, employeeId),
              [month]: appendAudit(undefined, 'reset-month'),
            },
          },
        })
      },
    }),
    {
      name: 'work-evidence-v2',
      version: 6,
      partialize: (state) => ({
        employer: state.employer,
        holidays: state.holidays,
        currentMonth: state.currentMonth,
        selectedEmployeeId: state.selectedEmployeeId,
        section: state.section,
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<Store> | undefined
        return {
          employer: normalizeEmployerProfile(state?.employer),
          employees: [],
          selectedEmployeeId: null,
          recordsByEmployee: {},
          holidays: state?.holidays || defaultHolidays,
          currentMonth: state?.currentMonth || currentYM,
          paySlipInputsByEmployee: {},
          monthStatusByEmployee: {},
          payrollByEmployee: {},
          section: ['employees', 'time-tracking', 'payroll', 'company', 'holidays'].includes(String(state?.section))
            ? state?.section
            : 'employees',
        } as unknown as Store
      },
    },
  ),
)
