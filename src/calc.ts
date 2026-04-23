import type { EmployeeSettings, TimeRecord, Holiday, ShiftType } from './types'

export function timeToDecimal(time: string): number | null {
  if (!time || !time.includes(':')) return null
  const [h, m] = time.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h + m / 60
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  return day === 0 || day === 6
}

export function getDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][d.getDay()]
}

export function getDaysInMonth(ym: string): string[] {
  const [y, m] = ym.split('-').map(Number)
  const count = new Date(y, m, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const d = String(i + 1).padStart(2, '0')
    return `${y}-${String(m).padStart(2, '0')}-${d}`
  })
}

export function calcCalendarWorkDays(ym: string, holidays: Holiday[], weekendWorking: boolean): { days: number; hours: number; dailyFund: number } {
  const daysInMonth = getDaysInMonth(ym)
  const workDays = daysInMonth.filter(d => {
    if (isWeekend(d)) return false
    return true
  })
  const holidayDates = new Set(holidays.map(h => h.date))
  const workDaysExHolidays = workDays.filter(d => !holidayDates.has(d))
  return {
    days: workDaysExHolidays.length,
    hours: workDaysExHolidays.length * (workDaysExHolidays.length > 0 ? 8 : 0),
    dailyFund: 8,
  }
}

export function formatDateCZ(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(d)}.${parseInt(m)}.`
}

function calcRawDuration(arrival: string, departure: string): number {
  const a = timeToDecimal(arrival)
  const d = timeToDecimal(departure)
  if (a === null || d === null) return 0
  let dep = d
  if (dep < a) dep += 24
  return Math.max(0, dep - a)
}

function calcBreak(shift: ShiftType, arrival: string, departure: string, standardBreak: number): number {
  if (!['ranní', 'odpolední', 'noční', 'přesčas'].includes(shift)) return 0
  return calcRawDuration(arrival, departure) >= 6 ? standardBreak : 0
}

function calcWorked(arrival: string, departure: string, brk: number): number {
  return Math.max(0, calcRawDuration(arrival, departure) - brk)
}

function findHoliday(dateStr: string, holidays: Holiday[]): Holiday | undefined {
  return holidays.find(h => h.date === dateStr)
}

function calcPlanHours(shift: ShiftType, dateStr: string, weekendWorking: boolean, dailyFund: number): number {
  if (shift === 'volno' || shift === '' || shift === 'přesčas') return 0
  if (isWeekend(dateStr) && !weekendWorking) return 0
  return dailyFund
}

function calcHolidayCredit(isHol: boolean, worked: number, holidayAsFund: boolean, dailyFund: number, shift: ShiftType): number {
  if (isHol && worked === 0 && holidayAsFund && !['volno', 'dovolená', 'nemoc', ''].includes(shift)) return dailyFund
  return 0
}

function calcNightHours(arrival: string, departure: string, nightFrom: string, nightTo: string, allowed: boolean): number {
  if (!allowed) return 0
  const a = timeToDecimal(arrival)
  const d = timeToDecimal(departure)
  const nf = timeToDecimal(nightFrom)
  const nt = timeToDecimal(nightTo)
  if (a === null || d === null || nf === null || nt === null) return 0
  let dep = d
  if (dep < a) dep += 24
  const zones: [number, number][] = []
  if (nf > nt) {
    zones.push([0, nt], [nf, 24], [24, 24 + nt], [24 + nf, 48])
  } else {
    zones.push([nf, nt], [24 + nf, 24 + nt])
  }
  let total = 0
  for (const [zs, ze] of zones) {
    total += Math.max(0, Math.min(dep, ze) - Math.max(a, zs))
  }
  return total
}

export interface DayCalc {
  date: string
  dayName: string
  shift: ShiftType
  arrival: string
  departure: string
  breakHours: number
  worked: number
  isHoliday: boolean
  holidayName: string
  planHours: number
  holidayCredit: number
  holidayWorked: number
  vacation: number
  sick: number
  nightHours: number
  weekendHours: number
  holidayTotal: number
  overtime: number
  recognizedHours: number
  saldo: number
  creditedAbsence: number
  rawPlanHours: number
}

export function calculateDay(rec: TimeRecord, emp: EmployeeSettings, holidays: Holiday[]): DayCalc {
  const dailyFund = emp.workDaysPerWeek > 0 ? emp.weeklyHours / emp.workDaysPerWeek : 0
  const brk = calcBreak(rec.shift, rec.arrival, rec.departure, emp.standardBreak)
  const worked = calcWorked(rec.arrival, rec.departure, brk)
  const hol = findHoliday(rec.date, holidays)
  const isHol = !!hol
  const rawPlanH = calcPlanHours(rec.shift, rec.date, emp.weekendWorking, dailyFund)
  const planH = (isHol && worked === 0) ? 0 : rawPlanH
  const holCredit = calcHolidayCredit(isHol, worked, emp.holidayAsFund, dailyFund, rec.shift)
  const holWorked = isHol ? worked : 0
  const vac = rec.shift === 'dovolená' && emp.vacationAsFund && !(isHol && worked === 0) ? dailyFund : 0
  const sick = rec.shift === 'nemoc' && emp.sickAsFund ? dailyFund : 0
  const night = calcNightHours(rec.arrival, rec.departure, emp.nightFrom, emp.nightTo, emp.nightWorkAllowed)
  const weekend = isWeekend(rec.date) ? worked : 0
  const holTotal = isHol && worked > 0 ? worked : (isHol && worked === 0 ? holCredit : 0)
  const ot = emp.overtimeAllowed
    ? (
      rec.shift === 'přesčas'
        ? worked
        : planH === 0
          ? worked
          : (worked > planH ? worked - planH : 0)
    )
    : 0
  const recognized = worked + holCredit + vac + sick
  const creditedAbsence = vac + sick
  const saldo = worked + creditedAbsence - planH

  return {
    date: rec.date, dayName: getDayName(rec.date), shift: rec.shift,
    arrival: rec.arrival, departure: rec.departure,
    breakHours: brk, worked, isHoliday: isHol, holidayName: hol?.name || '',
    planHours: planH, rawPlanHours: rawPlanH, holidayCredit: holCredit, holidayWorked: holWorked,
    vacation: vac, sick, nightHours: night, weekendHours: weekend,
    holidayTotal: holTotal, overtime: ot, recognizedHours: recognized, saldo, creditedAbsence,
  }
}

function isNextCalendarDay(previousDate: string, nextDate: string): boolean {
  const prev = new Date(previousDate + 'T12:00:00')
  const next = new Date(nextDate + 'T12:00:00')
  return next.getTime() - prev.getTime() === 24 * 60 * 60 * 1000
}

export function calculateMonthDays(records: TimeRecord[], emp: EmployeeSettings, holidays: Holiday[], sickCarryoverDays = 0): DayCalc[] {
  const days = records.map(record => calculateDay(record, emp, holidays))
  let sickStreakDay = sickCarryoverDays

  return days.map((day, index) => {
    const current = records[index]
    const previous = records[index - 1]
    const continuesSickStreak =
      current?.shift === 'nemoc' &&
      previous?.shift === 'nemoc' &&
      isNextCalendarDay(previous.date, current.date)

    if (current?.shift !== 'nemoc') {
      sickStreakDay = 0
      return day
    }

    sickStreakDay = continuesSickStreak
      ? sickStreakDay + 1
      : (index === 0 && sickCarryoverDays > 0 ? sickCarryoverDays + 1 : 1)
    const compensatedSickHours = sickStreakDay <= 14 ? day.sick : 0
    const creditedAbsence = compensatedSickHours + day.vacation
    const recognizedHours = day.worked + day.holidayCredit + creditedAbsence
    const saldo = day.worked + creditedAbsence - day.planHours

    return {
      ...day,
      sick: compensatedSickHours,
      recognizedHours,
      creditedAbsence,
      saldo,
    }
  })
}

export interface MonthlySummary {
  workDaysWH: number
  workHoursWH: number
  workedDays: number
  workedHours: number
  totalHolidayCredit: number
  totalHolidayWorked: number
  totalVacation: number
  totalSick: number
  totalNight: number
  totalWeekend: number
  totalHolidayTotal: number
  totalOvertime: number
  totalRecognized: number
  totalSaldo: number
  holidayDaysInMonth: number
  freeDaysInMonth: number
  calendarWorkDays: number
  calendarWorkHours: number
  monthlyFundHours: number
}

export function calcMonthlySummary(days: DayCalc[]): MonthlySummary {
  const s = (fn: (d: DayCalc) => number) => days.reduce((a, d) => a + fn(d), 0)
  const calendarWorkDays = days.filter(d => d.planHours > 0).length
  const calendarWorkHours = s(d => d.planHours)
  const monthlyFundHours = s(d => d.rawPlanHours)
  return {
    workDaysWH: calendarWorkDays,
    workHoursWH: calendarWorkHours,
    workedDays: days.filter(d => d.worked > 0).length,
    workedHours: s(d => d.worked),
    totalHolidayCredit: s(d => d.holidayCredit),
    totalHolidayWorked: s(d => d.holidayWorked),
    totalVacation: s(d => d.vacation),
    totalSick: s(d => d.sick),
    totalNight: s(d => d.nightHours),
    totalWeekend: s(d => d.weekendHours),
    totalHolidayTotal: s(d => d.holidayTotal),
    totalOvertime: s(d => d.overtime),
    totalRecognized: s(d => d.recognizedHours),
    totalSaldo: s(d => d.saldo),
    holidayDaysInMonth: days.filter(d => d.isHoliday).length,
    freeDaysInMonth: days.filter(d => d.planHours === 0).length,
    calendarWorkDays,
    calendarWorkHours,
    monthlyFundHours,
  }
}

export interface PaySlipCalc {
  dailyFund: number
  personalBonusBase: number
  hourlyRate: number
  averageHourlyEarnings: number
  holidaySurchargeRate: number
  nightSurchargeRate: number
  weekendSurchargeRate: number
  baseSalaryCalc: number
  personalBonusCalc: number
  nightSurchargeCalc: number
  weekendSurchargeCalc: number
  holidaySurchargeCalc: number
  holidayCompLeaveHours: number
  overtimeSurchargeCalc: number
  overtimeCompLeaveHours: number
  unworkedCalc: number
  unworkedDays: number
  vacationCalc: number
  vacationDays: number
  sickHourlyBasis: number
  sickCalc: number
  sickDays: number
  hrubaMzda: number
  contributionBase: number
  healthEmployee: number
  healthEmployer: number
  socialEmployee: number
  socialEmployer: number
  taxBase: number
  taxBeforeCredits: number
  taxAfterCredits: number
  zpPrac: number
  zpFirma: number
  spPrac: number
  spFirma: number
  zakladDane: number
  dan: number
  danSleva: number
  slevaPoplatnika: number
  cistaMzda: number
  prumHodinovy: number
  prumDenni: number
  celkemOdpracNeodprac: number
  saldoMesic: number
}

export function roundUpToWholeCrown(value: number): number {
  return Math.ceil(value)
}

function roundUpToNextHundred(value: number): number {
  return Math.ceil(value / 100) * 100
}

export function roundTaxBase(value: number): number {
  if (value <= 0) return 0
  if (value <= 100) return roundUpToWholeCrown(value)
  return roundUpToNextHundred(value)
}

export function calcMonthlyTaxBeforeCredits(taxBase: number): number {
  if (taxBase <= 0) return 0
  // 2026 monthly threshold from Financial Administration guidance:
  // 3x average monthly wage = 146 901 CZK.
  const threshold2026 = 146_901
  if (taxBase <= threshold2026) return roundUpToWholeCrown(taxBase * 0.15)
  const lowBand = threshold2026 * 0.15
  const highBand = (taxBase - threshold2026) * 0.23
  return roundUpToWholeCrown(lowBand + highBand)
}

function getMinimumNightSurcharge(emp: EmployeeSettings): number {
  // MPSV/TREXIMA: § 116 mzda >= 10 %, § 125 plat = 20 %.
  return emp.remunerationType === 'plat' ? 0.2 : 0.1
}

function getMinimumWeekendSurcharge(emp: EmployeeSettings): number {
  // MPSV/TREXIMA: § 118 mzda >= 10 %, § 126 plat = 25 %.
  return emp.remunerationType === 'plat' ? 0.25 : 0.1
}

function getMinimumHolidaySurcharge(): number {
  // MPSV/TREXIMA: paid holiday premium is 100 % of average earnings when
  // compensatory time off is not provided.
  return 1
}

export function calcPaySlip(emp: EmployeeSettings, sum: MonthlySummary, manualReward: number, unworked: number): PaySlipCalc {
  const dailyFund = emp.workDaysPerWeek > 0 ? emp.weeklyHours / emp.workDaysPerWeek : 0
  const whwh = sum.workHoursWH
  const hr = whwh > 0 ? emp.baseSalary / whwh : 0
  const averageHourlyEarnings = emp.probableAverageHourlyEarnings > 0 ? emp.probableAverageHourlyEarnings : hr
  const holidaySurchargeRate = Math.max(emp.holidaySurcharge, getMinimumHolidaySurcharge())
  const nightSurchargeRate = Math.max(emp.nightSurcharge, getMinimumNightSurcharge(emp))
  const weekendSurchargeRate = Math.max(emp.weekendSurcharge, getMinimumWeekendSurcharge(emp))
  const ratio = whwh > 0 ? (sum.workedHours + sum.totalHolidayCredit) / whwh : 0

  const baseSalaryCalc = ratio * emp.baseSalary
  const personalBonusCalc = ratio * emp.baseSalary * emp.personalBonus
  const nightSurchargeCalc = averageHourlyEarnings * sum.totalNight * nightSurchargeRate
  const weekendSurchargeCalc = averageHourlyEarnings * sum.totalWeekend * weekendSurchargeRate
  const holidaySurchargeCalc = emp.holidayCompensationMode === 'premium'
    ? averageHourlyEarnings * sum.totalHolidayWorked * holidaySurchargeRate
    : 0
  const holidayCompLeaveHours = emp.holidayCompensationMode === 'time-off' ? sum.totalHolidayWorked : 0
  const overtimeSurchargeCalc = emp.overtimeCompensationMode === 'premium'
    ? averageHourlyEarnings * sum.totalOvertime * emp.overtimeSurcharge
    : 0
  const overtimeCompLeaveHours = emp.overtimeCompensationMode === 'time-off' ? sum.totalOvertime : 0
  const unworkedCalc = hr * unworked
  const vacationCalc = averageHourlyEarnings * sum.totalVacation
  const sickHourlyBasis = emp.reducedAverageHourlyEarnings > 0 ? emp.reducedAverageHourlyEarnings : averageHourlyEarnings
  const sickCalc = sickHourlyBasis * sum.totalSick * emp.sickCompensation

  const hrubaMzda = Math.max(
    0,
    baseSalaryCalc +
      personalBonusCalc +
      nightSurchargeCalc +
      weekendSurchargeCalc +
      holidaySurchargeCalc +
      overtimeSurchargeCalc +
      manualReward +
      vacationCalc -
      unworkedCalc
  )

  // VZP/CSSZ methodology: statutory employer DPN compensation is paid to the
  // employee, but it does not form the standard payroll contribution base.
  const contributionBase = hrubaMzda
  const healthEmployee = roundUpToWholeCrown(contributionBase * 0.045)
  const healthEmployer = roundUpToWholeCrown(contributionBase * 0.09)
  const socialEmployee = roundUpToWholeCrown(contributionBase * 0.071)
  const socialEmployer = roundUpToWholeCrown(contributionBase * 0.248)
  const taxBase = roundTaxBase(hrubaMzda)
  const taxBeforeCredits = calcMonthlyTaxBeforeCredits(taxBase)
  const slevaPoplatnika = 2570
  const taxAfterCredits = Math.max(taxBeforeCredits - slevaPoplatnika, 0)
  const cistaMzda = hrubaMzda - healthEmployee - socialEmployee - taxAfterCredits + sickCalc
  const prumHodinovy = averageHourlyEarnings
  const prumDenni = dailyFund > 0 ? prumHodinovy * dailyFund : 0
  const celkemOdpracNeodprac = sum.totalRecognized
  const saldoMesic = sum.totalSaldo

  return {
    dailyFund, personalBonusBase: emp.baseSalary * emp.personalBonus,
    averageHourlyEarnings,
    holidaySurchargeRate,
    nightSurchargeRate,
    weekendSurchargeRate,
    hourlyRate: hr, baseSalaryCalc, personalBonusCalc,
    nightSurchargeCalc, weekendSurchargeCalc, holidaySurchargeCalc, holidayCompLeaveHours, overtimeSurchargeCalc, overtimeCompLeaveHours,
    unworkedCalc, unworkedDays: dailyFund > 0 ? unworked / dailyFund : 0,
    vacationCalc, vacationDays: dailyFund > 0 ? sum.totalVacation / dailyFund : 0,
    sickHourlyBasis,
    sickCalc, sickDays: dailyFund > 0 ? sum.totalSick / dailyFund : 0,
    hrubaMzda,
    contributionBase,
    healthEmployee,
    healthEmployer,
    socialEmployee,
    socialEmployer,
    taxBase,
    taxBeforeCredits,
    taxAfterCredits,
    // Backward-compatible aliases for existing UI/state.
    zpPrac: contributionBase,
    zpFirma: healthEmployer,
    spPrac: socialEmployee,
    spFirma: socialEmployer,
    zakladDane: taxBase,
    dan: taxBeforeCredits,
    danSleva: taxAfterCredits,
    slevaPoplatnika,
    cistaMzda,
    prumHodinovy, prumDenni, celkemOdpracNeodprac, saldoMesic,
  }
}
