import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EmployeeSettings, TimeRecord, Holiday, ShiftType, PaySlipInputs, EmploymentType } from './types'

const LEGACY_EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType> = {
  HPP: 'pracovni_pomer',
}
import { getDaysInMonth, isWeekend } from './calc'
import { mergeHolidayYears } from './holidayCalendar'

const defaultEmployee: EmployeeSettings = {
  name: '', employmentType: 'pracovni_pomer', remunerationType: 'mzda', workload: 1,
  weeklyHours: 40, workDaysPerWeek: 5,
  weekendWorking: false, holidayAsFund: true, vacationAsFund: true, sickAsFund: true,
  shiftStart: '06:00', shiftEnd: '14:30', standardBreak: 0.5,
  nightWorkAllowed: true, nightFrom: '22:00', nightTo: '06:00',
  overtimeAllowed: true,
  baseSalary: 30000, personalBonus: 0.25,
  nightSurcharge: 0.10, weekendSurcharge: 0.10,
  holidaySurcharge: 1.00, overtimeSurcharge: 0.25,
  sickCompensation: 0.60,
  probableAverageHourlyEarnings: 250,
  reducedAverageHourlyEarnings: 190,
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

interface Store {
  employee: EmployeeSettings
  records: Record<string, TimeRecord[]>
  holidays: Holiday[]
  currentMonth: string
  paySlipInputs: Record<string, PaySlipInputs>
  section: 'employee' | 'timesheet' | 'payslip' | 'holidays'
  setEmployee: (u: Partial<EmployeeSettings>) => void
  setSection: (s: Store['section']) => void
  setCurrentMonth: (m: string) => void
  initMonth: (m: string) => void
  updateRecord: (month: string, idx: number, u: Partial<TimeRecord>) => void
  setPaySlipInput: (month: string, u: Partial<PaySlipInputs>) => void
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
      section: 'employee',

      setEmployee: (u) => set(s => {
        const migrated = { ...u }
        if (migrated.employmentType && LEGACY_EMPLOYMENT_TYPE_MAP[migrated.employmentType]) {
          migrated.employmentType = LEGACY_EMPLOYMENT_TYPE_MAP[migrated.employmentType]
        }
        return { employee: { ...s.employee, ...migrated } }
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
        const days = getDaysInMonth(m)
        const recs: TimeRecord[] = days.map(date => ({
          date,
          shift: (isWeekend(date) ? 'volno' : 'ranní') as ShiftType,
          arrival: isWeekend(date) ? '' : st.employee.shiftStart,
          departure: isWeekend(date) ? '' : st.employee.shiftEnd,
        }))
        set({ records: { ...st.records, [m]: recs } })
      },
      resetMonth: (m) => {
        const st = get()
        const nextHolidays = mergeHolidayYears(st.holidays, [yearFromMonth(m)])
        const days = getDaysInMonth(m)
        const recs: TimeRecord[] = days.map(date => ({
          date,
          shift: (isWeekend(date) ? 'volno' : 'ranní') as ShiftType,
          arrival: isWeekend(date) ? '' : st.employee.shiftStart,
          departure: isWeekend(date) ? '' : st.employee.shiftEnd,
        }))
        set({ holidays: nextHolidays, records: { ...st.records, [m]: recs } })
      },
      updateRecord: (month, idx, u) => {
        const st = get()
        const recs = [...(st.records[month] || [])]
        if (recs[idx]) {
          recs[idx] = { ...recs[idx], ...u }
          set({ records: { ...st.records, [month]: recs } })
        }
      },
      setPaySlipInput: (month, u) => {
        const st = get()
        const ex = st.paySlipInputs[month] || { manualReward: 0, unworked: 0, sickCarryoverDays: 0 }
        set({ paySlipInputs: { ...st.paySlipInputs, [month]: { ...ex, ...u } } })
      },
      addHoliday: (h) => set(s => ({ holidays: [...s.holidays, h].sort((a, b) => a.date.localeCompare(b.date)) })),
      removeHoliday: (i) => set(s => ({ holidays: s.holidays.filter((_, idx) => idx !== i) })),
      updateHoliday: (i, h) => set(s => ({ holidays: s.holidays.map((old, idx) => idx === i ? h : old) })),
    }),
    { name: 'work-evidence-v1' }
  )
)
