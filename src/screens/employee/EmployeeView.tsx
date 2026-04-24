import type { EmployeeSettings, EmployerProfile } from '../../domain/shared/types'

type Option = { value: string; label: string }

export interface EmployeeViewProps {
  employer: EmployerProfile
  employee: EmployeeSettings
  dailyFundLabel: string
  employmentTypeOptions: Option[]
  remunerationTypeOptions: Option[]
  holidayCompensationOptions: Option[]
  overtimeCompensationOptions: Option[]
  onEmployerChange: (field: 'name' | 'ico' | 'seat', value: string) => void
  onEmployeeChange: (field: keyof EmployeeSettings, value: string | number | boolean) => void
}

const inp = 'border-b border-gray-300 outline-none bg-transparent text-xs py-0 px-0.5'

export function EmployeeView({
  employer,
  employee,
  dailyFundLabel,
  employmentTypeOptions,
  remunerationTypeOptions,
  holidayCompensationOptions,
  overtimeCompensationOptions,
  onEmployerChange,
  onEmployeeChange,
}: EmployeeViewProps) {
  const employerTxt = (key: keyof EmployerProfile, label: string, w = 'w-64') => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td><input className={`${inp} ${w}`} value={employer[key]} onChange={e => onEmployerChange(key, e.target.value)} /></td>
    </tr>
  )

  const txt = (key: keyof EmployeeSettings, label: string, w = 'w-48') => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td><input className={`${inp} ${w}`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)} /></td>
    </tr>
  )

  const num = (key: keyof EmployeeSettings, label: string, step = 1, w = 'w-20') => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td><input type="number" step={step} className={`${inp} ${w}`} value={employee[key] as number} onChange={e => onEmployeeChange(key, parseFloat(e.target.value) || 0)} /></td>
    </tr>
  )

  const pct = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td>
        <input type="number" step={1} className={`${inp} w-16`} value={Math.round((employee[key] as number) * 100)} onChange={e => onEmployeeChange(key, (parseFloat(e.target.value) || 0) / 100)} />
        <span className="ml-0.5 text-gray-400">%</span>
      </td>
    </tr>
  )

  const chk = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td><input type="checkbox" checked={employee[key] as boolean} onChange={e => onEmployeeChange(key, e.target.checked)} /></td>
    </tr>
  )

  const time = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td><input type="time" className={`${inp} w-24`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)} /></td>
    </tr>
  )

  const date = (key: keyof EmployeeSettings, label: string) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td><input type="date" className={`${inp} w-36`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)} /></td>
    </tr>
  )

  const sel = (key: keyof EmployeeSettings, label: string, options: Option[]) => (
    <tr key={key}>
      <td className="whitespace-nowrap pr-2 text-gray-600">{label}</td>
      <td>
        <select className={`${inp} w-28`} value={employee[key] as string} onChange={e => onEmployeeChange(key, e.target.value)}>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </td>
    </tr>
  )

  return (
    <div className="text-xs">
      <div className="mb-1 text-sm font-bold">Firma a zaměstnanec</div>
      <div className="mb-4">
        <div className="mb-1 font-semibold">Zaměstnavatel</div>
        <table>
          <tbody>
            {employerTxt('name', 'Název zaměstnavatele')}
            {employerTxt('ico', 'IČO', 'w-32')}
            {employerTxt('seat', 'Sídlo')}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-8">
        <table>
          <tbody>
            {txt('name', 'Jméno zaměstnance')}
            {txt('employeeNumber', 'Osobní číslo', 'w-24')}
            {sel('employmentType', 'Druh pracovněprávního vztahu', employmentTypeOptions)}
            {date('employmentStartDate', 'Datum nástupu')}
            {sel('remunerationType', 'Režim odměňování', remunerationTypeOptions)}
            {num('workload', 'Úvazek', 0.1)}
            {num('weeklyHours', 'Týdenní fond hodin')}
            {num('workDaysPerWeek', 'Pracovní dny v týdnu', 1, 'w-12')}
            <tr>
              <td className="pr-2 text-gray-600">Denní fond hodin</td>
              <td className="font-bold">{dailyFundLabel}</td>
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
            {num('vacationEntitlementHours', 'Dovolená - roční nárok (h)', 1, 'w-20')}
            {num('vacationUsedHours', 'Dovolená - vyčerpáno (h)', 1, 'w-20')}
            {num('vacationRemainingHours', 'Dovolená - zůstatek (h)', 1, 'w-20')}
            {sel('holidayCompensationMode', 'Svátek - vypořádání', holidayCompensationOptions)}
            {sel('overtimeCompensationMode', 'Přesčas - vypořádání', overtimeCompensationOptions)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
