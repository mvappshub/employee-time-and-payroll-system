import { useEffect, useMemo } from 'react'
import { useStore } from './store'
import { calculateMonthDays, calcMonthlySummary, formatDateCZ, isWeekend } from './calc'
import type { ShiftType, TimeRecord } from './types'

const SHIFTS: ShiftType[] = ['', 'ranní', 'odpolední', 'noční', 'přesčas', 'volno', 'dovolená', 'nemoc']
const n = (v: number) => v === 0 ? '' : v.toFixed(1)

export default function TimeSheet() {
  const emp = useStore(s => s.employee)
  const records = useStore(s => s.records)
  const holidays = useStore(s => s.holidays)
  const month = useStore(s => s.currentMonth)
  const setMonth = useStore(s => s.setCurrentMonth)
  const initMonth = useStore(s => s.initMonth)
  const updateRecord = useStore(s => s.updateRecord)
  const resetMonth = useStore(s => s.resetMonth)
  const payInputs = useStore(s => s.paySlipInputs)

  useEffect(() => { initMonth(month) }, [month, initMonth])

  const recs = records[month] || []
  const pi = payInputs[month] || { manualReward: 0, unworked: 0, sickCarryoverDays: 0 }
  const calcs = useMemo(() => calculateMonthDays(recs, emp, holidays, pi.sickCarryoverDays), [recs, emp, holidays, pi.sickCarryoverDays])
  const sum = useMemo(() => calcMonthlySummary(calcs), [calcs])

  const handleShift = (i: number, shift: string) => {
    const u: Partial<TimeRecord> = { shift: shift as ShiftType }
    if (['volno', 'dovolená', 'nemoc', ''].includes(shift)) {
      u.arrival = ''; u.departure = ''
    } else if (shift === 'ranní') {
      u.arrival = emp.shiftStart; u.departure = emp.shiftEnd
    }
    updateRecord(month, i, u)
  }

  const sel = 'bg-transparent outline-none text-xs w-full cursor-pointer'
  const ti = 'bg-transparent outline-none text-xs w-16'

  return (
    <div className="text-xs">
      <div className="flex items-center gap-3 mb-1">
        <span className="font-bold text-sm">Evidence</span>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border-b border-gray-300 outline-none bg-transparent text-xs" />
        <span className="text-blue-600 cursor-pointer select-none" onClick={() => resetMonth(month)}>reset</span>
      </div>
      <div className="flex gap-6 mb-2 text-xs text-gray-700">
        <span>Pracovní dny: <strong>{sum.calendarWorkDays}</strong></span>
        <span>Volné dny: <strong>{sum.freeDaysInMonth}</strong></span>
        <span>Svátky: <strong>{sum.holidayDaysInMonth}</strong></span>
        <span>Fond hodin: <strong>{sum.monthlyFundHours.toFixed(1)}</strong></span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-[11px] border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-400">
              {['Den','Datum','Směna','Příchod','Odchod','Přest.','Odprac.','Plán','Sv.kr.',
                'Dovol.','Nemoc','Noční','Víkend','Svátek','Přesčas','Saldo','Svátek/pozn.'].map(h =>
                <th key={h} className="font-normal text-gray-600 px-0.5 text-left">{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {calcs.map((c, i) => {
              const r = recs[i]
              if (!r) return null
              const we = isWeekend(c.date)
              const bg = c.isHoliday ? 'bg-amber-50' : we ? 'bg-gray-100' : (i % 2 ? 'bg-gray-50' : '')
              return (
                <tr key={c.date} className={bg}>
                  <td className={`px-0.5 ${we ? 'font-bold' : ''}`}>{c.dayName}</td>
                  <td className="px-0.5">{formatDateCZ(c.date)}</td>
                  <td className="px-0.5">
                    <select value={r.shift} onChange={e => handleShift(i, e.target.value)} className={sel}>
                      {SHIFTS.map(s => <option key={s} value={s}>{s || '—'}</option>)}
                    </select>
                  </td>
                  <td className="px-0.5">
                    {['volno', 'dovolená', 'nemoc', ''].includes(r.shift) ? '' :
                      <input type="time" value={r.arrival} onChange={e => updateRecord(month, i, { arrival: e.target.value })} className={ti} />}
                  </td>
                  <td className="px-0.5">
                    {['volno', 'dovolená', 'nemoc', ''].includes(r.shift) ? '' :
                      <input type="time" value={r.departure} onChange={e => updateRecord(month, i, { departure: e.target.value })} className={ti} />}
                  </td>
                  <td className="px-0.5 text-right">{n(c.breakHours)}</td>
                  <td className="px-0.5 text-right font-medium">{n(c.worked)}</td>
                  <td className="px-0.5 text-right">{c.planHours > 0 ? c.planHours.toFixed(1) : ''}</td>
                  <td className="px-0.5 text-right">{n(c.holidayCredit)}</td>
                  <td className="px-0.5 text-right">{n(c.vacation)}</td>
                  <td className="px-0.5 text-right">{n(c.sick)}</td>
                  <td className="px-0.5 text-right">{n(c.nightHours)}</td>
                  <td className="px-0.5 text-right">{n(c.weekendHours)}</td>
                  <td className="px-0.5 text-right">{n(c.holidayTotal)}</td>
                  <td className="px-0.5 text-right">{n(c.overtime)}</td>
                  <td className={`px-0.5 text-right ${c.saldo < 0 ? 'text-red-600' : c.saldo > 0 ? 'text-green-700' : ''}`}>
                    {c.saldo !== 0 ? (c.saldo > 0 ? '+' : '') + c.saldo.toFixed(1) : ''}
                  </td>
                  <td className="px-0.5 text-[10px] text-gray-500 max-w-[120px] truncate">{c.holidayName}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-400 font-bold">
              <td className="px-0.5" colSpan={5}>Σ celkem</td>
              <td className="px-0.5 text-right"></td>
              <td className="px-0.5 text-right">{sum.workedHours.toFixed(1)}</td>
              <td className="px-0.5 text-right">{sum.workHoursWH.toFixed(1)}</td>
              <td className="px-0.5 text-right">{n(sum.totalHolidayCredit)}</td>
              <td className="px-0.5 text-right">{n(sum.totalVacation)}</td>
              <td className="px-0.5 text-right">{n(sum.totalSick)}</td>
              <td className="px-0.5 text-right">{n(sum.totalNight)}</td>
              <td className="px-0.5 text-right">{n(sum.totalWeekend)}</td>
              <td className="px-0.5 text-right">{n(sum.totalHolidayTotal)}</td>
              <td className="px-0.5 text-right">{n(sum.totalOvertime)}</td>
              <td className={`px-0.5 text-right ${sum.totalSaldo < 0 ? 'text-red-600' : sum.totalSaldo > 0 ? 'text-green-700' : ''}`}>
                {sum.totalSaldo !== 0 ? (sum.totalSaldo > 0 ? '+' : '') + sum.totalSaldo.toFixed(1) : '0.0'}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
