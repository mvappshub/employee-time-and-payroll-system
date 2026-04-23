import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmployeeSettings, TimeRecord, Holiday, ShiftType, PaySlipInputs, EmploymentType } from './types'

const LEGACY_EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType> = {
  HPP: 'pracovni_pomer',
}
import { getDaysInMonth, isWeekend } from './calc'
import { mergeHolidayYears } from './holidayCalendar'

const defaultEmployee: EmployeeSettings = {
  name: '', employmentType: 'pracovni_pomer', remunerationType: 'mzda', employmentStartDate: '2026-01-01', workload: 1,
  weeklyHours: 40, workDaysPerWeek: 5,
  weekendWorking: false,
  shiftStart: '06:00', shiftEnd: '14:30', standardBreak: 0.5,
  nightWorkAllowed: true, nightFrom: '22:00', nightTo: '06:00',
  overtimeAllowed: true,
  baseSalary: 30000, personalBonus: 0.25,
  nightSurcharge: 0.10, weekendSurcharge: 0.10,
  holidaySurcharge: 1.00, overtimeSurcharge: 0.25,
  sickCompensation: 0.60,
  holidayCompensationMode: 'time-off',
  overtimeCompensationMode: 'premium',
}

const now = new Date()
const currentYear = now.getFullYear()
const defaultHolidays: Holiday[] = mergeHolidayYears([], [currentYear, currentYear + 1])
const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

function yearFromMonth(month: string): number {
  return parseInt(month.split('-')[0], 10)
}

function buildEmptyMonthRecords(month: string): TimeRecord[] {
  return getDaysInMonth(month).map(date => ({
    date,
    shift: '',
    arrival: '',
    departure: '',
  }))
}

function buildPrefilledMonthRecords(month: string, employee: EmployeeSettings): TimeRecord[] {
  return getDaysInMonth(month).map(date => ({
    date,
    shift: (isWeekend(date) ? 'volno' : 'ranní') as ShiftType,
    arrival: isWeekend(date) ? '' : employee.shiftStart,
    departure: isWeekend(date) ? '' : employee.shiftEnd,
  }))
}

function normalizeEmployeeSettings(employee?: Partial<EmployeeSettings>): EmployeeSettings {
  return {
    ...defaultEmployee,
    ...employee,
  }
}

const defaultPaySlipInputs: PaySlipInputs = {
  manualReward: 0,
  includeManualRewardInAverage: false,
  unworked: 0,
  sickCarryoverDays: 0,
}

function normalizePaySlipInputs(paySlipInputs?: Partial<PaySlipInputs>): PaySlipInputs {
  return {
    ...defaultPaySlipInputs,
    ...paySlipInputs,
  }
}

interface Store {
  employee: EmployeeSettings
  records: Record<string, TimeRecord[]>
  holidays: Holiday[]
  currentMonth: string
  paySlipInputs: Record<string, PaySlipInputs>
  monthStatus: Record<string, 'empty' | 'loaded' | 'prefilled' | 'saved' | 'modified'>
  section: 'employee' | 'timesheet' | 'payslip' | 'holidays'
  setEmployee: (u: Partial<EmployeeSettings>) => void
  setSection: (s: Store['section']) => void
  setCurrentMonth: (m: string) => void
  initMonth: (m: string) => void
  prefillMonth: (m: string) => void
  hydrateMonth: (m: string, data: { employee: EmployeeSettings; records: TimeRecord[]; paySlipInputs: PaySlipInputs }) => void
  updateRecord: (month: string, idx: number, u: Partial<TimeRecord>) => void
  setPaySlipInput: (month: string, u: Partial<PaySlipInputs>) => void
  setMonthStatus: (month: string, status: Store['monthStatus'][string]) => void
  addHoliday: (h: Holiday) => void
  removeHoliday: (i: number) => void
  updateHoliday: (i: number, h: Holiday) => void
  resetMonth: (m: string) => void
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      employee: defaultEmployee,
      records: {},
      holidays: defaultHolidays,
      currentMonth: currentYM,
      paySlipInputs: {},
      monthStatus: {},
      section: 'employee',

      setEmployee: (u) => set(s => {
        const migrated = { ...u }
        if (migrated.employmentType && LEGACY_EMPLOYMENT_TYPE_MAP[migrated.employmentType]) {
          migrated.employmentType = LEGACY_EMPLOYMENT_TYPE_MAP[migrated.employmentType]
        }
        return { employee: normalizeEmployeeSettings({ ...s.employee, ...migrated }) }
      }),
      setSection: (section) => set({ section }),
      setCurrentMonth: (m) => {
        set(s => ({ currentMonth: m, holidays: mergeHolidayYears(s.holidays, [yearFromMonth(m)]) }))
        get().initMonth(m)
      },
      initMonth: (m) => {
        const st = get()
        const nextHolidays = mergeHolidayYears(st.holidays, [yearFromMonth(m)])
        if (nextHolidays.length !== st.holidays.length) set({ holidays: nextHolidays })
        if (st.records[m]) return
        set({
          records: { ...st.records, [m]: buildEmptyMonthRecords(m) },
          paySlipInputs: { ...st.paySlipInputs, [m]: normalizePaySlipInputs(st.paySlipInputs[m]) },
          monthStatus: { ...st.monthStatus, [m]: 'empty' },
        })
      },
      prefillMonth: (m) => {
        const st = get()
        set({
          records: { ...st.records, [m]: buildPrefilledMonthRecords(m, st.employee) },
          paySlipInputs: { ...st.paySlipInputs, [m]: normalizePaySlipInputs(st.paySlipInputs[m]) },
          monthStatus: { ...st.monthStatus, [m]: 'prefilled' },
        })
      },
      hydrateMonth: (m, data) => {
        set(s => ({
          employee: normalizeEmployeeSettings(data.employee),
          records: { ...s.records, [m]: data.records },
          paySlipInputs: { ...s.paySlipInputs, [m]: normalizePaySlipInputs(data.paySlipInputs) },
          monthStatus: { ...s.monthStatus, [m]: 'loaded' },
        }))
      },
      resetMonth: (m) => {
        const st = get()
        const nextHolidays = mergeHolidayYears(st.holidays, [yearFromMonth(m)])
        set({
          holidays: nextHolidays,
          records: { ...st.records, [m]: buildEmptyMonthRecords(m) },
          paySlipInputs: { ...st.paySlipInputs, [m]: defaultPaySlipInputs },
          monthStatus: { ...st.monthStatus, [m]: 'empty' },
        })
      },
      updateRecord: (month, idx, u) => {
        const st = get()
        const recs = [...(st.records[month] || [])]
        if (recs[idx]) {
          recs[idx] = { ...recs[idx], ...u }
          set({
            records: { ...st.records, [month]: recs },
            monthStatus: { ...st.monthStatus, [month]: 'modified' },
          })
        }
      },
      setPaySlipInput: (month, u) => {
        const st = get()
        const ex = normalizePaySlipInputs(st.paySlipInputs[month])
        set({
          paySlipInputs: { ...st.paySlipInputs, [month]: normalizePaySlipInputs({ ...ex, ...u }) },
          monthStatus: { ...st.monthStatus, [month]: 'modified' },
        })
      },
      setMonthStatus: (month, status) => {
        set(s => ({ monthStatus: { ...s.monthStatus, [month]: status } }))
      },
      addHoliday: (h) => set(s => ({ holidays: [...s.holidays, h].sort((a, b) => a.date.localeCompare(b.date)) })),
      removeHoliday: (i) => set(s => ({ holidays: s.holidays.filter((_, idx) => idx !== i) })),
      updateHoliday: (i, h) => set(s => ({ holidays: s.holidays.map((old, idx) => idx === i ? h : old) })),
    }),
    {
      name: 'work-evidence-v1',
      version: 4,
      migrate: (persisted) => {
        const state = persisted as Partial<Store> | undefined
        return {
          ...state,
          employee: normalizeEmployeeSettings(state?.employee),
          // Older versions auto-prefilled many months and persisted them.
          // Drop month-level data once so the new empty-by-default model is real.
          records: {},
          paySlipInputs: Object.fromEntries(
            Object.entries(state?.paySlipInputs || {}).map(([month, inputs]) => [month, normalizePaySlipInputs(inputs)])
          ),
          monthStatus: {},
          currentMonth: state?.currentMonth || currentYM,
        } as Store
      },
    }
  )
)
