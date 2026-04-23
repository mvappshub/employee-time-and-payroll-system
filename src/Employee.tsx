import { useStore } from './store'
import type { EmployeeSettings } from './types'
import { EmploymentTypeLabels } from './types'

const inp = 'border-b border-gray-300 outline-none bg-transparent text-xs py-0 px-0.5'

export default function Employee() {
  const emp = useStore(s => s.employee)
  const set = useStore(s => s.setEmployee)
  const dailyFund = emp.workDaysPerWeek > 0 ? (emp.weeklyHours / emp.workDaysPerWeek).toFixed(2) : '0'

  const txt = (key: keyof EmployeeSettings, label: string, w = 'w-48') => (
    <tr key={key}>
      <td className="pr-2 text-gray-600 whitespace-nowrap">{label}</td>
      <td><input className={`${inp} ${w}`} value={emp[key] as string} onChange={e => set({ [key]: e.target.value })} /></td>
    </tr>
  )

  const num = (key: keyof EmployeeSettings, label: string, step = 1, w = 'w-20') => (
    <tr key={key}>
      <td className="pr-2 text-gray-600 whitespace-nowrap">{label}</td>
      <td><input type="number" step={step} className={`${inp} ${w}`} value={emp[key] as number} onChange={e => set({ [key]: parseFloat(e.target.value) || 0 })} /></td>
    </tr>
  )

  const pct = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="pr-2 text-gray-600 whitespace-nowrap">{label}</td>
      <td>
        <input type="number" step={1} className={`${inp} w-16`} value={Math.round((emp[key] as number) * 100)}
          onChange={e => set({ [key]: (parseFloat(e.target.value) || 0) / 100 })} />
        <span className="text-gray-400 ml-0.5">%</span>
      </td>
    </tr>
  )

  const chk = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="pr-2 text-gray-600 whitespace-nowrap">{label}</td>
      <td><input type="checkbox" checked={emp[key] as boolean} onChange={e => set({ [key]: e.target.checked })} /></td>
    </tr>
  )

  const time = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="pr-2 text-gray-600 whitespace-nowrap">{label}</td>
      <td><input type="time" className={`${inp} w-24`} value={emp[key] as string} onChange={e => set({ [key]: e.target.value })} /></td>
    </tr>
  )

  const sel = (key: keyof EmployeeSettings, label: string, options: Array<{ value: string; label: string }>) => (
    <tr key={key}>
      <td className="pr-2 text-gray-600 whitespace-nowrap">{label}</td>
      <td>
        <select className={`${inp} w-28`} value={emp[key] as string} onChange={e => set({ [key]: e.target.value })}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </td>
    </tr>
  )

  return (
    <div className="text-xs">
      <div className="font-bold text-sm mb-1">Zaměstnanec</div>
      <div className="flex gap-8 flex-wrap">
        <table>
          <tbody>
            {txt('name', 'Jméno zaměstnance')}
            {sel('employmentType', 'Druh pracovněprávního vztahu', [
              { value: 'pracovni_pomer', label: EmploymentTypeLabels.pracovni_pomer },
              { value: 'dpc', label: EmploymentTypeLabels.dpc },
              { value: 'dpp', label: EmploymentTypeLabels.dpp },
            ])}
            {sel('remunerationType', 'Režim odměňování', [
              { value: 'mzda', label: 'mzda' },
              { value: 'plat', label: 'plat' },
            ])}
            {num('workload', 'Úvazek', 0.1)}
            {num('weeklyHours', 'Týdenní fond hodin')}
            {num('workDaysPerWeek', 'Pracovní dny v týdnu', 1, 'w-12')}
            <tr>
              <td className="pr-2 text-gray-600">Denní fond hodin</td>
              <td className="font-bold">{dailyFund} h</td>
            </tr>
            {chk('weekendWorking', 'Víkend je běžně pracovní')}
          </tbody>
        </table>
        <table>
          <tbody>
            {time('shiftStart', 'Standardní začátek směny')}
            {time('shiftEnd', 'Standardní konec směny')}
            {num('standardBreak', 'Standardní přestávka (h)', 0.25, 'w-12')}
            {chk('nightWorkAllowed', 'Noční práce povolena')}
            {time('nightFrom', 'Noční pásmo od')}
            {time('nightTo', 'Noční pásmo do')}
            {chk('overtimeAllowed', 'Přesčas povolen')}
          </tbody>
        </table>
        <table>
          <tbody>
            {num('baseSalary', 'Základní hrubá mzda (Kč)', 100, 'w-24')}
            {pct('personalBonus', 'Osobní ohodnocení')}
            {pct('nightSurcharge', 'Příplatek noční')}
            {pct('weekendSurcharge', 'Příplatek víkend')}
            {pct('holidaySurcharge', 'Příplatek svátek')}
            {pct('overtimeSurcharge', 'Příplatek přesčas')}
            {pct('sickCompensation', 'Náhrada nemoc')}
            {sel('holidayCompensationMode', 'Svátek - vypořádání', [
              { value: 'time-off', label: 'náhr. volno' },
              { value: 'premium', label: 'příplatek' },
            ])}
            {sel('overtimeCompensationMode', 'Přesčas - vypořádání', [
              { value: 'premium', label: 'příplatek' },
              { value: 'time-off', label: 'náhr. volno' },
            ])}
          </tbody>
        </table>
      </div>
    </div>
  )
}
