import { useEffect, useMemo } from 'react'
import { useStore } from './store'
import { calculateMonthDays, calcMonthlySummary, calcPaySlip } from './calc'
import { EmploymentTypeLabels } from './types'

const kc = (v: number) => v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const h = (v: number) => v === 0 ? '—' : v.toFixed(1)
const d = (v: number) => v === 0 ? '—' : v.toFixed(1)

export default function PaySlip() {
  const emp = useStore(s => s.employee)
  const records = useStore(s => s.records)
  const holidays = useStore(s => s.holidays)
  const month = useStore(s => s.currentMonth)
  const setMonth = useStore(s => s.setCurrentMonth)
  const initMonth = useStore(s => s.initMonth)
  const payInputs = useStore(s => s.paySlipInputs)
  const setPayInput = useStore(s => s.setPaySlipInput)

  useEffect(() => { initMonth(month) }, [month, initMonth])

  const recs = records[month] || []
  const pi = payInputs[month] || { manualReward: 0, unworked: 0, sickCarryoverDays: 0 }
  const calcs = useMemo(() => calculateMonthDays(recs, emp, holidays, pi.sickCarryoverDays), [recs, emp, holidays, pi.sickCarryoverDays])
  const sum = useMemo(() => calcMonthlySummary(calcs), [calcs])
  const ps = useMemo(() => calcPaySlip(emp, sum, pi.manualReward, pi.unworked), [emp, sum, pi.manualReward, pi.unworked])

  const inp = 'border-b border-gray-300 outline-none bg-transparent text-xs w-20 text-right'
  const monthLabel = (() => {
    const [y, m] = month.split('-')
    const names = ['', 'leden', 'únor', 'březen', 'duben', 'květen', 'červen', 'červenec', 'srpen', 'září', 'říjen', 'listopad', 'prosinec']
    return `${names[parseInt(m)]} ${y}`
  })()

  return (
    <div className="text-xs max-w-2xl">
      <div className="flex items-center gap-3 mb-1">
        <span className="font-bold text-sm">Výplatní páska</span>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border-b border-gray-300 outline-none bg-transparent text-xs" />
      </div>

      <div className="mb-2 text-gray-600">
        {emp.name && <span>{emp.name} · </span>}
        {EmploymentTypeLabels[emp.employmentType] ?? emp.employmentType} · úvazek {emp.workload} · {monthLabel}
      </div>

      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-gray-400">
            <th className="text-left font-normal text-gray-600 w-1/2">Položka</th>
            <th className="text-right font-normal text-gray-600 w-16">h</th>
            <th className="text-right font-normal text-gray-600 w-12">dnů</th>
            <th className="text-right font-normal text-gray-600 w-24">Kč</th>
          </tr>
        </thead>
        <tbody>
          <Row label="Pracovní dny (se svátky)" days={sum.workDaysWH} />
          <Row label="Pracovní hodiny (se svátky)" hrs={sum.workHoursWH} />
          <Row label="Denní fond hodin" hrs={ps.dailyFund} />
          <Row label={`Hodinová sazba`} czk={ps.hourlyRate} />
          <Row label="Průměrný / pravděpod. výdělek" czk={ps.averageHourlyEarnings} />
          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>

          <Row label="Základní mzda" czk={ps.baseSalaryCalc} bold />
          <Row label={`Osobní ohodnocení ${Math.round(emp.personalBonus * 100)}%`} czk={ps.personalBonusCalc} />
          <Row label="Odpracováno" hrs={sum.workedHours} days={sum.workedDays} />
          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>

          <Row label={`Příplatek noční ${Math.round(emp.nightSurcharge * 100)}%`} hrs={sum.totalNight} czk={ps.nightSurchargeCalc} />
          <Row label={`Příplatek víkend ${Math.round(emp.weekendSurcharge * 100)}%`} hrs={sum.totalWeekend} czk={ps.weekendSurchargeCalc} />
          <Row label={`Příplatek svátek ${Math.round(ps.holidaySurchargeRate * 100)}%`} hrs={sum.totalHolidayTotal} czk={ps.holidaySurchargeCalc} />
          <Row label="Náhradní volno za svátek" hrs={ps.holidayCompLeaveHours} />
          <Row label={`Příplatek přesčas ${Math.round(emp.overtimeSurcharge * 100)}%`} hrs={sum.totalOvertime} czk={ps.overtimeSurchargeCalc} />
          <Row label="Náhradní volno za přesčas" hrs={ps.overtimeCompLeaveHours} />
          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>

          <tr>
            <td className="py-0.5">Ruční odměna</td>
            <td></td><td></td>
            <td className="text-right">
              <input type="number" className={inp} value={pi.manualReward}
                onChange={e => setPayInput(month, { manualReward: parseFloat(e.target.value) || 0 })} />
            </td>
          </tr>
          <tr>
            <td className="py-0.5">Neplacené volno / absence</td>
            <td className="text-right">
              <input type="number" className={`${inp} w-14`} value={pi.unworked}
                onChange={e => setPayInput(month, { unworked: parseFloat(e.target.value) || 0 })} />
            </td>
            <td className="text-right text-gray-500">{d(ps.unworkedDays)}</td>
            <td className="text-right">{kc(ps.unworkedCalc)}</td>
          </tr>
          <Row label="Dovolená" hrs={sum.totalVacation} days={ps.vacationDays} czk={ps.vacationCalc} />
          <Row label={`Náhrada DPN od zaměstnavatele ${Math.round(emp.sickCompensation * 100)}%`} hrs={sum.totalSick} days={ps.sickDays} czk={ps.sickCalc} />
          <tr>
            <td className="py-0.5">DPN dny z min. měsíce</td>
            <td className="text-right">
              <input type="number" className={`${inp} w-14`} value={pi.sickCarryoverDays}
                onChange={e => setPayInput(month, { sickCarryoverDays: parseFloat(e.target.value) || 0 })} />
            </td>
            <td></td><td></td>
          </tr>

          <tr className="border-t-2 border-gray-400 font-bold">
            <td className="py-0.5">Hrubá mzda</td>
            <td></td><td></td>
            <td className="text-right">{kc(ps.hrubaMzda)}</td>
          </tr>

          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
          <Row label="Vyměřovací základ ZP/SP" czk={ps.contributionBase} bold />
          <Row label="ZP zaměstnanec (4,5%)" czk={ps.healthEmployee} neg />
          <Row label="ZP zaměstnavatel (9%)" czk={ps.healthEmployer} />
          <Row label="SP zaměstnanec (7,1%)" czk={ps.socialEmployee} neg />
          <Row label="SP zaměstnavatel (24,8%)" czk={ps.socialEmployer} />
          <Row label="Základ pro zálohu na daň" czk={ps.taxBase} />

          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
          <Row label="Záloha na daň před slevou" czk={ps.taxBeforeCredits} neg />
          <Row label="Sleva na poplatníka" czk={ps.slevaPoplatnika} />
          <Row label="Záloha na daň po slevě" czk={ps.taxAfterCredits} neg />

          <tr className="border-t-2 border-gray-400 font-bold text-sm">
            <td className="py-0.5">Čistá mzda</td>
            <td></td><td></td>
            <td className="text-right">{kc(ps.cistaMzda)}</td>
          </tr>

          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
          <Row label="Průměrný hodinový výdělek" czk={ps.prumHodinovy} />
          <Row label="Průměrný denní výdělek" czk={ps.prumDenni} />

          <tr className="border-t border-gray-200"><td colSpan={4}></td></tr>
          <Row label="Celkem odprac. a neodprac." hrs={ps.celkemOdpracNeodprac} />
          <tr className={ps.saldoMesic < 0 ? 'text-red-600 font-bold' : ps.saldoMesic > 0 ? 'text-green-700 font-bold' : 'font-bold'}>
            <td className="py-0.5">Saldo</td>
            <td className="text-right">{ps.saldoMesic > 0 ? '+' : ''}{ps.saldoMesic.toFixed(1)} h</td>
            <td></td><td></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Row({ label, hrs, days, czk, bold, neg }: {
  label: string; hrs?: number; days?: number; czk?: number; bold?: boolean; neg?: boolean
}) {
  return (
    <tr className={bold ? 'font-bold' : ''}>
      <td className="py-0.5">{label}</td>
      <td className="text-right">{hrs !== undefined ? h(hrs) : ''}</td>
      <td className="text-right">{days !== undefined ? d(days) : ''}</td>
      <td className={`text-right ${neg ? 'text-red-600' : ''}`}>{czk !== undefined ? kc(czk) : ''}</td>
    </tr>
  )
}
